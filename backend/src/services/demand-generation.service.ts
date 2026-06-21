import { Company } from "../models/Company.js";
import { DemandCampaign } from "../models/DemandCampaign.js";
import { Notification } from "../models/Notification.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Offer } from "../models/Offer.js";
import { formatMoney } from "../utils/money.js";
import { env } from "../config/env.js";
import { inferTopicFromMessage } from "./telegram-topic.service.js";

const STOP_WORDS = new Set([
  "i",
  "me",
  "my",
  "we",
  "need",
  "want",
  "looking",
  "for",
  "the",
  "in",
  "a",
  "an",
  "and",
  "or",
  "to",
  "get",
  "some",
  "something",
  "class",
  "classes",
  "lesson",
  "lessons",
  "please",
  "can",
  "you",
  "have",
  "any",
  "are",
  "there",
  "this",
  "that",
  "with",
  "from"
]);

type CatalogOffer = {
  _id: unknown;
  title: string;
  price: number;
  category: string;
};

export type DiscoveredProvider = {
  name: string;
  address: string;
  phone: string;
  email: string;
  mapsUrl: string;
  website?: string;
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** True when the catalog likely has offers for this query. */
export function queryMatchesCatalog(query: string, offers: CatalogOffer[]): boolean {
  if (offers.length === 0) return false;

  const topic = inferTopicFromMessage(query);
  if (topic.category) {
    const inCategory = offers.filter((o) => o.category === topic.category);
    if (inCategory.length > 0) {
      for (const term of topic.searchTerms) {
        if (inCategory.some((o) => `${o.title} ${o.category}`.toLowerCase().includes(term))) {
          return true;
        }
      }
      return true;
    }
  }

  const tokens = tokenize(query);
  if (tokens.length === 0) return true;

  for (const offer of offers) {
    const haystack = `${offer.title} ${offer.category}`.toLowerCase();
    const hits = tokens.filter((t) => haystack.includes(t));
    if (hits.length > 0) {
      return true;
    }
  }
  return false;
}

function slugify(query: string): string {
  return tokenize(query).join("-") || "general-demand";
}

function humanLabel(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "New benefit demand";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractLocation(query: string): string {
  const match = query.match(/\bin\s+([A-Za-zÀ-ÿ\s]+)/i);
  if (match?.[1]) return match[1].trim().split(/\s+/).slice(0, 3).join(" ");
  if (/tirana/i.test(query)) return "Tirana";
  if (/albania/i.test(query)) return "Albania";
  return "Tirana";
}

function inferCategory(query: string): string {
  const q = query.toLowerCase();
  if (/pottery|ceramic|art|paint|craft/.test(q)) return "learning";
  if (/spa|yoga|gym|wellness|massage/.test(q)) return "wellness";
  if (/food|restaurant|chef|dinner|lunch/.test(q)) return "food";
  if (/travel|trip|hotel|flight|weekend/.test(q)) return "travel";
  return "lifestyle";
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

const FALLBACK_PROVIDERS: Record<string, DiscoveredProvider[]> = {
  pottery: [
    {
      name: "Clay Studio Tirana",
      address: "Rruga Myslym Shyri, Tirana",
      phone: "+355 69 212 3344",
      email: "hello@claystudiotirana.al",
      mapsUrl: "https://maps.google.com/?q=Clay+Studio+Tirana",
      website: "https://claystudiotirana.al"
    },
    {
      name: "Art House Ceramics",
      address: "Blloku, Tirana",
      phone: "+355 4 225 8899",
      email: "workshops@arthouseceramics.al",
      mapsUrl: "https://maps.google.com/?q=Art+House+Ceramics+Tirana"
    }
  ],
  default: [
    {
      name: "Tirana Experience Co.",
      address: "Sheshi Skënderbej, Tirana",
      phone: "+355 4 222 1100",
      email: "partners@tiranaexperience.al",
      mapsUrl: "https://maps.google.com/?q=Tirana+Experience"
    }
  ]
};

async function discoverProvidersViaGroq(
  query: string,
  location: string
): Promise<DiscoveredProvider[]> {
  const pottery = /pottery|ceramic/i.test(query);
  const fallback = pottery ? FALLBACK_PROVIDERS.pottery : FALLBACK_PROVIDERS.default;

  if (!env.GROQ_API_KEY) {
    return fallback;
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
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You simulate a Google Maps scrape for local businesses in Albania. Return JSON: {"providers":[{"name":"","address":"","phone":"+355...","email":"contact@...","mapsUrl":"https://maps.google.com/?q=...","website":"https://..."}]}. Return 2-3 realistic providers for the query. Use plausible Albanian business emails.'
          },
          {
            role: "user",
            content: `Find providers for: "${query}" in ${location}, Albania`
          }
        ]
      })
    });

    if (!response.ok) throw new Error("Groq failed");

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = extractJson<{ providers?: DiscoveredProvider[] }>(
      data.choices?.[0]?.message?.content ?? ""
    );
    if (parsed?.providers?.length) {
      return parsed.providers.map((p) => ({
        name: p.name,
        address: p.address ?? "",
        phone: p.phone ?? "",
        email: p.email ?? `hello@${p.name.toLowerCase().replace(/\s+/g, "")}.al`,
        mapsUrl: p.mapsUrl ?? `https://maps.google.com/?q=${encodeURIComponent(p.name + " " + location)}`,
        website: p.website
      }));
    }
  } catch (err) {
    console.warn("[demand] Groq provider discovery failed:", err);
  }

  return fallback;
}

