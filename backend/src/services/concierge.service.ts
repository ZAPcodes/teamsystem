import { Offer } from "../models/Offer.js";
import { User } from "../models/User.js";
import { BenefitRequest } from "../models/BenefitRequest.js";
import { Notification } from "../models/Notification.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { composeAiPackage } from "./ai.service.js";
import { createDraftPackage } from "./package.service.js";
import {
  loadCatalogOffers,
  queryMatchesCatalog,
  runDemandGeneration
} from "./demand-generation.service.js";
import { formatMoney } from "../utils/money.js";
import { env } from "../config/env.js";
import type { PackageDTO } from "../../contracts/api.js";
import { ApiError } from "../http/ApiError.js";

type CatalogOffer = {
  _id: unknown;
  title: string;
  price: number;
  category: string;
};

const OFF_CATALOG_TRIGGERS = [
  "not on perx",
  "not in the catalog",
  "don't see",
  "do not see",
  "you don't have",
  "not available",
  "private chef",
  "helicopter",
  "custom benefit",
  "add new benefit",
  "new provider",
  "something else",
  "off catalog",
  "outside perx",
  "don't have",
  "do not have",
  "not on the platform",
  "isn't on perx",
  "is not on perx"
];

const FALLBACK_OFF_CATALOG: Record<string, Array<{ name: string; description: string; link?: string; phone?: string; category: string }>> = {
  default: [
    {
      name: "Tirana Wellness Collective",
      description: "Corporate wellness memberships and on-site yoga for teams.",
      link: "https://example.com/tirana-wellness",
      phone: "+355 4 222 3344",
      category: "wellness"
    },
    {
      name: "Albania Adventure Guides",
      description: "Curated day trips and team offsites across the coast and mountains.",
      link: "https://example.com/albania-adventure",
      phone: "+355 69 123 4567",
      category: "travel"
    }
  ],
  food: [
    {
      name: "Farm-to-Table Tirana",
      description: "Seasonal team lunch programs with local farms.",
      link: "https://example.com/farm-table-tirana",
      phone: "+355 4 445 6677",
      category: "food"
    }
  ],
  learning: [
    {
      name: "Tirana Language Studio",
      description: "Group Italian and English classes for employees.",
      link: "https://example.com/tirana-language",
      phone: "+355 4 556 7788",
      category: "learning"
    }
  ]
};

async function loadEmployeeContext(employeeId: string, companyId: string) {
  const [user, policy, allowance] = await Promise.all([
    User.findById(employeeId).lean(),
    EmployerPolicy.findOne({ companyId }).lean(),
    EmployeeAllowance.findOne({ userId: employeeId, companyId }).lean()
  ]);

  if (!user || !policy || !allowance) {
    throw new ApiError(400, "EMPLOYEE_CONTEXT_MISSING", "Could not load employee profile for concierge");
  }

  const available = allowance.total - allowance.used - allowance.held;
  const offers = await Offer.find({
    isActive: true,
    category: { $in: policy.allowedCategories },
    currency: policy.currency,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  })
    .sort({ price: 1 })
    .lean();

  return { user, policy, allowance, available, offers: offers as CatalogOffer[] };
}

function preferenceGoals(preferences: string[]): Array<{ label: "A" | "B" | "C"; goal: string; title: string }> {
  const primary = preferences[0] ?? "wellness";
  const secondary = preferences[1] ?? "food";
  return [
    {
      label: "A",
      goal: `A ${primary}-focused perk bundle that feels personal`,
      title: `${primary.charAt(0).toUpperCase()}${primary.slice(1)} focus`
    },
    {
      label: "B",
      goal: `A balanced ${primary} and ${secondary} package for this month`,
      title: `${primary} + ${secondary} mix`
    },
    {
      label: "C",
      goal: "A discovery bundle with the best value picks right now",
      title: "Best value discovery"
    }
  ];
}

export async function getConciergeGreeting(employeeId: string, companyId: string) {
  const { user, policy, available, offers } = await loadEmployeeContext(employeeId, companyId);
  const currency = policy.currency;

  const packageGoals = preferenceGoals(user.preferences ?? []);
  const suggestions: Array<{
    label: "A" | "B" | "C";
    title: string;
    summary: string;
    total: number;
    packageDraft: PackageDTO;
  }> = [];

  for (const pkg of packageGoals) {
    try {
      const result = await composeAiPackage(employeeId, companyId, pkg.goal, available);
      suggestions.push({
        label: pkg.label,
        title: `Package ${pkg.label} — ${pkg.title}`,
        summary: result.reason,
        total: result.packageDraft.totalSnapshot,
        packageDraft: result.packageDraft
      });
    } catch {
      // skip packages that don't fit budget
    }
  }

  if (suggestions.length === 0 && offers.length > 0) {
    const cheap = offers.filter((o) => o.price <= available).slice(0, 2);
    if (cheap.length > 0) {
      const draft = await createDraftPackage(
        employeeId,
        companyId,
        cheap.map((o) => String(o._id)),
        "ai",
        "Starter picks within your budget."
      );
      suggestions.push({
        label: "A",
        title: "Package A — Starter picks",
        summary: "Hand-picked perks that fit your remaining budget.",
        total: draft.totalSnapshot,
        packageDraft: draft
      });
    }
  }

  const labels = suggestions.map((s) => s.label).join(", ");
  const openingMessage = `With this budget of ${formatMoney(available, currency)} you can do benefit packages ${labels || "A, B, C"}. Pick one below or tell me what you're craving — I'll bundle it or source new options for your employer.`;

  return {
    openingMessage,
    currency,
    available,
    preferences: user.preferences ?? [],
    suggestions
  };
}

