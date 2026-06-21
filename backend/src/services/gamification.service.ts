import mongoose from "mongoose";
import { nanoid } from "nanoid";
import type { GamificationAwardDTO, QuestDTO, UserProgressDTO } from "../../contracts/api.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Notification } from "../models/Notification.js";
import { ProviderMonthlyStat } from "../models/ProviderMonthlyStat.js";
import { Quest } from "../models/Quest.js";
import { User } from "../models/User.js";
import { UserProgress } from "../models/UserProgress.js";
import { ApiError } from "../http/ApiError.js";

export const XP_PER_REDEEM = 75;
export const BONUS_UNLOCK_LEVEL = 5;
export const BONUS_CREDITS_AMOUNT = 2000;
export const MAX_STREAK_BONUS = 25;
export const STREAK_FREEZE_XP_COST = 200;
export const MAX_LEVEL = 30;

const LEVEL_THRESHOLDS: number[] = (() => {
  const thresholds = [0];
  for (let level = 1; level <= MAX_LEVEL; level++) {
    thresholds.push(thresholds[thresholds.length - 1] + 80 + level * 18);
  }
  return thresholds;
})();

const LEVEL_TITLES = [
  "Newcomer", "Explorer", "Regular", "Enthusiast", "Champion",
  "Rising Star", "Patron", "Maven", "Icon", "Bronze Ace",
  "Silver Spark", "Silver Regular", "Silver Pro", "Silver Elite", "Silver Legend",
  "Gold Initiate", "Gold Regular", "Gold Pro", "Gold Elite", "Gold Legend",
  "Office Hero", "Perx Oracle", "Benefit Baron", "Culture Catalyst", "Wellness Warrior",
  "Taste Maker", "Trailblazer", "Mythic", "Immortal", "Perx Immortal"
];

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayDiff(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((bUtc - aUtc) / msPerDay);
}

export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseWeekKey(key: string): { year: number; week: number } {
  const [year, w] = key.split("-W");
  return { year: Number(year), week: Number(w) };
}

function weekKeyDiff(prev: string, current: string): number {
  const a = parseWeekKey(prev);
  const b = parseWeekKey(current);
  return (b.year - a.year) * 52 + (b.week - a.week);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, MAX_LEVEL);
}

export function xpBand(level: number): { current: number; next: number } {
  const idx = Math.min(level - 1, LEVEL_THRESHOLDS.length - 1);
  const current = LEVEL_THRESHOLDS[idx] ?? 0;
  const next = LEVEL_THRESHOLDS[idx + 1] ?? current + 600;
  return { current, next };
}

export function tierFromLevel(level: number): "bronze" | "silver" | "gold" {
  if (level <= 10) return "bronze";
  if (level <= 20) return "silver";
  return "gold";
}

export function tierTitle(level: number): string {
  const tier = tierFromLevel(level);
  if (tier === "bronze") return "Bronze";
  if (tier === "silver") return "Silver";
  return "Gold";
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? "Perx Legend";
}

function isStreakAtRisk(progress: {
  streakWeeks?: number;
  lastRedeemWeek?: string;
}): boolean {
  if (!progress.streakWeeks || progress.streakWeeks < 1) return false;
  const currentWeek = isoWeekKey(new Date());
  return progress.lastRedeemWeek !== currentWeek;
}

export function toUserProgressDTO(
  progress: {
    xp: number;
    level: number;
    streakCount: number;
    streakWeeks?: number;
    streakFreezes?: number;
    lastRedeemWeek?: string;
    officeLegends?: Array<{
      providerId?: unknown;
      providerName?: string;
      month?: string;
      badgeLabel?: string;
    }>;
    totalRedemptions: number;
    bonusMilestoneGranted: boolean;
  },
  bonusCreditsAvailable: number
): UserProgressDTO {
  const level = levelFromXp(progress.xp);
  const band = xpBand(level);
  const tier = tierFromLevel(level);
  const streakWeeks = progress.streakWeeks ?? 0;

  return {
    xp: progress.xp,
    level,
    levelTitle: levelTitle(level),
    tier,
    tierTitle: tierTitle(level),
    streakCount: streakWeeks,
    streakWeeks,
    streakFreezes: progress.streakFreezes ?? 0,
    streakAtRisk: isStreakAtRisk(progress),
    xpToNextLevel: Math.max(0, band.next - progress.xp),
    nextLevelXp: band.next,
    bonusCreditsUnlocked: progress.bonusMilestoneGranted ? BONUS_CREDITS_AMOUNT : 0,
    bonusCreditsAvailable,
    totalRedemptions: progress.totalRedemptions,
    bonusUnlocked: progress.bonusMilestoneGranted,
    officeLegends: (progress.officeLegends ?? []).map((b) => ({
      providerId: String(b.providerId ?? ""),
      providerName: b.providerName ?? "",
      month: b.month ?? "",
      badgeLabel: b.badgeLabel ?? "Office Legend"
    }))
  };
}

