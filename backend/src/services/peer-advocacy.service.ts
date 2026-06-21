import mongoose from "mongoose";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { ApiError } from "../http/ApiError.js";

const CATEGORY_WALLET_LABEL: Record<string, string> = {
  food: "Food Wallet",
  wellness: "Wellness Wallet",
  travel: "Travel Wallet",
  learning: "Learning Wallet",
  lifestyle: "Lifestyle Wallet"
};

export interface PeerAdvocacyColleague {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  departmentId?: string;
  walletAvailable: number;
  reason: string;
}

export interface PeerAdvocacyPromptDTO {
  id: string;
  vendorName: string;
  offerTitle: string;
  category: string;
  categoryWalletLabel: string;
  colleagues: PeerAdvocacyColleague[];
  createdAt: string;
}

function categoryWalletLabel(category: string) {
  return CATEGORY_WALLET_LABEL[category] ?? "Benefits Wallet";
}

export async function suggestPeerAdvocacyColleagues(
  actorUserId: string,
  companyId: string,
  category: string,
  limit = 3
): Promise<PeerAdvocacyColleague[]> {
  const actor = await User.findById(actorUserId).select("departmentId").lean();

  const colleagues = await User.find({
    companyId,
    roles: "employee",
    _id: { $ne: actorUserId }
  })
    .select("name email initials avatarUrl departmentId preferences")
    .lean();

  if (colleagues.length === 0) return [];

  const allowances = await EmployeeAllowance.find({
    companyId,
    userId: { $in: colleagues.map((c) => c._id) }
  }).lean();

  const allowanceByUser = new Map(
    allowances.map((a) => [a.userId.toString(), a.total - a.used - a.held])
  );

  const scored = colleagues.map((colleague) => {
    const walletAvailable = Math.max(0, allowanceByUser.get(colleague._id.toString()) ?? 0);
    const sameDepartment =
      Boolean(actor?.departmentId) && colleague.departmentId === actor?.departmentId;
    const categoryMatch = colleague.preferences?.includes(category) ?? false;
    const highCategoryBalance = walletAvailable >= 3000;

    let score = 0;
    let reason = "Might like this perk";

    if (sameDepartment) {
      score += 4;
      reason = "Same department";
    }
    if (categoryMatch && highCategoryBalance) {
      score += 3;
      reason = sameDepartment ? "Same team · strong wallet" : `High ${categoryWalletLabel(category)} balance`;
    } else if (categoryMatch) {
      score += 2;
      reason = sameDepartment ? "Same team · food perks" : `Uses ${category} perks`;
    } else if (highCategoryBalance) {
      score += 1;
      reason = "Plenty of allowance left";
    }

    return {
      id: colleague._id.toString(),
      name: colleague.name,
      email: colleague.email,
      initials: colleague.initials,
      avatarUrl: colleague.avatarUrl ?? undefined,
      departmentId: colleague.departmentId ?? undefined,
      walletAvailable,
      reason,
      score
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || b.walletAvailable - a.walletAvailable)
    .slice(0, limit)
    .map(({ score: _score, ...row }) => row);
}

export async function createPeerAdvocacyPrompt(input: {
  userId: string;
  companyId: string;
  vendorName: string;
  offerTitle: string;
  category: string;
  voucherCode?: string;
}) {
  const colleagues = await suggestPeerAdvocacyColleagues(input.userId, input.companyId, input.category);
  if (colleagues.length === 0) return null;

  const notification = await Notification.create({
    userId: input.userId,
    type: "peer_advocacy",
    payload: {
      status: "pending",
      vendorName: input.vendorName,
      offerTitle: input.offerTitle,
      category: input.category,
      categoryWalletLabel: categoryWalletLabel(input.category),
      voucherCode: input.voucherCode,
      colleagues
    },
    read: false
  });

  return {
    id: notification._id.toString(),
    vendorName: input.vendorName,
    offerTitle: input.offerTitle,
    category: input.category,
    categoryWalletLabel: categoryWalletLabel(input.category),
    colleagues,
    createdAt: notification.createdAt.toISOString()
  } satisfies PeerAdvocacyPromptDTO;
}

export async function getPendingPeerAdvocacy(userId: string): Promise<PeerAdvocacyPromptDTO | null> {
  const pending = await Notification.findOne({
    userId,
    type: "peer_advocacy",
    "payload.status": "pending"
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!pending) return null;

  const payload = pending.payload as {
    vendorName: string;
    offerTitle: string;
    category: string;
    categoryWalletLabel: string;
    colleagues: PeerAdvocacyColleague[];
  };

  return {
    id: pending._id.toString(),
    vendorName: payload.vendorName,
    offerTitle: payload.offerTitle,
    category: payload.category,
    categoryWalletLabel: payload.categoryWalletLabel,
    colleagues: payload.colleagues ?? [],
    createdAt: pending.createdAt.toISOString()
  };
}

export async function sendPeerAdvocacy(input: {
  actorUserId: string;
  advocacyId: string;
  toUserId: string;
}) {
  const advocacy = await Notification.findOne({
    _id: input.advocacyId,
    userId: input.actorUserId,
    type: "peer_advocacy",
    "payload.status": "pending"
  });

  if (!advocacy) {
    throw new ApiError(404, "ADVOCACY_NOT_FOUND", "Peer advocacy prompt not found");
  }

  const payload = advocacy.payload as {
    vendorName: string;
    offerTitle: string;
    category: string;
    categoryWalletLabel: string;
    colleagues: PeerAdvocacyColleague[];
  };

  const target = payload.colleagues.find((c) => c.id === input.toUserId);
  if (!target) {
    throw new ApiError(400, "COLLEAGUE_NOT_SUGGESTED", "Colleague is not in the suggestion graph");
  }

  const actor = await User.findById(input.actorUserId).select("name companyId").lean();
  if (!actor) {
    throw new ApiError(400, "USER_NOT_FOUND", "User not found");
  }

  const recipientMessage = `${actor.name} just recommended ${payload.offerTitle} at ${payload.vendorName}. You have enough in your ${payload.categoryWalletLabel} to try it.`;

  await Notification.create({
    userId: new mongoose.Types.ObjectId(input.toUserId),
    type: "peer_recommendation",
    payload: {
      fromUserId: input.actorUserId,
      fromName: actor.name,
      vendorName: payload.vendorName,
      offerTitle: payload.offerTitle,
      category: payload.category,
      categoryWalletLabel: payload.categoryWalletLabel,
      walletAvailable: target.walletAvailable,
      message: recipientMessage
    },
    read: false
  });

  advocacy.payload = { ...payload, status: "sent", sentToUserId: input.toUserId };
  advocacy.read = true;
  await advocacy.save();

  return {
    ok: true,
    recipientName: target.name,
    message: recipientMessage
  };
}

export async function dismissPeerAdvocacy(userId: string, advocacyId: string) {
  const advocacy = await Notification.findOne({
    _id: advocacyId,
    userId,
    type: "peer_advocacy",
    "payload.status": "pending"
  });

  if (!advocacy) {
    throw new ApiError(404, "ADVOCACY_NOT_FOUND", "Peer advocacy prompt not found");
  }

  advocacy.payload = { ...(advocacy.payload as object), status: "dismissed" };
  advocacy.read = true;
  await advocacy.save();

  return { ok: true };
}

export async function createDemoPeerAdvocacy(userId: string, companyId: string) {
  return createPeerAdvocacyPrompt({
    userId,
    companyId,
    vendorName: "EatWell Bistro",
    offerTitle: "Salad Combo",
    category: "food",
    voucherCode: "DEMO-ADVOCACY"
  });
}
