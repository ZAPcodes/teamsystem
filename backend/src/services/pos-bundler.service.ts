import type { OfferDTO } from "../../contracts/api.js";

export interface BundleComplement {
  offer: OfferDTO;
  shortLabel: string;
  pitch: string;
}

export interface PosBundleResult {
  showBundler: boolean;
  offerId: string;
  baseOffer: OfferDTO;
  walletBalance: number;
  remainingAfterBase: number;
  headline: string;
  agentPrompt: string;
  complements: BundleComplement[];
}

function formatAll(amount: number) {
  return `${amount.toLocaleString("en-GB")} ALL`;
}

function catalogExcluding(baseId: string, catalog: OfferDTO[]) {
  return catalog.filter((o) => o.id !== baseId && o.isActive);
}

function pickByPattern(
  catalog: OfferDTO[],
  pattern: RegExp,
  maxPrice: number,
  excludeIds: Set<string>
): OfferDTO | undefined {
  return catalog
    .filter((o) => !excludeIds.has(o.id) && pattern.test(`${o.title} ${o.description} ${o.providerName}`))
    .filter((o) => o.price <= maxPrice)
    .sort((a, b) => a.price - b.price)[0];
}

function cinemaBundle(base: OfferDTO, catalog: OfferDTO[], budget: number): BundleComplement[] {
  const pool = catalogExcluding(base.id, catalog);
  const used = new Set<string>();
  const complements: BundleComplement[] = [];

  const ride =
    pickByPattern(pool, /\b(bolt|ride|transfer|taxi|mobility)\b/i, budget, used) ??
    pickByPattern(pool, /\b(travel|transport)\b/i, budget, used);

  if (ride) {
    used.add(ride.id);
    complements.push({
      offer: ride,
      shortLabel: ride.title.includes("Bolt") ? "Bolt ride voucher" : "mall ride voucher",
      pitch: "Get to the cinema without hunting for parking."
    });
  }

  const snack =
    pickByPattern(pool, /\b(popcorn|premiere|cinema pair)\b/i, budget, used) ??
    pickByPattern(pool, /\b(coffee|cafe|mulliri)\b/i, budget, used);

  if (snack) {
    complements.push({
      offer: snack,
      shortLabel: snack.title.toLowerCase().includes("popcorn") ? "popcorn combo" : "snack add-on",
      pitch: "Most movie nights include something from the lobby."
    });
  }

  return complements.slice(0, 2);
}

function foodBundle(base: OfferDTO, catalog: OfferDTO[], budget: number): BundleComplement[] {
  const pool = catalogExcluding(base.id, catalog);
  const used = new Set<string>();
  const complements: BundleComplement[] = [];

  const ride = pickByPattern(pool, /\b(bolt|ride|transfer|taxi)\b/i, budget, used);
  if (ride) {
    used.add(ride.id);
    complements.push({
      offer: ride,
      shortLabel: "ride credit",
      pitch: "Skip the walk — add a ride there and back."
    });
  }

  const drink = pickByPattern(pool, /\b(coffee|juice|mulliri)\b/i, budget, used);
  if (drink) {
    complements.push({
      offer: drink,
      shortLabel: "drink add-on",
      pitch: "Round out the meal with a cafe stop."
    });
  }

  return complements.slice(0, 2);
}

function wellnessBundle(base: OfferDTO, catalog: OfferDTO[], budget: number): BundleComplement[] {
  const pool = catalogExcluding(base.id, catalog);
  const used = new Set<string>();
  const complements: BundleComplement[] = [];

  const recovery = pickByPattern(pool, /\b(sauna|tea|yoga)\b/i, budget, used);
  if (recovery) {
    used.add(recovery.id);
    complements.push({
      offer: recovery,
      shortLabel: "recovery add-on",
      pitch: "Extend the reset with a quiet recovery slot."
    });
  }

  const lunch = pickByPattern(pool, /\b(lunch|food|menu)\b/i, budget, used);
  if (lunch) {
    complements.push({
      offer: lunch,
      shortLabel: "lunch pairing",
      pitch: "Fuel up after your session."
    });
  }

  return complements.slice(0, 2);
}