export function toQuestDTO(quest: {
  _id: unknown;
  title: string;
  description: string;
  targetCategory: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  status: "active" | "completed";
  icon?: string | null;
}): QuestDTO {
  const progressPct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));
  return {
    id: String(quest._id),
    title: quest.title,
    description: quest.description,
    targetCategory: quest.targetCategory,
    targetCount: quest.targetCount,
    currentCount: quest.currentCount,
    progressPct,
    rewardXp: quest.rewardXp,
    status: quest.status,
    icon: quest.icon ?? undefined
  };
}

async function getBonusAvailable(userId: string): Promise<number> {
  const allowance = await EmployeeAllowance.findOne({ userId }).lean();
  if (!allowance) return 0;
  const bonusAvailable = (allowance as { bonusAvailable?: number }).bonusAvailable ?? 0;
  const bonusUsed = (allowance as { bonusUsed?: number }).bonusUsed ?? 0;
  return Math.max(0, bonusAvailable - bonusUsed);
}

export async function getOrCreateProgress(userId: string, companyId: string) {
  let progress = await UserProgress.findOne({ userId, companyId });
  if (!progress) {
    progress = await UserProgress.create({
      userId,
      companyId,
      xp: 0,
      level: 1,
      streakCount: 0,
      streakWeeks: 0,
      streakFreezes: 0,
      totalRedemptions: 0,
      bonusMilestoneGranted: false
    });
  }
  return progress;
}

export async function getEmployeeGamification(userId: string, companyId: string) {
  const progress = await getOrCreateProgress(userId, companyId);
  const [bonusCreditsAvailable, quests] = await Promise.all([
    getBonusAvailable(userId),
    Quest.find({ companyId, status: { $in: ["active", "completed"] } })
      .sort({ status: 1, createdAt: -1 })
      .limit(6)
      .lean()
  ]);

  return {
    progress: toUserProgressDTO(
      {
        xp: progress.xp,
        level: progress.level,
        streakCount: progress.streakCount,
        streakWeeks: progress.streakWeeks,
        streakFreezes: progress.streakFreezes,
        lastRedeemWeek: progress.lastRedeemWeek,
        officeLegends: (progress.officeLegends ?? []).map((l) => ({
          providerId: l.providerId,
          providerName: l.providerName ?? undefined,
          month: l.month ?? undefined,
          badgeLabel: l.badgeLabel ?? undefined
        })),
        totalRedemptions: progress.totalRedemptions,
        bonusMilestoneGranted: progress.bonusMilestoneGranted
      },
      bonusCreditsAvailable
    ),
    quests: quests.map((quest) => toQuestDTO(quest))
  };
}

async function grantBonusMilestone(userId: string, companyId: string) {
  await EmployeeAllowance.updateOne(
    { userId, companyId },
    { $inc: { bonusAvailable: BONUS_CREDITS_AMOUNT } }
  );
}

function updateWeeklyStreak(progress: InstanceType<typeof UserProgress>, now: Date) {
  const weekKey = isoWeekKey(now);
  const lastWeek = progress.lastRedeemWeek ?? "";

  if (lastWeek === weekKey) {
    return;
  }

  const lastStreakWeek = progress.lastStreakWeek ?? "";

  if (!lastStreakWeek) {
    progress.streakWeeks = 1;
  } else if (lastStreakWeek === weekKey) {
    // already counted this week
  } else {
    const gap = weekKeyDiff(lastStreakWeek, weekKey);
    if (gap === 1) {
      progress.streakWeeks = (progress.streakWeeks ?? 0) + 1;
    } else if (gap > 1 && (progress.streakFreezes ?? 0) > 0) {
      progress.streakFreezes = (progress.streakFreezes ?? 0) - 1;
      progress.streakWeeks = (progress.streakWeeks ?? 0) + 1;
    } else if (gap > 1) {
      progress.streakWeeks = 1;
    } else {
      progress.streakWeeks = Math.max(1, progress.streakWeeks ?? 1);
    }
  }

  progress.lastRedeemWeek = weekKey;
  progress.lastStreakWeek = weekKey;
  progress.markModified("lastRedeemWeek");
  progress.markModified("lastStreakWeek");
}