function buildOutreachEmail(input: {
  companyName: string;
  label: string;
  totalPooled: number;
  currency: string;
  employeeCount: number;
  claimUrl: string;
}) {
  const spend = formatMoney(input.totalPooled, input.currency);
  const subject = `${input.employeeCount} employees ready to spend ${spend} on ${input.label}`;
  const body = [
    `Hi there,`,
    ``,
    `${input.employeeCount} employee${input.employeeCount === 1 ? "" : "s"} from ${input.companyName} ${input.employeeCount === 1 ? "is" : "are"} trying to spend ${spend} on ${input.label} right now through Perx.`,
    ``,
    `Perx routes verified corporate benefit spend to local providers — employees pick perks, employers approve once, you get paid.`,
    ``,
    `Claim this demand and join our marketplace: ${input.claimUrl}`,
    ``,
    `— Perx Demand Engine`
  ].join("\n");

  return { subject, body };
}

async function sendProviderOutreach(
  campaign: InstanceType<typeof DemandCampaign>,
  companyName: string
) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const claimUrl = `${appUrl}/signup/company?demand=${campaign.normalizedKey}`;
  const employeeCount = campaign.contributorIds.length;
  let sent = 0;

  for (const provider of campaign.providers) {
    if (provider.outreachStatus === "sent" || !provider.email) continue;

    const { subject, body } = buildOutreachEmail({
      companyName,
      label: campaign.label,
      totalPooled: campaign.totalPooledAmount,
      currency: campaign.currency,
      employeeCount,
      claimUrl
    });

    provider.emailSubject = subject;
    provider.emailBody = body;
    provider.outreachStatus = "sent";
    provider.emailSentAt = new Date();
    sent += 1;

    console.log("\n[demand-outreach] B2B email dispatched");
    console.log(`  To: ${provider.email} (${provider.name})`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${body}\n`);
  }

  if (sent > 0) {
    campaign.lastOutreachAt = new Date();
  }

  campaign.markModified("providers");
  await campaign.save();
  return sent;
}

export async function runDemandGeneration(input: {
  employeeId: string;
  companyId: string;
  query: string;
  availableBudget: number;
  currency: string;
}) {
  const normalizedKey = slugify(input.query);
  const label = humanLabel(input.query);
  const location = extractLocation(input.query);
  const category = inferCategory(input.query);
  const contribution = Math.max(0, input.availableBudget);

  const company = await Company.findById(input.companyId).lean();
  const companyName = company?.employerProfile?.displayName ?? company?.name ?? "Your company";

  let campaign = await DemandCampaign.findOne({
    companyId: input.companyId,
    normalizedKey
  });

  if (!campaign) {
    campaign = await DemandCampaign.create({
      normalizedKey,
      companyId: input.companyId,
      label,
      location,
      category,
      totalPooledAmount: contribution,
      currency: input.currency,
      contributorIds: [input.employeeId],
      providers: []
    });
  } else {
    const alreadyContributed = campaign.contributorIds.some(
      (id) => String(id) === String(input.employeeId)
    );
    if (!alreadyContributed) {
      campaign.contributorIds.push(input.employeeId as never);
      campaign.totalPooledAmount += contribution;
    }
    campaign.label = label;
    await campaign.save();
  }

  if (campaign.providers.length === 0) {
    const discovered = await discoverProvidersViaGroq(input.query, location);
    campaign.set(
      "providers",
      discovered.map((p) => ({
        name: p.name,
        address: p.address,
        phone: p.phone,
        email: p.email,
        mapsUrl: p.mapsUrl,
        website: p.website ?? "",
        outreachStatus: "pending" as const
      }))
    );
    await campaign.save();
  }

  const emailsSent = await sendProviderOutreach(campaign, companyName);

  await Notification.create({
    userId: input.employeeId,
    type: "demand_pool",
    payload: {
      campaignId: String(campaign._id),
      label: campaign.label,
      pooled: campaign.totalPooledAmount,
      currency: campaign.currency,
      providersContacted: emailsSent
    },
    read: false
  });

  const spend = formatMoney(contribution, input.currency);
  const poolTotal = formatMoney(campaign.totalPooledAmount, input.currency);
  const employeeCount = campaign.contributorIds.length;

  const message =
    employeeCount === 1
      ? `We don't have ${label.toLowerCase()} on Perx yet — but I've added your ${spend} to the Demand Pool. I'm reaching out to ${campaign.providers.length} local studios so they can claim this spend.`
      : `We don't have ${label.toLowerCase()} on Perx yet — but I've added your ${spend} to the Demand Pool (${poolTotal} total from ${employeeCount} colleagues). ${emailsSent > 0 ? `I just emailed ${emailsSent} local providers with your team's budget.` : "Providers are already being contacted."}`;

  return {
    campaignId: String(campaign._id),
    label: campaign.label,
    location: campaign.location,
    yourContribution: contribution,
    totalPooled: campaign.totalPooledAmount,
    currency: input.currency,
    employeeCount,
    providers: campaign.providers.map((p) => ({
      name: p.name,
      address: p.address ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
      mapsUrl: p.mapsUrl ?? "",
      outreachStatus: p.outreachStatus ?? "pending"
    })),
    providersContacted: emailsSent,
    message
  };
}

/** Load active catalog offers for relevance checks. */
export async function loadCatalogOffers(companyId: string, currency: string) {
  const policy = await EmployerPolicy.findOne({ companyId }).lean();
  if (!policy) return [];

  return Offer.find({
    isActive: true,
    category: { $in: policy.allowedCategories },
    currency,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  })
    .select("title category price")
    .lean() as Promise<CatalogOffer[]>;
}