function defaultBundle(base: OfferDTO, catalog: OfferDTO[], budget: number): BundleComplement[] {
  const pool = catalogExcluding(base.id, catalog);
  const complements: BundleComplement[] = [];
  const used = new Set<string>();

  const mobility = pickByPattern(pool, /\b(bolt|ride|transfer|cowork|mobility)\b/i, budget, used);
  if (mobility) {
    used.add(mobility.id);
    complements.push({
      offer: mobility,
      shortLabel: "mobility add-on",
      pitch: "Customers often pair perks with an easy way to get there."
    });
  }

  const extra = pool
    .filter((o) => !used.has(o.id) && o.category === base.category && o.price <= budget)
    .sort((a, b) => a.price - b.price)[0];

  if (extra) {
    complements.push({
      offer: extra,
      shortLabel: "companion perk",
      pitch: "A natural second pick from the same category."
    });
  }

  return complements.slice(0, 2);
}

function resolveComplements(base: OfferDTO, catalog: OfferDTO[], budget: number): BundleComplement[] {
  const blob = `${base.title} ${base.description}`.toLowerCase();

  if (/\b(cinema|movie|premiere|kinema|cineplexx|ticket)\b/i.test(blob)) {
    return cinemaBundle(base, catalog, budget);
  }
  if (base.category === "food" || /\b(lunch|dinner|menu|restaurant|bazaar)\b/i.test(blob)) {
    return foodBundle(base, catalog, budget);
  }
  if (base.category === "wellness" || /\b(spa|massage|gym|yoga|sauna)\b/i.test(blob)) {
    return wellnessBundle(base, catalog, budget);
  }
  return defaultBundle(base, catalog, budget);
}

function buildHeadline(base: OfferDTO): string {
  const blob = `${base.title} ${base.description}`.toLowerCase();
  if (/\b(cinema|movie|premiere|kinema|cineplexx)\b/i.test(blob)) {
    return "You're going to the movies!";
  }
  if (base.category === "food") return "Great pick for lunch!";
  if (base.category === "wellness") return "Nice reset — want to extend it?";
  if (base.category === "travel") return "Trip booked — need anything else?";
  return "Smart pick — customers often bundle this.";
}

function buildAgentPrompt(base: OfferDTO, complements: BundleComplement[]): string {
  const blob = `${base.title} ${base.description}`.toLowerCase();

  if (/\b(cinema|movie|premiere|kinema|cineplexx)\b/i.test(blob) && complements.length >= 2) {
  const [a, b] = complements;
  return `You're going to the movies! Customers usually pair this with a ride. Want to add a ${formatAll(a.offer.price)} ${a.shortLabel} to get to the mall, or a ${formatAll(b.offer.price)} ${b.shortLabel}?`;
  }

  if (complements.length === 0) {
    return `Add ${base.title} to your package?`;
  }

  if (complements.length === 1) {
    const c = complements[0];
    return `Customers usually pair this with a ${c.shortLabel}. Want to add a ${formatAll(c.offer.price)} ${c.offer.title}, or checkout with your pick only?`;
  }

  const options = complements
    .map((c) => `a ${formatAll(c.offer.price)} ${c.shortLabel}`)
    .join(", or ");
  return `Customers usually pair this with more than one perk. Want to add ${options}?`;
}

export function evaluatePosBundle(input: {
  baseOffer: OfferDTO;
  catalog: OfferDTO[];
  walletBalance: number;
}): PosBundleResult {
  const { baseOffer, catalog, walletBalance } = input;
  const remainingAfterBase = Math.max(0, walletBalance - baseOffer.price);
  const minAddon = 300;

  const complements =
    remainingAfterBase >= minAddon
      ? resolveComplements(baseOffer, catalog, remainingAfterBase)
      : [];

  const headline = buildHeadline(baseOffer);
  const agentPrompt = buildAgentPrompt(baseOffer, complements);

  return {
    showBundler: complements.length > 0,
    offerId: baseOffer.id,
    baseOffer,
    walletBalance,
    remainingAfterBase,
    headline,
    agentPrompt,
    complements
  };
}