export async function recordProviderRedemption(input: {
  userId: string;
  companyId: string;
  providerId: string;
  providerName: string;
}) {
  const month = monthKey(new Date());
  await ProviderMonthlyStat.findOneAndUpdate(
    {
      userId: input.userId,
      companyId: input.companyId,
      providerId: input.providerId,
      month
    },
    {
      $inc: { redemptionCount: 1 },
      $setOnInsert: { providerName: input.providerName }
    },
    { upsert: true, new: true }
  );

  await recomputeOfficeLegend(input.companyId, input.providerId, month);
}

async function recomputeOfficeLegend(companyId: string, providerId: string, month: string) {
  const leaders = await ProviderMonthlyStat.find({ companyId, providerId, month })
    .sort({ redemptionCount: -1 })
    .limit(1)
    .lean();

  const top = leaders[0];
  if (!top || top.redemptionCount < 2) return;

  const badgeLabel = `${top.providerName} Office Legend`;

  const progress = await UserProgress.findOne({ userId: top.userId, companyId });
  if (!progress) return;

  const entry = {
    providerId: top.providerId,
    providerName: top.providerName,
    month,
    badgeLabel
  };

  const legends = (progress.officeLegends ?? []).map((l) => ({
    providerId: l.providerId,
    providerName: l.providerName ?? "",
    month: l.month ?? "",
    badgeLabel: l.badgeLabel ?? ""
  }));

  const existingIdx = legends.findIndex(
    (l) => String(l.providerId) === String(providerId) && l.month === month
  );

  if (existingIdx >= 0) {
    legends[existingIdx] = entry;
  } else {
    legends.push(entry);
  }

  progress.set("officeLegends", legends.slice(-5));
  await progress.save();
}

export async function awardXpDirect(input: {
  userId: string;
  companyId: string;
  amount: number;
  reason: string;
}) {
  const progress = await getOrCreateProgress(input.userId, input.companyId);
  progress.xp += input.amount;
  progress.level = levelFromXp(progress.xp);
  await progress.save();

  await Notification.create({
    userId: input.userId,
    type: "xp",
    payload: { xpAwarded: input.amount, reason: input.reason },
    read: false
  });
}

export async function buyStreakFreeze(userId: string, companyId: string) {
  const progress = await getOrCreateProgress(userId, companyId);
  if (progress.xp < STREAK_FREEZE_XP_COST) {
    throw new ApiError(400, "INSUFFICIENT_XP", `Need ${STREAK_FREEZE_XP_COST} XP for a Streak Freeze`);
  }

  progress.xp -= STREAK_FREEZE_XP_COST;
  progress.streakFreezes = (progress.streakFreezes ?? 0) + 1;
  progress.level = levelFromXp(progress.xp);
  await progress.save();

  return {
    streakFreezes: progress.streakFreezes,
    xp: progress.xp,
    cost: STREAK_FREEZE_XP_COST
  };
}

export async function awardXpOnRedeem(input: {
  userId: string;
  companyId: string;
  category: string;
  providerId?: string;
  providerName?: string;
}): Promise<GamificationAwardDTO> {
  const progress = await getOrCreateProgress(input.userId, input.companyId);
  const now = new Date();
  const previousLevel = levelFromXp(progress.xp);

  let streakCount = progress.streakCount;
  if (!progress.lastRedeemAt) {
    streakCount = 1;
  } else {
    const diff = dayDiff(progress.lastRedeemAt, now);
    if (diff === 0) {
      streakCount = Math.max(streakCount, 1);
    } else if (diff === 1) {
      streakCount += 1;
    } else {
      streakCount = 1;
    }
  }

  updateWeeklyStreak(progress, now);

  const streakBonus = Math.min(streakCount * 5, MAX_STREAK_BONUS);
  const xpAwarded = XP_PER_REDEEM + streakBonus;

  progress.xp += xpAwarded;
  progress.streakCount = streakCount;
  progress.lastRedeemAt = now;
  progress.totalRedemptions += 1;
  progress.level = levelFromXp(progress.xp);

  const leveledUp = progress.level > previousLevel;
  let bonusUnlocked = false;

  if (progress.level >= BONUS_UNLOCK_LEVEL && !progress.bonusMilestoneGranted) {
    progress.bonusMilestoneGranted = true;
    bonusUnlocked = true;
    await grantBonusMilestone(input.userId, input.companyId);
  }

  await progress.save();

  if (input.providerId && input.providerName) {
    await recordProviderRedemption({
      userId: input.userId,
      companyId: input.companyId,
      providerId: input.providerId,
      providerName: input.providerName
    });
  }

  await incrementQuestProgress(input.companyId, input.category);

  const employee = await User.findById(input.userId).select("name").lean();
  const employeeName = employee?.name ?? "Employee";

  const payload = {
    xpAwarded,
    streakCount: progress.streakWeeks ?? 0,
    level: progress.level,
    leveledUp,
    bonusUnlocked,
    employeeName
  };

  await Notification.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    type: "xp",
    payload,
    read: false
  });

  if (leveledUp || bonusUnlocked) {
    await Notification.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      type: bonusUnlocked ? "bonus_unlock" : "level_up",
      payload: {
        level: progress.level,
        levelTitle: levelTitle(progress.level),
        tier: tierFromLevel(progress.level),
        bonusCredits: bonusUnlocked ? BONUS_CREDITS_AMOUNT : undefined
      },
      read: false
    });
  }

  return payload;
}

