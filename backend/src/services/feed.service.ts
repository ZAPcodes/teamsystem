import type { OfferDTO } from "../../contracts/api.js";
import type { FeedContext, TimeBoost } from "./feed-context.service.js";

type ScoredOffer = OfferDTO & { feedScore?: number };

type AffinityMap = Map<string, number>;

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function buildCategoryAffinity(events: Array<{ category: string; status: string }>): AffinityMap {
  const weights: Record<string, number> = {
    redeemed: 4,
    approved: 3,
    pending: 2,
    created: 1
  };
  const affinity = new Map<string, number>();

  for (const event of events) {
    const weight = weights[event.status] ?? 0;
    if (weight === 0) continue;
    affinity.set(event.category, (affinity.get(event.category) ?? 0) + weight);
  }

  return affinity;
}

function applyTimeBoosts(score: number, offer: OfferDTO, timeBoosts: TimeBoost[]): number {
  let next = score;
  for (const boost of timeBoosts) {
    if (offer.category === boost.category) next += boost.weight;
  }
  return next;
}

function expiringSoonSortKey(offer: OfferDTO, walletBalance: number): [number, number, number] {
  const affordable = offer.price <= walletBalance ? 1 : 0;
  const priceFit = affordable ? offer.price : -offer.price;
  return [affordable, priceFit, -offer.price];
}

export function rankOffers(input: {
  offers: OfferDTO[];
  dropOfferIds: Set<string>;
  categoryAffinity: AffinityMap;
  daysToAllowanceReset: number | null;
  feedContext?: FeedContext;
}): ScoredOffer[] {
  const { offers, dropOfferIds, categoryAffinity, daysToAllowanceReset, feedContext } = input;
  const timeBoosts = feedContext?.timeBoosts ?? [];
  const expiringSoon = feedContext?.mode === "expiring_soon";
  const walletBalance = feedContext?.walletBalance ?? 0;

  const scored = offers.map((offer) => {
    let score = 0;

    if (dropOfferIds.has(offer.id)) score += 120;
    score += (categoryAffinity.get(offer.category) ?? 0) * 12;
    score = applyTimeBoosts(score, offer, timeBoosts);

    const offerDays = daysUntil(offer.expiresAt);
    if (offerDays !== null && offerDays <= 7) score += 40;
    if (offerDays !== null && offerDays <= 2) score += 20;

    if (daysToAllowanceReset !== null && daysToAllowanceReset <= 7) score += 25;
    if (daysToAllowanceReset !== null && daysToAllowanceReset <= 3) score += 35;

    if (expiringSoon && offer.price <= walletBalance) score += 200;
    if (expiringSoon && offer.price <= walletBalance * 0.5) score += 40;

    if (offer.isLimited) score += 18;
    if (offer.inventoryRemaining !== undefined && offer.inventoryRemaining <= 5) {
      score += 30;
    }

    if (offer.visibility === "exclusive") score += 10;

    return { ...offer, feedScore: score };
  });

  if (expiringSoon && walletBalance > 0) {
    return scored.sort((a, b) => {
      const ka = expiringSoonSortKey(a, walletBalance);
      const kb = expiringSoonSortKey(b, walletBalance);
      for (let i = 0; i < 3; i++) {
        if (ka[i] !== kb[i]) return kb[i] - ka[i];
      }
      return (b.feedScore ?? 0) - (a.feedScore ?? 0);
    });
  }

  return scored.sort((a, b) => (b.feedScore ?? 0) - (a.feedScore ?? 0));
}
