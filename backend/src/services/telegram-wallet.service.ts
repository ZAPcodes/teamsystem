import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { User } from "../models/User.js";

/** Offer catalog categories — not separate wallet buckets. */
export const CATEGORY_WALLET_LABELS = {
  food: "Food",
  wellness: "Wellness",
  lifestyle: "Lifestyle",
  travel: "Travel",
  learning: "Learning"
} as const;

export type CategoryKey = keyof typeof CATEGORY_WALLET_LABELS;

export interface UnifiedAllowanceSnapshot {
  available: number;
  total: number;
  used: number;
  held: number;
  currency: string;
}

export async function getUnifiedAllowance(userId: string): Promise<UnifiedAllowanceSnapshot | null> {
  const user = await User.findById(userId).select("companyId").lean();
  if (!user) return null;

  // Drop legacy per-category Telegram balances — wallet is unified on EmployeeAllowance.
  await User.updateOne(
    {
      _id: userId,
      $or: [
        { telegramFoodBalance: { $exists: true } },
        { telegramWellnessBalance: { $exists: true } },
        { telegramLifestyleBalance: { $exists: true } },
        { telegramTravelBalance: { $exists: true } },
        { telegramLearningBalance: { $exists: true } }
      ]
    },
    {
      $unset: {
        telegramFoodBalance: 1,
        telegramWellnessBalance: 1,
        telegramLifestyleBalance: 1,
        telegramTravelBalance: 1,
        telegramLearningBalance: 1
      }
    }
  );

  const allowance = await EmployeeAllowance.findOne({ userId, companyId: user.companyId }).lean();
  if (!allowance) return null;

  const policy = await EmployerPolicy.findOne({ companyId: user.companyId }).lean();
  const currency = policy?.currency ?? allowance.currency;
  const available = Math.max(0, allowance.total - allowance.used - allowance.held);

  return {
    available,
    total: allowance.total,
    used: allowance.used,
    held: allowance.held,
    currency
  };
}

export function formatUnifiedBalance(snapshot: UnifiedAllowanceSnapshot) {
  return `${snapshot.available.toLocaleString("en-GB")} ${snapshot.currency} available`;
}