function questSlugFromTitle(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "quest"}-${nanoid(6).toLowerCase()}`;
}

export async function listCompanyQuests(companyId: string): Promise<QuestDTO[]> {
  const quests = await Quest.find({ companyId })
    .sort({ status: 1, createdAt: -1 })
    .lean();
  return quests.map((quest) => toQuestDTO(quest));
}

export async function createCompanyQuest(
  companyId: string,
  input: {
    title: string;
    description: string;
    targetCategory: string;
    targetCount: number;
    rewardXp?: number;
    icon?: string;
  }
): Promise<QuestDTO> {
  const policy = await EmployerPolicy.findOne({ companyId }).lean();
  if (!policy) {
    throw new ApiError(404, "POLICY_NOT_FOUND", "Employer policy not found");
  }

  if (!policy.allowedCategories.includes(input.targetCategory)) {
    throw new ApiError(
      400,
      "INVALID_CATEGORY",
      `Category "${input.targetCategory}" is not enabled in your benefits policy`
    );
  }

  const quest = await Quest.create({
    companyId,
    slug: questSlugFromTitle(input.title),
    title: input.title.trim(),
    description: input.description.trim(),
    targetCategory: input.targetCategory,
    targetCount: input.targetCount,
    currentCount: 0,
    rewardXp: input.rewardXp ?? 100,
    status: "active",
    icon: input.icon?.trim() || undefined
  });

  return toQuestDTO(quest);
}

export async function incrementQuestProgress(companyId: string, category: string) {
  const quests = await Quest.find({
    companyId,
    status: "active",
    targetCategory: category
  });

  for (const quest of quests) {
    quest.currentCount += 1;
    if (quest.currentCount >= quest.targetCount) {
      quest.currentCount = quest.targetCount;
      quest.status = "completed";
    }
    await quest.save();
  }
}

export async function runStreakDangerNudges(companyId?: string) {
  const now = new Date();
  const day = now.getUTCDay();
  if (day !== 0) {
    return { nudged: 0 };
  }

  const currentWeek = isoWeekKey(now);
  const query: Record<string, unknown> = {
    streakWeeks: { $gte: 1 },
    lastRedeemWeek: { $ne: currentWeek }
  };
  if (companyId) query.companyId = companyId;

  const atRisk = await UserProgress.find(query).lean();
  let nudged = 0;

  for (const progress of atRisk) {
    const existing = await Notification.findOne({
      userId: progress.userId,
      type: "streak_danger",
      createdAt: { $gte: new Date(now.getTime() - 1000 * 60 * 60 * 20) }
    }).lean();
    if (existing) continue;

    const weeks = progress.streakWeeks ?? 0;
    await Notification.create({
      userId: progress.userId,
      type: "streak_danger",
      payload: {
        streakWeeks: weeks,
        message: `Your ${weeks}-week wellness streak is in danger! Grab a quick perk this week to save it.`,
        weekKey: currentWeek
      },
      read: false
    });
    nudged += 1;
  }

  return { nudged };
}

export async function seedDefaultQuests(companyId: mongoose.Types.ObjectId) {
  await Quest.create([
    {
      companyId,
      slug: "wellness-50",
      title: "Team wellness sprint",
      description: "Hit 50 verified wellness redemptions together this quarter.",
      targetCategory: "wellness",
      targetCount: 50,
      currentCount: 18,
      rewardXp: 200,
      status: "active",
      icon: "💪"
    },
    {
      companyId,
      slug: "food-25",
      title: "Lunch club",
      description: "Redeem 25 food perks as a company before the period ends.",
      targetCategory: "food",
      targetCount: 25,
      currentCount: 11,
      rewardXp: 150,
      status: "active",
      icon: "🍽️"
    }
  ]);
}
