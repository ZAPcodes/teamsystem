import { ApiError } from "../http/ApiError.js";
import { env } from "../config/env.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { Offer } from "../models/Offer.js";
import { Provider } from "../models/Provider.js";
import { TelegramLinkCode } from "../models/TelegramLinkCode.js";
import { User } from "../models/User.js";
import { createDraftPackage, submitPackage } from "./package.service.js";
import { evaluateClaimCompliance } from "./compliance.service.js";
import {
  formatUnifiedBalance,
  getUnifiedAllowance,
  type CategoryKey,
  type UnifiedAllowanceSnapshot
} from "./telegram-wallet.service.js";
import type { PerkCategory } from "./telegram-topic.service.js";
import { inferTopicFromMessage } from "./telegram-topic.service.js";

const VENUE_PROVIDER_PATTERNS: Record<string, RegExp> = {
  artigiano: /artigiano|pazari|bazaar|bistro/i,
  pazari: /pazari|bazaar|bistro/i
};

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createTelegramLinkCode(userId: string) {
  await TelegramLinkCode.updateMany({ userId, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });

  let code = randomCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const exists = await TelegramLinkCode.findOne({ code }).lean();
    if (!exists) break;
    code = randomCode();
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
  await TelegramLinkCode.create({ userId, code, expiresAt });

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    botUsername: env.TELEGRAM_BOT_USERNAME ?? "PerxBenefitsBot"
  };
}

export async function getTelegramLinkStatus(userId: string) {
  const user = await User.findById(userId).select("telegramChatId telegramLinkedAt").lean();
  return {
    linked: Boolean(user?.telegramChatId),
    linkedAt: user?.telegramLinkedAt?.toISOString(),
    botUsername: env.TELEGRAM_BOT_USERNAME ?? "PerxBenefitsBot"
  };
}

export async function linkTelegramChat(chatId: string, code: string) {
  const link = await TelegramLinkCode.findOne({ code: code.trim() });
  if (!link || link.usedAt || link.expiresAt < new Date()) {
    throw new ApiError(400, "INVALID_LINK_CODE", "Link code is invalid or expired");
  }

  const user = await User.findById(link.userId);
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found");
  }

  await User.updateMany({ telegramChatId: chatId }, { $unset: { telegramChatId: 1, telegramLinkedAt: 1 } });

  user.telegramChatId = chatId;
  user.telegramLinkedAt = new Date();
  link.usedAt = new Date();

  await Promise.all([
    user.save(),
    link.save(),
    User.updateOne(
      { _id: user._id },
      {
        $unset: {
          telegramFoodBalance: 1,
          telegramWellnessBalance: 1,
          telegramLifestyleBalance: 1,
          telegramTravelBalance: 1,
          telegramLearningBalance: 1
        }
      }
    )
  ]);

  return { name: user.name };
}

export async function findUserByTelegramChat(chatId: string) {
  return User.findOne({ telegramChatId: chatId }).lean();
}

export async function getBalanceMessage(userId: string) {
  const allowance = await getUnifiedAllowance(userId);
  if (!allowance) {
    return "I couldn't load your wallet right now. Try again from the Perx web app.";
  }

  return `You have ${formatUnifiedBalance(allowance)}. Need a recommendation?`;
}

export async function getRecommendationMessage(
  userId: string,
  input?: { category?: PerkCategory | null; searchTerms?: string[]; label?: string | null; userMessage?: string }
) {
  const allowance = await getUnifiedAllowance(userId);
  if (!allowance) {
    return "I couldn't load your wallet right now. Try again from the Perx web app.";
  }

  const fromMessage = input?.userMessage ? inferTopicFromMessage(input.userMessage) : null;
  const category = resolveOfferCategory(input?.category ?? fromMessage?.category);
  const searchTerms = [...(input?.searchTerms ?? []), ...(fromMessage?.searchTerms ?? [])];
  const label = input?.label ?? fromMessage?.label;

  let offers = await Offer.find({ isActive: true, category }).sort({ price: 1 }).lean();

  if (searchTerms.length > 0) {
    const matched = offers.filter((offer) =>
      searchTerms.some((term) =>
        new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(`${offer.title} ${offer.description}`)
      )
    );
    if (matched.length > 0) {
      offers = matched;
    }
  }

  const picks = offers.slice(0, 3);
  if (picks.length === 0) {
    const fallbackCategory = category ?? "lifestyle";
    const fallbackOffers = await Offer.find({ isActive: true, category: fallbackCategory })
      .sort({ price: 1 })
      .limit(3)
      .lean();
    if (fallbackOffers.length === 0) {
      return "I don't see matching perks in your catalog right now — browse the marketplace in the app.";
    }
    return formatRecommendationReply(fallbackOffers, fallbackCategory, allowance, label);
  }

  return formatRecommendationReply(picks, category, allowance, label);
}

function resolveOfferCategory(category?: PerkCategory | null): CategoryKey {
  return category ?? "lifestyle";
}

function formatRecommendationReply(
  offers: Array<{ title: string; price: number }>,
  category: CategoryKey,
  allowance: UnifiedAllowanceSnapshot,
  label: string | null | undefined
) {
  const topicLabel = label ? `${label} ` : "";
  const lines = offers.map(
    (offer) => `• ${offer.title} — ${offer.price.toLocaleString("en-GB")} ${allowance.currency}`
  );

  const cta =
    category === "food"
      ? 'Say "grab me a lunch pass" when you\'re ready.'
      : `Say "grab me ${offers[0]?.title}" or pick one in the Perx app.`;

  return [
    `Here are some ${topicLabel}perks:`,
    lines.join("\n"),
    `You have ${formatUnifiedBalance(allowance)}. ${cta}`
  ].join("\n");
}

