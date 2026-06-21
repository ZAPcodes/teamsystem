import { ApiError } from "../http/ApiError.js";
import { Gift } from "../models/Gift.js";
import { Notification } from "../models/Notification.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { User } from "../models/User.js";
import type { GiftDTOSchema } from "../../contracts/api.js";
import { z } from "zod";

type GiftDTO = z.infer<typeof GiftDTOSchema>;

function toGiftDTO(gift: {
  _id: unknown;
  fromUserId: unknown;
  toUserId: unknown;
  offerId?: unknown;
  amount: number;
  currency: string;
  message: string;
  status: GiftDTO["status"];
  createdAt: Date;
  claimedAt?: Date;
  expiresAt?: Date;
}): GiftDTO {
  return {
    id: String(gift._id),
    fromUserId: String(gift.fromUserId),
    toUserId: String(gift.toUserId),
    offerId: gift.offerId ? String(gift.offerId) : undefined,
    amount: gift.amount,
    currency: gift.currency,
    message: gift.message,
    status: gift.status,
    createdAt: gift.createdAt.toISOString(),
    claimedAt: gift.claimedAt?.toISOString(),
    expiresAt: gift.expiresAt?.toISOString()
  };
}

export async function createGift(input: {
  fromUserId: string;
  companyId: string;
  toUserId: string;
  amount: number;
  currency: string;
  message: string;
  offerId?: string;
}) {
  const recipient = await User.findOne({
    _id: input.toUserId,
    companyId: input.companyId,
    roles: "employee"
  }).lean();
  if (!recipient) {
    throw new ApiError(400, "RECIPIENT_NOT_FOUND", "Colleague not found in your company");
  }

  const senderAllowance = await EmployeeAllowance.findOne({
    userId: input.fromUserId,
    companyId: input.companyId
  });
  if (!senderAllowance) {
    throw new ApiError(400, "ALLOWANCE_NOT_FOUND", "Your allowance was not found");
  }

  const available = senderAllowance.total - senderAllowance.used - senderAllowance.held;
  if (input.amount > available) {
    throw new ApiError(400, "INSUFFICIENT_ALLOWANCE", "Gift amount exceeds your available allowance");
  }

  senderAllowance.held += input.amount;
  await senderAllowance.save();

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const gift = await Gift.create({
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    offerId: input.offerId,
    amount: input.amount,
    currency: input.currency,
    message: input.message,
    status: "sent",
    expiresAt
  });

  await Notification.create({
    userId: input.toUserId,
    type: "gift",
    payload: { giftId: gift._id.toString(), amount: input.amount, message: input.message },
    read: false
  });

  return toGiftDTO(gift.toObject() as never);
}

export async function claimGift(giftId: string, userId: string) {
  const gift = await Gift.findById(giftId);
  if (!gift) {
    throw new ApiError(404, "GIFT_NOT_FOUND", "Gift not found");
  }
  if (gift.toUserId.toString() !== userId) {
    throw new ApiError(403, "FORBIDDEN", "This gift is not yours");
  }
  if (gift.status !== "sent") {
    throw new ApiError(400, "GIFT_NOT_CLAIMABLE", "Gift cannot be claimed");
  }

  const sender = await User.findById(gift.fromUserId).lean();
  if (!sender) {
    throw new ApiError(400, "SENDER_NOT_FOUND", "Gift sender not found");
  }

  const senderAllowance = await EmployeeAllowance.findOne({
    userId: gift.fromUserId,
    companyId: sender.companyId
  });
  const recipientAllowance = await EmployeeAllowance.findOne({
    userId: gift.toUserId,
    companyId: sender.companyId
  });

  if (!senderAllowance || !recipientAllowance) {
    throw new ApiError(400, "ALLOWANCE_NOT_FOUND", "Allowance records missing");
  }

  senderAllowance.held = Math.max(0, senderAllowance.held - gift.amount);
  senderAllowance.used += gift.amount;
  recipientAllowance.total += gift.amount;
  await senderAllowance.save();
  await recipientAllowance.save();

  gift.status = "claimed";
  gift.claimedAt = new Date();
  await gift.save();

  await Notification.create({
    userId: gift.fromUserId,
    type: "gift",
    payload: { giftId: gift._id.toString(), status: "claimed" },
    read: false
  });

  return toGiftDTO(gift.toObject() as never);
}

export { toGiftDTO };
