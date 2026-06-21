import { nanoid } from "nanoid";
import type { PooledCartSchema } from "../../contracts/api.js";
import { z } from "zod";
import { ApiError } from "../http/ApiError.js";
import { Company } from "../models/Company.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Notification } from "../models/Notification.js";
import { Offer } from "../models/Offer.js";
import { Package } from "../models/Package.js";
import { PackageLine } from "../models/PackageLine.js";
import { PooledCart } from "../models/PooledCart.js";
import { User } from "../models/User.js";
import { Voucher } from "../models/Voucher.js";
import { toVoucherDTO } from "../mappers/package.mapper.js";
import { settlePackage } from "./ledger.service.js";

type PooledCartDTO = z.infer<typeof PooledCartSchema>;

function invitePath(code: string) {
  return `/marketplace/pool/${code}`;
}

function progressPercent(committed: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((committed / target) * 100));
}

async function holdAllowance(userId: string, companyId: string, amount: number) {
  const allowance = await EmployeeAllowance.findOne({ userId, companyId });
  if (!allowance) {
    throw new ApiError(400, "ALLOWANCE_NOT_FOUND", "Allowance not found");
  }
  const available = allowance.total - allowance.used - allowance.held;
  if (amount > available) {
    throw new ApiError(400, "INSUFFICIENT_ALLOWANCE", "Not enough wallet balance for this commitment");
  }
  allowance.held += amount;
  await allowance.save();
  return allowance;
}

async function releaseHold(userId: string, companyId: string, amount: number) {
  const allowance = await EmployeeAllowance.findOne({ userId, companyId });
  if (!allowance) return;
  allowance.held = Math.max(0, allowance.held - amount);
  await allowance.save();
}

async function finalizeHold(userId: string, companyId: string, amount: number) {
  const allowance = await EmployeeAllowance.findOne({ userId, companyId });
  if (!allowance) {
    throw new ApiError(400, "ALLOWANCE_NOT_FOUND", "Allowance not found");
  }
  allowance.held = Math.max(0, allowance.held - amount);
  allowance.used += amount;
  await allowance.save();
}

function toPooledCartDTO(
  cart: {
    _id: unknown;
    initiatorId: unknown;
    offerId: unknown;
    inviteCode: string;
    status: PooledCartDTO["status"];
    offerTitle: string;
    providerName: string;
    targetPrice: number;
    suggestedContribution: number;
    committedTotal: number;
    currency: string;
    contributions: PooledCartDTO["contributions"];
    lockedAt?: Date;
    createdAt: Date;
  },
  context: {
    initiatorName: string;
    viewerId?: string;
    voucher?: PooledCartDTO["voucher"];
  }
): PooledCartDTO {
  const remaining = Math.max(0, cart.targetPrice - cart.committedTotal);
  const viewerContribution = cart.contributions.find((c) => c.userId === context.viewerId);

  return {
    id: String(cart._id),
    inviteCode: cart.inviteCode,
    invitePath: invitePath(cart.inviteCode),
    status: cart.status,
    offerId: String(cart.offerId),
    offerTitle: cart.offerTitle,
    providerName: cart.providerName,
    targetPrice: cart.targetPrice,
    suggestedContribution: cart.suggestedContribution,
    committedTotal: cart.committedTotal,
    remainingAmount: remaining,
    progressPercent: progressPercent(cart.committedTotal, cart.targetPrice),
    currency: cart.currency,
    contributions: cart.contributions.map((c) => ({
      userId: String(c.userId),
      userName: c.userName,
      userInitials: c.userInitials,
      amount: c.amount,
      committedAt: new Date(c.committedAt).toISOString()
    })),
    initiatorId: String(cart.initiatorId),
    initiatorName: context.initiatorName,
    isInitiator: context.viewerId === String(cart.initiatorId),
    currentUserContribution: viewerContribution?.amount,
    hasCommitted: Boolean(viewerContribution),
    voucher: context.voucher,
    lockedAt: cart.lockedAt?.toISOString(),
    createdAt: cart.createdAt.toISOString()
  };
}