async function findOfferByQuery(query: string, category?: PerkCategory | null, amount?: number) {
  const normalized = query.toLowerCase().trim();
  const tokens = normalized.split(/\s+/).filter((token) => token.length > 2);

  let offers = await Offer.find({ isActive: true }).lean();
  if (category) {
    offers = offers.filter((offer) => offer.category === category);
  }

  const scored = offers
    .map((offer) => {
      const hay = `${offer.title} ${offer.description}`.toLowerCase();
      let score = 0;
      if (normalized && hay.includes(normalized)) score += 200;
      for (const token of tokens) {
        if (hay.includes(token)) score += token.length;
      }
      if (amount != null) {
        score += Math.max(0, 40 - Math.abs(offer.price - amount) / 50);
      }
      return { offer, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.offer ?? null;
}

async function findLunchOffer(amount: number, venue: string) {
  const venueKey = Object.keys(VENUE_PROVIDER_PATTERNS).find((key) =>
    venue.toLowerCase().includes(key)
  );
  const providerPattern = venueKey ? VENUE_PROVIDER_PATTERNS[venueKey] : /food|lunch|bazaar|bistro/i;

  const providers = await Provider.find({ category: "food" }).lean();
  const matchedProviders = providers.filter((provider) =>
    providerPattern.test(`${provider.name} ${provider.description}`)
  );
  const providerIds = (matchedProviders.length > 0 ? matchedProviders : providers).map((p) => p._id);

  const offers = await Offer.find({
    isActive: true,
    category: "food",
    providerId: { $in: providerIds }
  })
    .populate("providerId")
    .lean();

  if (offers.length === 0) {
    return null;
  }

  return offers
    .slice()
    .sort((a, b) => Math.abs(a.price - amount) - Math.abs(b.price - amount))[0];
}

function purchaseCaption(offerTitle: string, remaining: number, currency: string, category: CategoryKey) {
  const venueHint =
    category === "food"
      ? "Show this QR code to the waiter."
      : category === "wellness"
        ? "Show this QR code at check-in."
        : "Show this QR code at the venue.";

  return `Done! ${offerTitle} is ready. ${venueHint} ${remaining.toLocaleString("en-GB")} ${currency} remaining in your wallet.`;
}

export async function purchasePerkViaTelegram(
  userId: string,
  input: { query: string; amount?: number; venue?: string; category?: PerkCategory | null }
) {
  const user = await User.findById(userId);
  if (!user?.telegramChatId) {
    throw new ApiError(400, "TELEGRAM_NOT_LINKED", "Telegram account not linked");
  }

  const allowance = await EmployeeAllowance.findOne({ userId, companyId: user.companyId });
  if (!allowance) {
    throw new ApiError(400, "ALLOWANCE_NOT_FOUND", "Allowance not found");
  }

  let offer =
    input.venue && (input.category === "food" || isFoodVenue(input.venue, input.query))
      ? await findLunchOffer(input.amount ?? 1500, input.venue)
      : await findOfferByQuery(input.query, input.category, input.amount);

  if (!offer && input.category) {
    offer = await findOfferByQuery(input.query, null, input.amount);
  }

  if (!offer) {
    throw new ApiError(404, "OFFER_NOT_FOUND", "I couldn't find that perk — try the exact name from the list.");
  }

  const compliance = await evaluateClaimCompliance({
    userId,
    companyId: user.companyId.toString(),
    offerId: String(offer._id)
  });
  if (!compliance.allowed) {
    throw new ApiError(
      403,
      "COMPLIANCE_BLOCKED",
      compliance.message ?? "This perk requires company verification before you can claim it."
    );
  }

  const walletCategory = offer.category as CategoryKey;
  const price = offer.price;
  const available = allowance.total - allowance.used - allowance.held;
  if (price > available) {
    throw new ApiError(400, "INSUFFICIENT_ALLOWANCE", "Not enough allowance for this perk");
  }

  const draft = await createDraftPackage(userId, user.companyId.toString(), [String(offer._id)], "manual");
  const submitted = await submitPackage(draft.id, userId, { shareToFeed: false });
  const voucher = submitted.vouchers[0];
  if (!voucher) {
    throw new ApiError(500, "VOUCHER_NOT_ISSUED", "Could not issue voucher");
  }

  const refreshed = await getUnifiedAllowance(userId);
  const remaining = refreshed?.available ?? 0;
  const currency = refreshed?.currency ?? offer.currency;

  return {
    offerTitle: offer.title,
    price,
    currency,
    walletCategory,
    walletRemaining: remaining,
    voucherCode: voucher.code,
    qrPayload: voucher.qrPayload,
    caption: purchaseCaption(offer.title, remaining, currency, walletCategory)
  };
}

function isFoodVenue(venue: string, query: string) {
  return /\b(artigiano|pazari|bistro|restaurant|lunch|food)\b/i.test(`${venue} ${query}`);
}

/** @deprecated Use purchasePerkViaTelegram */
export async function purchaseLunchPassViaTelegram(userId: string, input: { amount: number; venue: string }) {
  return purchasePerkViaTelegram(userId, {
    query: "lunch pass",
    amount: input.amount,
    venue: input.venue,
    category: "food"
  });
}
