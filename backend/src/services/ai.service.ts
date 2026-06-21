import { Offer } from "../models/Offer.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { createDraftPackage } from "./package.service.js";
import type { PackageDTO } from "../../contracts/api.js";
import { env } from "../config/env.js";
import { ApiError } from "../http/ApiError.js";
import { inferTopicFromMessage } from "./telegram-topic.service.js";

type CatalogOffer = {
  _id: unknown;
  title: string;
  description?: string;
  price: number;
  category: string;
  providerId: unknown;
};

const SYSTEM_PROMPT = `You are Bora, the Perx benefits concierge for employees in Albania.
Return ONLY valid JSON with this exact shape:
{"offerIds":["<mongodb id strings from catalog>"],"reason":"<one editorial sentence>"}
Rules:
- Pick offer IDs that exist in the catalog only. Never invent IDs.
- Never compute totals or prices in your response — only pick IDs.
- Match the employee's exact request (movies → cinema, lunch → food, spa → wellness, etc.).
- Prefer 1-3 complementary offers from different providers when budget allows.
- If the request mentions a specific venue or perk name, prioritize offers whose title matches.`;

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

function offerHaystack(offer: CatalogOffer) {
  return `${offer.title} ${offer.description ?? ""} ${offer.category}`.toLowerCase();
}

export function scoreOfferForGoal(offer: CatalogOffer, goal: string): number {
  const topic = inferTopicFromMessage(goal);
  const haystack = offerHaystack(offer);
  let score = 0;

  if (topic.category && offer.category === topic.category) {
    score += 25;
  }

  for (const term of topic.searchTerms) {
    if (haystack.includes(term.toLowerCase())) {
      score += 18;
    }
  }

  const tokens = goal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "this", "that", "week", "need", "want"].includes(w));

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 10;
    }
  }

  return score;
}

function pickComplementaryOffers(
  scored: Array<{ offer: CatalogOffer; score: number }>,
  maxBudget: number,
  maxItems = 3
): CatalogOffer[] {
  const picked: CatalogOffer[] = [];
  const usedProviders = new Set<string>();
  let total = 0;

  for (const { offer, score } of scored) {
    if (score <= 0) continue;
    const providerKey = String(offer.providerId);
    if (usedProviders.has(providerKey) && picked.length > 0) continue;
    if (total + offer.price > maxBudget) continue;
    picked.push(offer);
    usedProviders.add(providerKey);
    total += offer.price;
    if (picked.length >= maxItems) break;
  }

  return picked;
}

function pickFallbackOffers(offers: CatalogOffer[], maxBudget: number, goal: string): CatalogOffer[] {
  const affordable = offers.filter((o) => o.price <= maxBudget);
  if (affordable.length === 0) return [];

  const scored = affordable
    .map((offer) => ({ offer, score: scoreOfferForGoal(offer, goal) }))
    .sort((a, b) => b.score - a.score || a.offer.price - b.offer.price);

  const bestScore = scored[0]?.score ?? 0;
  if (bestScore > 0) {
    const bundle = pickComplementaryOffers(scored, maxBudget);
    if (bundle.length > 0) return bundle;
    return [scored[0].offer];
  }

  return [affordable[0]];
}

function fallbackReason(goal: string, offers: CatalogOffer[]): string {
  const topic = inferTopicFromMessage(goal);
  if (topic.label) {
    const names = offers.map((o) => o.title).join(" + ");
    return `Matched your ${topic.label} request with ${names}.`;
  }
  return `Hand-picked perks that match what you asked for.`;
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

function trimToBudget(offerIds: string[], offers: CatalogOffer[], maxBudget: number): string[] {
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

function aiPicksAreRelevant(offerIds: string[], offers: CatalogOffer[], goal: string): boolean {
  const picked = offerIds
    .map((id) => offers.find((o) => String(o._id) === id))
    .filter(Boolean) as CatalogOffer[];
  if (picked.length === 0) return false;

  const maxScore = Math.max(...picked.map((o) => scoreOfferForGoal(o, goal)));
  return maxScore >= 10;
}

async function callGroq(
  goal: string,
  offers: CatalogOffer[],
  maxBudget: number
): Promise<{ offerIds: string[]; reason: string } | null> {
  if (!env.GROQ_API_KEY) return null;

  const topic = inferTopicFromMessage(goal);
  const catalog = offers.slice(0, 60).map((o) => ({
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
      temperature: 0.2,
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Employee goal: ${goal}
Inferred category: ${topic.category ?? "unknown"}
Search hints: ${topic.searchTerms.join(", ") || "none"}
Max budget: ${maxBudget} ALL
Catalog:
${JSON.stringify(catalog)}`
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

  if (!aiPicksAreRelevant(trimmed, offers, goal)) {
    console.warn("[ai] Groq picks low relevance for goal, using semantic fallback");
    return null;
  }

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
  const { offers, maxBudget } = await loadCatalogForEmployee(employeeId, companyId, budget);

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
      console.warn("[ai] Groq error, using semantic fallback:", err);
    }
  }

  if (offerIds.length === 0) {
    const picked = pickFallbackOffers(offers, maxBudget, goal);
    if (picked.length === 0) {
      throw new ApiError(
        400,
        "NO_MATCHING_OFFERS",
        "Nothing fits that budget right now — try a higher amount or a simpler goal."
      );
    }
    offerIds = picked.map((o) => String(o._id));
    reason = fallbackReason(goal, picked);
    fallbackUsed = true;
  }

  const packageDraft = await createDraftPackage(employeeId, companyId, offerIds, "ai", reason);

  return { packageDraft, reason, fallbackUsed };
}