async function loadCartDTO(cartId: string, viewerId?: string): Promise<PooledCartDTO> {
  const cart = await PooledCart.findById(cartId).lean();
  if (!cart) {
    throw new ApiError(404, "POOLED_CART_NOT_FOUND", "Team pool not found");
  }

  const initiator = await User.findById(cart.initiatorId).select("name").lean();
  let voucher: PooledCartDTO["voucher"];
  if (cart.voucherId) {
    const v = await Voucher.findById(cart.voucherId).lean();
    if (v) {
      const dto = toVoucherDTO(v as never);
      voucher = { code: dto.code, qrPayload: dto.qrPayload, status: dto.status };
    }
  }

  return toPooledCartDTO(cart as never, {
    initiatorName: initiator?.name ?? "Teammate",
    viewerId,
    voucher
  });
}

async function lockPooledCart(cartId: string) {
  const cart = await PooledCart.findById(cartId);
  if (!cart || cart.status !== "pending") return null;
  if (cart.committedTotal < cart.targetPrice) return null;

  const company = await Company.findById(cart.companyId).lean();
  if (!company || company.walletBalance < cart.targetPrice) {
    throw new ApiError(400, "COMPANY_WALLET_LOW", "Employer wallet cannot settle this group pool right now");
  }

  for (const contribution of cart.contributions) {
    await finalizeHold(contribution.userId.toString(), cart.companyId.toString(), contribution.amount);
  }

  const pkg = await Package.create({
    employeeId: cart.initiatorId,
    companyId: cart.companyId,
    status: "settled",
    source: "pooled",
    totalSnapshot: cart.targetPrice,
    currency: cart.currency,
    submittedAt: new Date(),
    decidedAt: new Date()
  });

  const line = await PackageLine.create({
    packageId: pkg._id,
    offerId: cart.offerId,
    providerId: cart.providerId,
    price: cart.targetPrice,
    currency: cart.currency
  });

  const code = `POOL-${nanoid(8).toUpperCase()}`;
  const voucher = await Voucher.create({
    packageLineId: line._id,
    code,
    qrPayload: `perx://redeem/${code}`,
    status: "issued"
  });

  await settlePackage(
    pkg._id.toString(),
    cart.companyId.toString(),
    [{ _id: line._id, providerId: line.providerId, price: line.price }] as never,
    cart.currency
  );

  cart.status = "locked";
  cart.packageId = pkg._id;
  cart.voucherId = voucher._id;
  cart.lockedAt = new Date();
  await cart.save();

  const contributorIds = [...new Set(cart.contributions.map((c) => c.userId.toString()))];
  await Promise.all(
    contributorIds.map((userId) =>
      Notification.create({
        userId,
        type: "pooled_cart",
        payload: {
          event: "locked",
          cartId: cart._id.toString(),
          offerTitle: cart.offerTitle,
          providerName: cart.providerName,
          voucherCode: code,
          inviteCode: cart.inviteCode
        },
        read: false
      })
    )
  );

  return loadCartDTO(cart._id.toString());
}

export async function createPooledCart(input: {
  userId: string;
  companyId: string;
  offerId: string;
  initialCommit: number;
}) {
  const [user, offer, policy] = await Promise.all([
    User.findById(input.userId).select("name initials companyId").lean(),
    Offer.findById(input.offerId).populate("providerId").lean(),
    EmployerPolicy.findOne({ companyId: input.companyId }).lean()
  ]);

  if (!user || user.companyId.toString() !== input.companyId) {
    throw new ApiError(403, "FORBIDDEN", "Not allowed to create a team pool");
  }
  if (!offer || !offer.isActive) {
    throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
  }
  if (!policy || !policy.allowedCategories.includes(offer.category)) {
    throw new ApiError(400, "CATEGORY_NOT_ALLOWED", "This perk is not in your employer policy");
  }

  const provider = offer.providerId as unknown as { _id: { toString(): string }; name: string };
  const suggestedContribution = Math.max(500, Math.ceil(offer.price / 4));
  if (input.initialCommit > offer.price) {
    throw new ApiError(400, "COMMIT_TOO_HIGH", "Initial commit cannot exceed the package price");
  }

  await holdAllowance(input.userId, input.companyId, input.initialCommit);

  const inviteCode = nanoid(10).toLowerCase();
  const cart = await PooledCart.create({
    initiatorId: input.userId,
    companyId: input.companyId,
    offerId: offer._id,
    providerId: provider._id.toString(),
    offerTitle: offer.title,
    providerName: provider.name,
    targetPrice: offer.price,
    suggestedContribution,
    currency: offer.currency,
    status: "pending",
    inviteCode,
    committedTotal: input.initialCommit,
    contributions: [
      {
        userId: input.userId,
        userName: user.name,
        userInitials: user.initials,
        amount: input.initialCommit,
        committedAt: new Date()
      }
    ]
  });

  return loadCartDTO(cart._id.toString(), input.userId);
}

