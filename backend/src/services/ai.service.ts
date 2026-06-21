import { Offer } from "../models/Offer.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { createDraftPackage } from "./package.service.js";
import type { PackageDTO } from "../../contracts/api.js";
import { env } from "../config/env.js";
import { ApiError } from "../http/ApiError.js";

type CatalogOffer = {
  _id: unknown;
  title: string;
  price: number;
  category: string;
  providerId: unknown;
};

const FALLBACK_BUNDLES: Record<string, { offerIndices: number[]; reason: string }> = {
  relax: {
    offerIndices: [4, 3],
    reason: "A quiet reset, comfortably under budget."
  },
  weekend: {
    offerIndices: [6, 2],
    reason: "A coastal escape with a proper lunch — two providers, one tap."
  },
  learning: {
    offerIndices: [8, 9],
    reason: "A learning push that fits a starter budget."
  },
  default: {
    offerIndices: [2, 12],
    reason: "Hand-picked perks that match what you asked for."
  }
};

const SYSTEM_PROMPT = `You are Bora, the Perx benefits concierge for employees in Albania.
Return ONLY valid JSON with this exact shape:
{"offerIds":["<mongodb id strings from catalog>"],"reason":"<one editorial sentence>"}
Rules:
- Pick offer IDs that exist in the catalog only. Never invent IDs.
- Never compute totals or prices in your response — only pick IDs.
- Prefer 1-3 complementary offers from different providers when budget allows.
- Match the employee goal (relax, food, wellness, travel, learning, etc.).`;

async function loadCatalogForEmployee(employeeId: string, companyId: string, budget?: number) {
  const policy = await EmployerPolicy.findOne({ companyId }).lean();
  const allowance = await EmployeeAllowance.findOne({ userId: employeeId, companyId }).lean();
  if (!policy || !allowance) {
    throw new ApiError(400, "ALLOWANCE_NOT_FOUND", "Could not load your allowance for bundling");
  }

  const available = allowance.total - allowance.used - allowance.held;
  const maxBudget = budget ?? available;

  const offers = await Offer.find({
    isActive: true,
    category: { $in: policy.allowedCategories },
    currency: policy.currency,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  })
    .sort({ price: 1 })
    .lean();

  return { offers: offers as CatalogOffer[], maxBudget, policy, available };
}

function fallbackKey(goal: string) {
  const g = goal.toLowerCase();
  if (g.includes("relax") || g.includes("spa") || g.includes("calm")) return "relax";
  if (g.includes("weekend") || g.includes("travel") || g.includes("coast")) return "weekend";
  if (g.includes("learn") || g.includes("course") || g.includes("italian")) return "learning";
  return "default";
}

function pickFallbackOffers(offers: CatalogOffer[], maxBudget: number, goal: string) {
  const template = FALLBACK_BUNDLES[fallbackKey(goal)];
  const picked = template.offerIndices.map((index) => offers[index]).filter(Boolean);

  let total = picked.reduce((sum, offer) => sum + offer.price, 0);
  if (total > maxBudget && picked.length > 1) {
    return [picked[0]];
  }
  if (total > maxBudget) {
    const single = offers.find((o) => o.price <= maxBudget);
    return single ? [single] : [];
  }
  return picked;
}

function extractJson(text: string): { offerIds?: string[]; reason?: string } | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as { offerIds?: string[]; reason?: string };
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as { offerIds?: string[]; reason?: string };
    } catch {
      return null;
    }
  }
}

function trimToBudget(
  offerIds: string[],
  offers: CatalogOffer[],
  maxBudget: number
): string[] {
  let ids = [...offerIds];
  while (ids.length > 0) {
    const total = ids.reduce((sum, id) => {
      const offer = offers.find((o) => String(o._id) === id);
      return sum + (offer?.price ?? 0);
    }, 0);
    if (total <= maxBudget) return ids;
    ids.pop();
  }
  return [];
}

function totalForIds(offerIds: string[], offers: CatalogOffer[]) {
  return offerIds.reduce((sum, id) => {
    const offer = offers.find((o) => String(o._id) === id);
    return sum + (offer?.price ?? 0);
  }, 0);
}

async function callGroq(
  goal: string,
  offers: CatalogOffer[],
  maxBudget: number
): Promise<{ offerIds: string[]; reason: string } | null> {
  if (!env.GROQ_API_KEY) return null;

  const catalog = offers.slice(0, 50).map((o) => ({
    id: String(o._id),
    title: o.title,
    price: o.price,
    category: o.category
  }));

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Employee goal: ${goal}\nMax budget: ${maxBudget} ALL\nCatalog:\n${JSON.stringify(catalog)}`
        }
      ]
    })
  });

  if (!response.ok) {
    console.warn("[ai] Groq request failed:", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(text);
  if (!parsed?.offerIds?.length) return null;

  const validIds = parsed.offerIds.filter((id) => offers.some((o) => String(o._id) === id));
  if (validIds.length === 0) return null;

  const trimmed = trimToBudget(validIds, offers, maxBudget);
  if (trimmed.length === 0) return null;

  return {
    offerIds: trimmed,
    reason: parsed.reason?.trim() || "Composed for you."
  };
}

export async function composeAiPackage(
  employeeId: string,
  companyId: string,
  goal: string,
  budget?: number,
  forceFallback = false
): Promise<{ packageDraft: PackageDTO; reason: string; fallbackUsed: boolean }> {
  const { offers, maxBudget, available } = await loadCatalogForEmployee(employeeId, companyId, budget);

  if (maxBudget <= 0) {
    throw new ApiError(400, "INSUFFICIENT_ALLOWANCE", "No budget available for a new bundle");
  }

  if (offers.length === 0) {
    throw new ApiError(400, "NO_OFFERS", "No offers available for bundling");
  }

  let offerIds: string[] = [];
  let reason = "";
  let fallbackUsed = true;

  if (!forceFallback) {
    try {
      const ai = await callGroq(goal, offers, maxBudget);
      if (ai && ai.offerIds.length > 0 && totalForIds(ai.offerIds, offers) <= maxBudget) {
        offerIds = ai.offerIds;
        reason = ai.reason;
        fallbackUsed = false;
      }
    } catch (err) {
      console.warn("[ai] Groq error, using fallback:", err);
    }
  }

  if (offerIds.length === 0) {
    const picked = pickFallbackOffers(offers, maxBudget, goal);
    if (picked.length === 0) {
      throw new ApiError(400, "NO_MATCHING_OFFERS", "Nothing fits that budget right now — try a higher amount or a simpler goal.");
    }
    offerIds = picked.map((o) => String(o._id));
    reason = FALLBACK_BUNDLES[fallbackKey(goal)].reason;
    fallbackUsed = true;
  }

  const packageDraft = await createDraftPackage(
    employeeId,
    companyId,
    offerIds,
    "ai",
    reason
  );

  return { packageDraft, reason, fallbackUsed };
}
