import mongoose from "mongoose";
import { isDevelopment } from "../config/env.js";
import { ApiError } from "../http/ApiError.js";
import { Company } from "../models/Company.js";
import { LedgerEntry } from "../models/LedgerEntry.js";
import { Provider } from "../models/Provider.js";
import { Wallet } from "../models/Wallet.js";
import type { LedgerEntryDTO } from "../../contracts/api.js";

export async function getOrCreateWallet(
  ownerType: "company" | "provider",
  ownerId: string,
  currency: string
) {
  let wallet = await Wallet.findOne({ ownerType, ownerId, currency });
  if (!wallet) {
    wallet = await Wallet.create({ ownerType, ownerId, currency, balance: 0 });
  }
  return wallet;
}

async function reconcileWallet(walletId: mongoose.Types.ObjectId) {
  if (!isDevelopment) return;

  const wallet = await Wallet.findById(walletId);
  if (!wallet) return;

  const entries = await LedgerEntry.find({
    $or: [{ fromWalletId: walletId }, { toWalletId: walletId }]
  }).lean();

  let balance = 0;
  for (const entry of entries) {
    if (entry.toWalletId?.toString() === walletId.toString()) {
      balance += entry.amount;
    }
    if (entry.fromWalletId?.toString() === walletId.toString()) {
      balance -= entry.amount;
    }
  }

  if (balance !== wallet.balance) {
    console.warn(
      `[ledger] reconciliation mismatch wallet ${walletId}: stored=${wallet.balance} computed=${balance}`
    );
  }
}

async function writeEntry(input: {
  type: LedgerEntryDTO["type"];
  amount: number;
  currency: string;
  fromWalletId?: mongoose.Types.ObjectId;
  toWalletId?: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  packageLineId?: mongoose.Types.ObjectId;
  employeeAllowanceId?: mongoose.Types.ObjectId;
  meta?: Record<string, unknown>;
}) {
  const idempotencyKey = input.meta?.idempotencyKey as string | undefined;
  if (idempotencyKey) {
    const existing = await LedgerEntry.findOne({ "meta.idempotencyKey": idempotencyKey }).lean();
    if (existing) {
      return existing;
    }
  }

  const entry = await LedgerEntry.create({
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    fromWalletId: input.fromWalletId,
    toWalletId: input.toWalletId,
    packageId: input.packageId,
    packageLineId: input.packageLineId,
    employeeAllowanceId: input.employeeAllowanceId,
    meta: input.meta ?? {}
  });

  if (input.fromWalletId) {
    await Wallet.updateOne({ _id: input.fromWalletId }, { $inc: { balance: -input.amount } });
    await reconcileWallet(input.fromWalletId);
  }
  if (input.toWalletId) {
    await Wallet.updateOne({ _id: input.toWalletId }, { $inc: { balance: input.amount } });
    await reconcileWallet(input.toWalletId);
  }

  return entry;
}

export async function fundCompanyWallet(
  companyId: string,
  amount: number,
  currency: string,
  actorUserId?: string
) {
  const wallet = await getOrCreateWallet("company", companyId, currency);
  const entry = await writeEntry({
    type: "fund",
    amount,
    currency,
    toWalletId: wallet._id,
    meta: {
      companyId: new mongoose.Types.ObjectId(companyId),
      actorUserId: actorUserId ? new mongoose.Types.ObjectId(actorUserId) : undefined,
      idempotencyKey: `fund:${companyId}:${Date.now()}:${amount}`
    }
  });

  await Company.updateOne({ _id: companyId }, { $inc: { walletBalance: amount } });
  return entry;
}

export async function recordAllowanceHold(
  employeeAllowanceId: mongoose.Types.ObjectId,
  amount: number,
  currency: string,
  packageId: mongoose.Types.ObjectId
) {
  return writeEntry({
    type: "hold",
    amount,
    currency,
    employeeAllowanceId,
    packageId,
    meta: { idempotencyKey: `hold:${packageId.toString()}` }
  });
}

export async function releaseAllowanceHold(
  employeeAllowanceId: mongoose.Types.ObjectId,
  amount: number,
  currency: string,
  packageId: mongoose.Types.ObjectId,
  reason: string
) {
  return writeEntry({
    type: "refund",
    amount,
    currency,
    employeeAllowanceId,
    packageId,
    meta: {
      reason,
      idempotencyKey: `release-hold:${packageId.toString()}:${reason}`
    }
  });
}

export async function settlePackageLine(input: {
  employerCompanyId: string;
  providerId: string;
  amount: number;
  currency: string;
  packageId: mongoose.Types.ObjectId;
  packageLineId: mongoose.Types.ObjectId;
  actorUserId?: string;
}) {
  const provider = await Provider.findById(input.providerId).lean();
  if (!provider) {
    throw new ApiError(400, "PROVIDER_NOT_FOUND", "Provider not found for settlement");
  }

  const companyWallet = await getOrCreateWallet("company", input.employerCompanyId, input.currency);
  const providerWallet = await getOrCreateWallet(
    "provider",
    provider.companyId.toString(),
    input.currency
  );

  if (companyWallet.balance < input.amount) {
    throw new ApiError(400, "INSUFFICIENT_COMPANY_BALANCE", "Employer wallet cannot cover this package");
  }

  return writeEntry({
    type: "settle",
    amount: input.amount,
    currency: input.currency,
    fromWalletId: companyWallet._id,
    toWalletId: providerWallet._id,
    packageId: input.packageId,
    packageLineId: input.packageLineId,
    meta: {
      providerId: provider._id,
      companyId: new mongoose.Types.ObjectId(input.employerCompanyId),
      actorUserId: input.actorUserId
        ? new mongoose.Types.ObjectId(input.actorUserId)
        : undefined,
      idempotencyKey: `settle:${input.packageLineId.toString()}`
    }
  });
}

export async function settlePackage(
  packageId: string,
  employerCompanyId: string,
  lines: Array<{ _id: mongoose.Types.ObjectId; providerId: mongoose.Types.ObjectId; price: number }>,
  currency: string,
  actorUserId?: string
) {
  const entries: LedgerEntryDTO[] = [];
  const pkgOid = new mongoose.Types.ObjectId(packageId);

  for (const line of lines) {
    const entry = await settlePackageLine({
      employerCompanyId,
      providerId: line.providerId.toString(),
      amount: line.price,
      currency,
      packageId: pkgOid,
      packageLineId: line._id,
      actorUserId
    });

    const provider = await Provider.findById(line.providerId).select("name").lean();
    entries.push({
      type: "settle",
      amount: entry.amount,
      currency: entry.currency,
      providerName: provider?.name,
      createdAt: entry.createdAt.toISOString()
    });
  }

  const company = await Company.findById(employerCompanyId).lean();
  if (company) {
    const totalSettled = lines.reduce((sum, line) => sum + line.price, 0);
    await Company.updateOne(
      { _id: employerCompanyId },
      { $inc: { walletBalance: -totalSettled } }
    );
  }

  return entries;
}

export function toLedgerEntryDTO(
  entry: { type: LedgerEntryDTO["type"]; amount: number; currency: string; createdAt: Date },
  providerName?: string
): LedgerEntryDTO {
  return {
    type: entry.type,
    amount: entry.amount,
    currency: entry.currency,
    providerName,
    createdAt: entry.createdAt.toISOString()
  };
}