export async function getPooledCartByInvite(inviteCode: string, viewerId?: string, companyId?: string) {
  const cart = await PooledCart.findOne({ inviteCode: inviteCode.toLowerCase() }).lean();
  if (!cart) {
    throw new ApiError(404, "POOLED_CART_NOT_FOUND", "Team pool not found");
  }
  if (companyId && cart.companyId.toString() !== companyId) {
    throw new ApiError(403, "FORBIDDEN", "This team pool belongs to another company");
  }

  return loadCartDTO(String(cart._id), viewerId);
}

export async function commitToPooledCart(input: {
  inviteCode: string;
  userId: string;
  companyId: string;
  amount: number;
}) {
  const cart = await PooledCart.findOne({ inviteCode: input.inviteCode.toLowerCase() });
  if (!cart) {
    throw new ApiError(404, "POOLED_CART_NOT_FOUND", "Team pool not found");
  }
  if (cart.companyId.toString() !== input.companyId) {
    throw new ApiError(403, "FORBIDDEN", "This team pool belongs to another company");
  }
  if (cart.status !== "pending") {
    throw new ApiError(400, "POOL_NOT_OPEN", "This team pool is no longer accepting commits");
  }

  const existing = cart.contributions.find((c) => c.userId.toString() === input.userId);
  if (existing) {
    throw new ApiError(400, "ALREADY_COMMITTED", "You already committed to this team pool");
  }

  const user = await User.findById(input.userId).select("name initials").lean();
  if (!user) {
    throw new ApiError(400, "USER_NOT_FOUND", "User not found");
  }

  const remaining = cart.targetPrice - cart.committedTotal;
  if (input.amount > remaining) {
    throw new ApiError(400, "COMMIT_TOO_HIGH", `Only ${remaining} ALL is still needed for this pool`);
  }

  await holdAllowance(input.userId, input.companyId, input.amount);

  cart.contributions.push({
    userId: input.userId as never,
    userName: user.name,
    userInitials: user.initials,
    amount: input.amount,
    committedAt: new Date()
  });
  cart.committedTotal += input.amount;
  await cart.save();

  if (cart.committedTotal >= cart.targetPrice) {
    return (await lockPooledCart(cart._id.toString()))!;
  }

  await Notification.create({
    userId: cart.initiatorId,
    type: "pooled_cart",
    payload: {
      event: "commit",
      cartId: cart._id.toString(),
      fromName: user.name,
      amount: input.amount,
      committedTotal: cart.committedTotal,
      targetPrice: cart.targetPrice,
      inviteCode: cart.inviteCode
    },
    read: false
  });

  return loadCartDTO(cart._id.toString(), input.userId);
}

export async function cancelPooledCart(cartId: string, userId: string) {
  const cart = await PooledCart.findById(cartId);
  if (!cart) {
    throw new ApiError(404, "POOLED_CART_NOT_FOUND", "Team pool not found");
  }
  if (cart.initiatorId.toString() !== userId) {
    throw new ApiError(403, "FORBIDDEN", "Only the pool initiator can cancel");
  }
  if (cart.status !== "pending") {
    throw new ApiError(400, "POOL_NOT_CANCELLABLE", "Only pending pools can be cancelled");
  }

  for (const contribution of cart.contributions) {
    await releaseHold(contribution.userId.toString(), cart.companyId.toString(), contribution.amount);
  }

  cart.status = "cancelled";
  await cart.save();

  return loadCartDTO(cart._id.toString(), userId);
}

export function isPoolEligibleOffer(price: number) {
  return price >= 6000;
}
