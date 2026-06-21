import { ApiError } from "../http/ApiError.js";
import mongoose from "mongoose";
import { ActivityFeedItem } from "../models/ActivityFeedItem.js";
import { Notification } from "../models/Notification.js";
import { Package } from "../models/Package.js";
import { PackageLine } from "../models/PackageLine.js";
import { Offer } from "../models/Offer.js";
import { User } from "../models/User.js";
import { getOrCreateProgress } from "./gamification.service.js";
import { awardXpDirect } from "./gamification.service.js";

export const HIGH_FIVE_XP = 5;

export async function sharePackageToFeed(input: {
  userId: string;
  companyId: string;
  packageId: string;
}) {
  const pkg = await Package.findById(input.packageId).lean();
  if (!pkg || pkg.employeeId.toString() !== input.userId) {
    return null;
  }

  const user = await User.findById(input.userId).select("name").lean();
  const lines = await PackageLine.find({ packageId: pkg._id }).lean();
  const offerIds = lines.map((l) => l.offerId);
  const offers = await Offer.find({ _id: { $in: offerIds } }).select("title").lean();
  const titleByOffer = new Map(offers.map((o) => [String(o._id), o.title]));
  const titles = lines.map((l) => titleByOffer.get(String(l.offerId)) ?? "a perk");
  const primary = titles[0] ?? "a new benefits package";
  const message =
    titles.length > 1
      ? `${user?.name ?? "Someone"} just booked ${titles.length} perks including ${primary}!`
      : `${user?.name ?? "Someone"} just booked ${primary}!`;

  const item = await ActivityFeedItem.create({
    companyId: input.companyId,
    userId: input.userId,
    userName: user?.name ?? "Employee",
    message,
    packageId: pkg._id,
    offerTitles: titles,
    highFiveCount: 0,
    highFivedBy: []
  });

  return {
    id: String(item._id),
    userId: input.userId,
    userName: item.userName,
    message: item.message,
    offerTitles: titles,
    highFiveCount: 0,
    highFivedByMe: false,
    createdAt: item.createdAt.toISOString()
  };
}

export async function getCompanyActivityFeed(companyId: string, viewerId: string) {
  const items = await ActivityFeedItem.find({ companyId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  return items.map((item) => ({
    id: String(item._id),
    userId: String(item.userId),
    userName: item.userName,
    message: item.message,
    offerTitles: item.offerTitles ?? [],
    highFiveCount: item.highFiveCount,
    highFivedByMe: item.highFivedBy?.some((id) => String(id) === viewerId) ?? false,
    createdAt: item.createdAt.toISOString()
  }));
}

export async function sendHighFive(input: {
  feedItemId: string;
  fromUserId: string;
  companyId: string;
}) {
  const item = await ActivityFeedItem.findById(input.feedItemId);
  if (!item || item.companyId.toString() !== input.companyId) {
    throw new ApiError(404, "FEED_NOT_FOUND", "Feed item not found");
  }

  if (item.userId.toString() === input.fromUserId) {
    throw new ApiError(400, "SELF_HIGH_FIVE", "You cannot high-five yourself");
  }

  const already = item.highFivedBy?.some((id) => String(id) === input.fromUserId);
  if (already) {
    throw new ApiError(400, "ALREADY_HIGH_FIVED", "Already sent a high-five");
  }

  item.highFivedBy = item.highFivedBy ?? [];
  item.highFivedBy.push(new mongoose.Types.ObjectId(input.fromUserId));
  item.highFiveCount += 1;
  await item.save();

  await awardXpDirect({
    userId: item.userId.toString(),
    companyId: input.companyId,
    amount: HIGH_FIVE_XP,
    reason: "high_five"
  });

  const fromUser = await User.findById(input.fromUserId).select("name").lean();

  await Notification.create({
    userId: item.userId,
    type: "high_five",
    payload: {
      fromName: fromUser?.name ?? "A colleague",
      xpAwarded: HIGH_FIVE_XP,
      feedItemId: String(item._id)
    },
    read: false
  });

  return {
    highFiveCount: item.highFiveCount,
    xpAwarded: HIGH_FIVE_XP
  };
}
