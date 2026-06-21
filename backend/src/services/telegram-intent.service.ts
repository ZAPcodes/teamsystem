import { env } from "../config/env.js";
import type { PerkCategory } from "./telegram-topic.service.js";
import {
  extractOfferQuery,
  inferTopicFromMessage,
  isAffirmativeReply,
  isPerkPurchaseRequest,
  isRecommendationRequest
} from "./telegram-topic.service.js";

export type TelegramIntent =
  | { intent: "balance" }
  | { intent: "purchase"; query: string; amount?: number; venue?: string; category: PerkCategory | null }
  | { intent: "recommendation"; category: PerkCategory | null; searchTerms: string[]; label: string | null }
  | { intent: "help" }
  | { intent: "unknown"; message?: string };

function extractAmount(text: string) {
  const match = text.match(/(\d[\d,]*)\s*all\b/i);
  if (!match) return null;
  return Number(match[1].replace(/,/g, ""));
}

function extractVenue(text: string) {
  const atMatch = text.match(/\bat\s+([A-Za-z0-9'&\-\s]+?)(?:,|\.|$|\s+grab|\s+get|\s+for)/i);
  if (atMatch) return atMatch[1].trim();
  if (/artigiano/i.test(text)) return "Artigiano";
  if (/pazari/i.test(text)) return "Pazari i Ri";
  return undefined;
}

function purchaseIntent(text: string): TelegramIntent {
  const topic = inferTopicFromMessage(text);
  return {
    intent: "purchase",
    query: extractOfferQuery(text),
    amount: extractAmount(text) ?? undefined,
    venue: extractVenue(text),
    category: topic.category
  };
}

function recommendationIntent(text: string): TelegramIntent {
  const topic = inferTopicFromMessage(text);
  return {
    intent: "recommendation",
    category: topic.category,
    searchTerms: topic.searchTerms,
    label: topic.label
  };
}

function fallbackIntent(text: string): TelegramIntent {
  const lower = text.toLowerCase().trim();

  if (/^\/start/.test(lower) || /^\/help/.test(lower)) {
    return { intent: "help" };
  }

  if (/balance|how much|wallet|remaining|left in/i.test(lower)) {
    return { intent: "balance" };
  }

  if (isPerkPurchaseRequest(text)) {
    return purchaseIntent(text);
  }

  if (isRecommendationRequest(text) || isAffirmativeReply(text)) {
    return recommendationIntent(text);
  }

  return { intent: "unknown" };
}

function extractJson<T>(text: string): T | null {
  try {
    return JSON.parse(text.trim()) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

const VALID_CATEGORIES = new Set<PerkCategory>(["food", "wellness", "lifestyle", "travel", "learning"]);

function normalizeCategory(value: string | null | undefined): PerkCategory | null {
  if (!value) return null;
  const key = value.toLowerCase().trim() as PerkCategory;
  return VALID_CATEGORIES.has(key) ? key : null;
}

async function callGroqIntent(text: string): Promise<TelegramIntent | null> {
  if (!env.GROQ_API_KEY) return null;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Parse Perx employee Telegram messages. Return ONLY JSON: {"intent":"balance|purchase|recommendation|help|unknown","category":"food|wellness|lifestyle|travel|learning|null","topic":string|null,"offerQuery":string|null,"amount":number|null,"venue":string|null}. Use purchase when user wants to grab/buy/take a specific perk (e.g. "grab me cineplexx movie pass", "I will take the spa massage"). Use recommendation only for browsing/suggestions. Map movies/cinema to lifestyle.'
        },
        { role: "user", content: text }
      ]
    })
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const parsed = extractJson<{
    intent?: string;
    category?: string | null;
    topic?: string | null;
    offerQuery?: string | null;
    amount?: number | null;
    venue?: string | null;
  }>(data.choices?.[0]?.message?.content ?? "");
  if (!parsed?.intent) return null;

  const inferred = inferTopicFromMessage(`${text} ${parsed.topic ?? ""} ${parsed.offerQuery ?? ""}`);

  switch (parsed.intent) {
    case "balance":
      return { intent: "balance" };
    case "recommendation": {
      if (isPerkPurchaseRequest(text)) return purchaseIntent(text);
      const category = normalizeCategory(parsed.category) ?? inferred.category;
      return {
        intent: "recommendation",
        category,
        searchTerms: inferred.searchTerms,
        label: inferred.label ?? parsed.topic ?? null
      };
    }
    case "help":
      return { intent: "help" };
    case "purchase":
    case "purchase_lunch":
      return {
        intent: "purchase",
        query: parsed.offerQuery?.trim() || extractOfferQuery(text),
        amount: parsed.amount ?? extractAmount(text) ?? undefined,
        venue: parsed.venue?.trim() || extractVenue(text),
        category: normalizeCategory(parsed.category) ?? inferred.category
      };
    default:
      return { intent: "unknown" };
  }
}

export async function parseTelegramIntent(text: string): Promise<TelegramIntent> {
  if (isPerkPurchaseRequest(text)) {
    return purchaseIntent(text);
  }

  const llm = await callGroqIntent(text);
  if (llm) return llm;
  return fallbackIntent(text);
}
