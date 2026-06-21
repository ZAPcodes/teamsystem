import type { CategoryKey } from "./telegram-wallet.service.js";

export type PerkCategory = CategoryKey;

export interface TopicInference {
  category: PerkCategory | null;
  searchTerms: string[];
  label: string | null;
}

const TOPIC_RULES: Array<{
  pattern: RegExp;
  category: PerkCategory;
  searchTerms: string[];
  label: string;
}> = [
  {
    pattern: /\b(movie|movies|cinema|film|films|cineplexx|ticket|tickets|watching|watch)\b/i,
    category: "lifestyle",
    searchTerms: ["movie", "cinema", "cineplexx", "premiere", "ticket"],
    label: "movie"
  },
  {
    pattern: /\b(lunch|dinner|breakfast|food|bistro|restaurant|eat|eating|artigiano|pazari|grocery|groceries)\b/i,
    category: "food",
    searchTerms: ["lunch", "food", "bistro", "grocery", "coffee", "breakfast"],
    label: "food"
  },
  {
    pattern: /\b(spa|massage|gym|yoga|sauna|wellness|health|clinic|nutrition|relax|calm|reset)\b/i,
    category: "wellness",
    searchTerms: ["spa", "massage", "gym", "yoga", "sauna", "health", "nutrition"],
    label: "wellness"
  },
  {
    pattern: /\b(travel|trip|weekend|hike|hiking|mountain|beach|escape|vlore|dajti|theth)\b/i,
    category: "travel",
    searchTerms: ["travel", "weekend", "hike", "mountain", "beach", "trip", "escape"],
    label: "travel"
  },
  {
    pattern: /\b(learn|learning|course|class|language|italian|workshop|school)\b/i,
    category: "learning",
    searchTerms: ["course", "language", "italian", "workshop", "class"],
    label: "learning"
  },
  {
    pattern: /\b(pottery|ceramic|ceramics|paint|painting|art class|craft)\b/i,
    category: "learning",
    searchTerms: ["pottery", "ceramic", "art", "craft", "workshop", "class"],
    label: "learning"
  },
  {
    pattern: /\b(bolt|ride|cowork|mobile|telecom|internet|connectivity|lifestyle)\b/i,
    category: "lifestyle",
    searchTerms: ["bolt", "cowork", "mobile", "internet", "top-up"],
    label: "lifestyle"
  }
];

const AFFIRMATIVE = /^(yeah|yes|yep|yup|sure|ok|okay|please|go ahead|sounds good|do it)$/i;

export function isAffirmativeReply(text: string) {
  return AFFIRMATIVE.test(text.trim());
}

const PURCHASE_VERB =
  /\b(grab|get me|buy me|buy|order|purchase|i'll take|i will take|i want|i'd like|i would like|give me|book me|can i get)\b/i;

export function extractOfferQuery(text: string) {
  let query = text.trim();
  query = query.replace(PURCHASE_VERB, " ");
  query = query.replace(/\b(the|a|an|for me|please)\b/gi, " ");
  query = query.replace(/\bat\s+[^,.]+/gi, " ");
  query = query.replace(/\d[\d,]*\s*all\b/gi, " ");
  return query.replace(/\s+/g, " ").trim();
}

export function isPerkPurchaseRequest(text: string) {
  const lower = text.toLowerCase().trim();
  if (!PURCHASE_VERB.test(lower)) return false;
  if (/\b(suggest|recommend|what should|show me options|any ideas)\b/i.test(lower)) return false;

  const query = extractOfferQuery(text);
  if (query.length >= 3) return true;

  return isFoodPurchaseRequest(text);
}

export function inferTopicFromMessage(text: string): TopicInference {
  const trimmed = text.trim();
  if (!trimmed) {
    return { category: null, searchTerms: [], label: null };
  }

  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(trimmed)) {
      return {
        category: rule.category,
        searchTerms: rule.searchTerms,
        label: rule.label
      };
    }
  }

  return { category: null, searchTerms: [], label: null };
}

export function isRecommendationRequest(text: string) {
  const lower = text.toLowerCase().trim();
  if (isPerkPurchaseRequest(text)) return false;
  if (isAffirmativeReply(lower)) return true;

  return (
    /\b(suggest|recommend|recommendation|suggestion|ideas?|offers?|perks?|what should i|show me|looking for|anything for|options?|coupons?)\b/i.test(
      lower
    ) || inferTopicFromMessage(text).category !== null
  );
}

export function isFoodPurchaseRequest(text: string) {
  const lower = text.toLowerCase().trim();
  if (!PURCHASE_VERB.test(lower) && !/\blunch pass\b/i.test(lower)) return false;

  const lunchPass = /\blunch pass\b/i.test(lower);
  const foodVenue = /\b(artigiano|pazari|bistro|restaurant|lunch|food)\b/i.test(lower);
  const amountWithAll = /\d[\d,]*\s*all\b/i.test(lower) && foodVenue;

  return lunchPass || foodVenue || amountWithAll;
}