function looksOffCatalog(message: string): boolean {
  const lower = message.toLowerCase();
  return OFF_CATALOG_TRIGGERS.some((trigger) => lower.includes(trigger));
}

function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function researchOffCatalogBenefits(
  message: string,
  preferences: string[],
  locale: string
): Promise<{ items: Array<{ name: string; description: string; link?: string; phone?: string; category: string }>; reply: string }> {
  const category = preferences[0] ?? "wellness";
  const fallback = FALLBACK_OFF_CATALOG[category] ?? FALLBACK_OFF_CATALOG.default;

  if (!env.GROQ_API_KEY) {
    return {
      items: fallback,
      reply: "I couldn't find that in Perx yet, so I compiled local options and sent them to your employer for approval — you don't need to do anything else."
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You help Albanian employees find benefits not yet on Perx. Return JSON: {\"items\":[{\"name\":\"\",\"description\":\"\",\"link\":\"https://...\",\"phone\":\"+355...\",\"category\":\"\"}],\"reply\":\"one friendly sentence\"}. Suggest 2-3 plausible Tirana-area options. Use realistic phone formats."
          },
          {
            role: "user",
            content: `Locale: ${locale}\nPreferences: ${preferences.join(", ")}\nRequest: ${message}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error("Groq failed");
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = extractJson<{ items?: typeof fallback; reply?: string }>(
      data.choices?.[0]?.message?.content ?? ""
    );

    if (parsed?.items?.length) {
      return {
        items: parsed.items,
        reply:
          parsed.reply ??
          "I couldn't find that in Perx yet, so I compiled options and forwarded them to your employer for approval."
      };
    }
  } catch (err) {
    console.warn("[concierge] off-catalog Groq error:", err);
  }

  return {
    items: fallback,
    reply: "I couldn't find that in Perx yet, so I compiled local options and sent them to your employer for approval — you don't need to do anything else."
  };
}

async function forwardBenefitRequest(input: {
  employeeId: string;
  companyId: string;
  message: string;
  items: Array<{ name: string; description: string; link?: string; phone?: string; category: string }>;
}) {
  const request = await BenefitRequest.create({
    employeeId: input.employeeId,
    companyId: input.companyId,
    originalMessage: input.message,
    items: input.items,
    status: "pending"
  });

  const admins = await User.find({ companyId: input.companyId, roles: "employer_admin" }).select("_id");
  await Notification.insertMany(
    admins.map((admin) => ({
      userId: admin._id,
      type: "benefit_request",
      payload: {
        requestId: String(request._id),
        itemCount: input.items.length,
        preview: input.items[0]?.name
      },
      read: false
    }))
  );

  await Notification.create({
    userId: input.employeeId,
    type: "benefit_request",
    payload: {
      requestId: String(request._id),
      status: "pending",
      message: "Forwarded to your employer for approval"
    },
    read: false
  });

  return request;
}

async function shouldUseDemandGeneration(
  message: string,
  companyId: string,
  currency: string,
  offers: CatalogOffer[]
) {
  if (looksOffCatalog(message)) return true;
  const catalog = offers.length ? offers : await loadCatalogOffers(companyId, currency);
  return !queryMatchesCatalog(message, catalog);
}

export async function processConciergeMessage(
  employeeId: string,
  companyId: string,
  message: string,
  budget?: number
) {
  const { user, available, policy, offers } = await loadEmployeeContext(employeeId, companyId);
  const maxBudget = budget ?? available;
  const currency = policy.currency;

  if (await shouldUseDemandGeneration(message, companyId, currency, offers)) {
    const demand = await runDemandGeneration({
      employeeId,
      companyId,
      query: message,
      availableBudget: maxBudget,
      currency
    });

    return {
      kind: "demand_generation" as const,
      message: demand.message,
      demandPool: {
        campaignId: demand.campaignId,
        label: demand.label,
        location: demand.location,
        yourContribution: demand.yourContribution,
        totalPooled: demand.totalPooled,
        currency: demand.currency,
        employeeCount: demand.employeeCount,
        providersContacted: demand.providersContacted,
        providers: demand.providers
      }
    };
  }

  try {
    const result = await composeAiPackage(employeeId, companyId, message, maxBudget);
    return {
      kind: "bundle" as const,
      message: result.reason + (result.fallbackUsed ? " (curated pick)" : ""),
      packageDraft: result.packageDraft,
      reason: result.reason,
      fallbackUsed: result.fallbackUsed
    };
  } catch (err) {
    if (err instanceof ApiError && (err.code === "NO_MATCHING_OFFERS" || err.code === "NO_OFFERS")) {
      const demand = await runDemandGeneration({
        employeeId,
        companyId,
        query: message,
        availableBudget: maxBudget,
        currency
      });
      return {
        kind: "demand_generation" as const,
        message: demand.message,
        demandPool: {
          campaignId: demand.campaignId,
          label: demand.label,
          location: demand.location,
          yourContribution: demand.yourContribution,
          totalPooled: demand.totalPooled,
          currency: demand.currency,
          employeeCount: demand.employeeCount,
          providersContacted: demand.providersContacted,
          providers: demand.providers
        }
      };
    }
    throw err;
  }
}
