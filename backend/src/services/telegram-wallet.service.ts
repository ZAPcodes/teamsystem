import { EmployeeAllowance } from "../models/EmployeeAllowance.js";

export const CATEGORY_WALLET_LABELS = {
  food: "Food",
  wellness: "Wellness",
  lifestyle: "Lifestyle",
  travel: "Travel",
  learning: "Learning"
} as const;

export type CategoryKey = keyof typeof CATEGORY_WALLET_LABELS;

export interface CategoryWalletSnapshot {
  food: number;
  wellness: number;
  lifestyle: number;
  travel: number;
  learning: number;
}

function roundAll(snapshot: CategoryWalletSnapshot): CategoryWalletSnapshot {
  return {
    food: Math.max(0, Math.round(snapshot.food)),
    wellness: Math.max(0, Math.round(snapshot.wellness)),
    lifestyle: Math.max(0, Math.round(snapshot.lifestyle)),
    travel: Math.max(0, Math.round(snapshot.travel)),
    learning: Math.max(0, Math.round(snapshot.learning))
  };
}

export function buildDemoWalletFromAllowance(available: number, preferences: string[]): CategoryWalletSnapshot {
  if (available <= 0) {
    return { food: 0, wellness: 0, lifestyle: 0, travel: 0, learning: 0 };
  }

  if (available >= 5000) {
    const food = Math.min(4500, Math.round(available * 0.45));
    const wellness = Math.min(1200, Math.round(available * 0.18));
    const lifestyle = Math.min(900, Math.round(available * 0.15));
    const travel = Math.min(800, Math.round(available * 0.12));
    const learning = Math.max(0, available - food - wellness - lifestyle - travel);
    return roundAll({ food, wellness, lifestyle, travel, learning });
  }

  const preferred = preferences.filter((p) => p in CATEGORY_WALLET_LABELS) as CategoryKey[];
  const buckets = preferred.length > 0 ? preferred : (["food", "wellness", "lifestyle"] as CategoryKey[]);
  const share = available / buckets.length;
  const snapshot: CategoryWalletSnapshot = {
    food: 0,
    wellness: 0,
    lifestyle: 0,
    travel: 0,
    learning: 0
  };
  for (const bucket of buckets) {
    snapshot[bucket] = share;
  }
  return roundAll(snapshot);
}

export function readTelegramWallet(user: {
  telegramFoodBalance?: number | null;
  telegramWellnessBalance?: number | null;
  telegramLifestyleBalance?: number | null;
  telegramTravelBalance?: number | null;
  telegramLearningBalance?: number | null;
}): CategoryWalletSnapshot | null {
  if (
    user.telegramFoodBalance == null &&
    user.telegramWellnessBalance == null &&
    user.telegramLifestyleBalance == null
  ) {
    return null;
  }

  return roundAll({
    food: user.telegramFoodBalance ?? 0,
    wellness: user.telegramWellnessBalance ?? 0,
    lifestyle: user.telegramLifestyleBalance ?? 0,
    travel: user.telegramTravelBalance ?? 0,
    learning: user.telegramLearningBalance ?? 0
  });
}

export async function ensureTelegramWalletInitialized(userId: string) {
  const allowance = await EmployeeAllowance.findOne({ userId }).lean();
  if (!allowance) return null;

  const available = Math.max(0, allowance.total - allowance.used - allowance.held);
  const user = await (await import("../models/User.js")).User.findById(userId).lean();
  if (!user) return null;

  const existing = readTelegramWallet(user);
  if (existing) return existing;

  const snapshot = buildDemoWalletFromAllowance(available, user.preferences ?? []);
  await (await import("../models/User.js")).User.updateOne(
    { _id: userId },
    {
      $set: {
        telegramFoodBalance: snapshot.food,
        telegramWellnessBalance: snapshot.wellness,
        telegramLifestyleBalance: snapshot.lifestyle,
        telegramTravelBalance: snapshot.travel,
        telegramLearningBalance: snapshot.learning
      }
    }
  );

  return snapshot;
}

export function formatWalletLines(snapshot: CategoryWalletSnapshot) {
  const lines = (Object.keys(CATEGORY_WALLET_LABELS) as CategoryKey[])
    .map((key) => ({ key, label: CATEGORY_WALLET_LABELS[key], amount: snapshot[key] }))
    .filter((row) => row.amount > 0)
    .map((row) => `${row.amount.toLocaleString("en-GB")} ALL in ${row.label}`);

  return lines.length > 0 ? lines.join(", ") : "0 ALL available";
}

export function deductCategoryBalance(
  snapshot: CategoryWalletSnapshot,
  category: CategoryKey,
  amount: number
): CategoryWalletSnapshot | null {
  if (snapshot[category] < amount) return null;
  const next = { ...snapshot, [category]: snapshot[category] - amount };
  return roundAll(next);
}

export async function persistTelegramWallet(userId: string, snapshot: CategoryWalletSnapshot) {
  await (await import("../models/User.js")).User.updateOne(
    { _id: userId },
    {
      $set: {
        telegramFoodBalance: snapshot.food,
        telegramWellnessBalance: snapshot.wellness,
        telegramLifestyleBalance: snapshot.lifestyle,
        telegramTravelBalance: snapshot.travel,
        telegramLearningBalance: snapshot.learning
      }
    }
  );
}
