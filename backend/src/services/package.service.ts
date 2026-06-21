import { nanoid } from "nanoid";
import { ApiError } from "../http/ApiError.js";
import { Company } from "../models/Company.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Notification } from "../models/Notification.js";
import { Offer } from "../models/Offer.js";
import { Package } from "../models/Package.js";
import { PackageLine } from "../models/PackageLine.js";
import { SelectionEvent } from "../models/SelectionEvent.js";
import { Voucher } from "../models/Voucher.js";
import type { LedgerEntryDTO, PackageDTO, VoucherDTO } from "../../contracts/api.js";
import { toPackageDTO, toVoucherDTO } from "../mappers/package.mapper.js";
import {
  fundCompanyWallet,
  recordAllowanceHold,
  releaseAllowanceHold,
  settlePackage
} from "./ledger.service.js";
import { evaluateClaimCompliance } from "./compliance.service.js";

function elapsed(start: number) {
  return `${Math.round(performance.now() - start)}ms`;
}

async function policyCurrency(companyId: unknown, fallback: string) {
  const policy = await EmployerPolicy.findOne({ companyId: String(companyId) }).select("currency").lean();
  return policy?.currency ?? fallback;
}

async function packagePrimaryCategory(packageId: string): Promise<string> {
  const line = await PackageLine.findOne({ packageId }).populate("offerId").lean();
  const offer = line?.offerId as unknown as { category?: string } | undefined;
  return offer?.category ?? "mixed";
}

async function logSelectionEvent(input: {
  selectionId: unknown;
  employeeId: unknown;
  employerId: unknown;
  amount: number;
  currency: string;
  category?: string;
  approvalType: "manual" | "auto";
  status: "created" | "pending" | "approved" | "rejected" | "redeemed";
}) {
  await SelectionEvent.create({
    selectionId: String(input.selectionId),
    employeeId: String(input.employeeId),
    employerId: String(input.employerId),
    amount: input.amount,
    currency: input.currency,
    category: input.category ?? await packagePrimaryCategory(String(input.selectionId)),
    approvalType: input.approvalType,
    status: input.status,
    timestamp: new Date()
  });
}

export async function loadPackageDTO(packageId: string): Promise<PackageDTO> {
  const pkg = await Package.findById(packageId).populate("employeeId").lean();
  if (!pkg) {
    throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found");
  }

  const lines = await PackageLine.find({ packageId })
    .populate("offerId")
    .populate("providerId")
    .lean();

  const vouchers = ["approved", "settled", "partially_redeemed", "redeemed"].includes(pkg.status)
    ? await Voucher.find({ packageLineId: { $in: lines.map((line) => line._id) } }).lean()
    : [];
  const currency = await policyCurrency(pkg.companyId, pkg.currency);

  return toPackageDTO(pkg as never, lines as never, {
    currency,
    vouchers: vouchers as never
  });
}

export async function loadEmployeePackages(employeeId: string): Promise<PackageDTO[]> {
  const packages = await Package.find({ employeeId })
    .populate("employeeId")
    .sort({ createdAt: -1 })
    .lean();

  return loadPackagesDTO(packages as never);
}

type PackageLean = {
  _id: unknown;
  companyId: unknown;
  currency: string;
  status: PackageDTO["status"];
};

export async function loadPackagesDTO(packages: PackageLean[]): Promise<PackageDTO[]> {
  if (packages.length === 0) return [];

  const packageIds = packages.map((pkg) => String(pkg._id));
  const companyIds = [...new Set(packages.map((pkg) => String(pkg.companyId)))];
  const lines = await PackageLine.find({ packageId: { $in: packageIds } })
    .populate("offerId")
    .populate("providerId")
    .lean();
  const policyByCompanyId = new Map(
    (await EmployerPolicy.find({ companyId: { $in: companyIds } }).select("companyId currency").lean())
      .map((policy) => [policy.companyId.toString(), policy.currency])
  );
  const approvedLineIds = lines
    .filter((line) => {
      const pkg = packages.find((candidate) => String(candidate._id) === String(line.packageId));
      return pkg && ["approved", "settled", "partially_redeemed", "redeemed"].includes(pkg.status);
    })
    .map((line) => line._id);
  const vouchers = approvedLineIds.length > 0
    ? await Voucher.find({ packageLineId: { $in: approvedLineIds } }).lean()
    : [];
  const vouchersByPackageId = new Map<string, typeof vouchers>();

  for (const voucher of vouchers) {
    const line = lines.find((candidate) => String(candidate._id) === String(voucher.packageLineId));
    if (!line) continue;
    const packageId = String(line.packageId);
    vouchersByPackageId.set(packageId, [...(vouchersByPackageId.get(packageId) ?? []), voucher]);
  }

  return packages.map((pkg) => {
    const packageId = String(pkg._id);
    return toPackageDTO(pkg as never, lines.filter((line) => String(line.packageId) === packageId) as never, {
      currency: policyByCompanyId.get(String(pkg.companyId)) ?? pkg.currency,
      vouchers: vouchersByPackageId.get(packageId) as never
    });
  });
}

export async function createDraftPackage(
  employeeId: string,
  employerId: string,
  offerIds: string[],
  source: "manual" | "ai" = "manual",
  aiReason?: string
) {
  const offers = await Offer.find({
    _id: { $in: offerIds },
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  }).lean();

  if (offers.length !== offerIds.length) {
    throw new ApiError(400, "OFFER_NOT_FOUND", "One or more offers are unavailable");
  }

  const policy = await EmployerPolicy.findOne({ companyId: employerId }).lean();
  if (!policy) {
    throw new ApiError(404, "POLICY_NOT_FOUND", "Employer policy not found");
  }

  const disallowed = offers.find((offer) => !policy.allowedCategories.includes(offer.category));
  if (disallowed) {
    throw new ApiError(400, "CATEGORY_NOT_ALLOWED", `${disallowed.category} is not allowed by your employer policy`);
  }

  const total = offers.reduce((sum, offer) => sum + offer.price, 0);
  const pkg = await Package.create({
    employeeId,
    companyId: employerId,
    status: "draft",
    source,
    totalSnapshot: total,
    currency: policy.currency,
    aiReason: aiReason ?? undefined
  });

  await PackageLine.create(offers.map((offer) => ({
    packageId: pkg._id,
    offerId: offer._id,
    providerId: offer.providerId,
    price: offer.price,
    currency: policy.currency
  })));

  await logSelectionEvent({
    selectionId: pkg._id,
    employeeId,
    employerId,
    amount: total,
    currency: policy.currency,
    category: offers[0]?.category ?? "mixed",
    approvalType: "manual",
    status: "created"
  });

  return loadPackageDTO(pkg._id.toString());
}

async function assertOffersCompliance(employeeId: string, companyId: string, offerIds: string[]) {
  for (const offerId of offerIds) {
    const result = await evaluateClaimCompliance({ userId: employeeId, companyId, offerId });
    if (!result.allowed) {
      throw new ApiError(
        403,
        "COMPLIANCE_BLOCKED",
        result.message ?? "This perk requires company verification before you can claim it."
      );
    }
  }
}

async function issueVouchers(packageId: string): Promise<VoucherDTO[]> {
  const lines = await PackageLine.find({ packageId }).lean();
  const existing = await Voucher.find({ packageLineId: { $in: lines.map((line) => line._id) } }).lean();
  if (existing.length > 0) {
    return existing.map((voucher) => toVoucherDTO(voucher as never));
  }

  const vouchers = await Voucher.insertMany(lines.map((line) => {
    const code = `PERX-${nanoid(8).toUpperCase()}`;
    return {
      packageLineId: line._id,
      code,
      qrPayload: `perx://redeem/${code}`,
      status: "issued"
    };
  }));

  return vouchers.map((voucher) => toVoucherDTO(voucher.toObject() as never));
}

export async function approvePackage(
  packageId: string,
  actorUserId?: string,
  approvalType: "manual" | "auto" = "manual"
): Promise<{ package: PackageDTO; vouchers: VoucherDTO[]; ledgerEntries: LedgerEntryDTO[] }> {
  const started = performance.now();
  const pkg = await Package.findById(packageId);
  console.log(`[approval:${packageId}] load package ${elapsed(started)}`);
  if (!pkg) {
    throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found");
  }

  if (!["pending", "draft"].includes(pkg.status)) {
    throw new ApiError(400, "PACKAGE_NOT_PENDING", "Package is not pending approval");
  }

  const allowance = await EmployeeAllowance.findOne({
    userId: pkg.employeeId,
    companyId: pkg.companyId
  });
  console.log(`[approval:${packageId}] load allowance ${elapsed(started)}`);

  if (allowance) {
    if (pkg.status === "pending") {
      allowance.held = Math.max(0, allowance.held - pkg.totalSnapshot);
    }
    allowance.used += pkg.totalSnapshot;
    await allowance.save();
  }
  console.log(`[approval:${packageId}] update allowance ${elapsed(started)}`);

  pkg.status = "approved";
  pkg.decidedAt = new Date();
  if (actorUserId) {
    pkg.approvedBy = actorUserId as never;
  }
  await pkg.save();
  console.log(`[approval:${packageId}] save package ${elapsed(started)}`);

  const vouchers = await issueVouchers(pkg._id.toString());
  console.log(`[approval:${packageId}] issue vouchers ${elapsed(started)}`);

  const lines = await PackageLine.find({ packageId: pkg._id }).lean();
  const currency = await policyCurrency(pkg.companyId, pkg.currency);
  const ledgerEntries = await settlePackage(
    pkg._id.toString(),
    pkg.companyId.toString(),
    lines as never,
    currency,
    actorUserId
  );

  pkg.status = "settled";
  await pkg.save();

  await logSelectionEvent({
    selectionId: pkg._id,
    employeeId: pkg.employeeId,
    employerId: pkg.companyId,
    amount: pkg.totalSnapshot,
    currency,
    approvalType,
    status: "approved"
  });
  await Notification.create({
    userId: pkg.employeeId,
    type: "voucher",
    payload: { packageId: pkg._id.toString(), status: "settled" },
    read: false
  });

  return {
    package: await loadPackageDTO(pkg._id.toString()),
    vouchers,
    ledgerEntries
  };
}

export async function submitPackage(
  packageId: string,
  employeeId: string,
  options?: { shareToFeed?: boolean }
) {
  const started = performance.now();
  const pkg = await Package.findById(packageId);
  console.log(`[submit:${packageId}] load package ${elapsed(started)}`);
  if (!pkg || pkg.employeeId.toString() !== employeeId) {
    throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found");
  }

  if (pkg.status !== "draft") {
    throw new ApiError(400, "PACKAGE_NOT_SUBMITTABLE", "Only draft packages can be submitted");
  }

  const [policy, allowance, company] = await Promise.all([
    EmployerPolicy.findOne({ companyId: pkg.companyId }).lean(),
    EmployeeAllowance.findOne({ userId: pkg.employeeId, companyId: pkg.companyId }),
    Company.findById(pkg.companyId).lean()
  ]);
  console.log(`[submit:${packageId}] load policy/allowance/company ${elapsed(started)}`);

  if (!policy || !allowance || !company) {
    throw new ApiError(400, "PACKAGE_NOT_SUBMITTABLE", "Employer policy or allowance is missing");
  }

  const available = allowance.total - allowance.used - allowance.held;
  if (pkg.totalSnapshot > available) {
    throw new ApiError(400, "INSUFFICIENT_ALLOWANCE", "Package total exceeds available allowance");
  }

  if (company.walletBalance < pkg.totalSnapshot) {
    throw new ApiError(400, "INSUFFICIENT_COMPANY_BALANCE", "Your employer has not funded enough wallet balance for this package");
  }

  const lines = await PackageLine.find({ packageId: pkg._id }).lean();
  await assertOffersCompliance(employeeId, pkg.companyId.toString(), lines.map((line) => line.offerId.toString()));

  const approved = await approvePackage(pkg._id.toString(), undefined, "auto");
  console.log(`[submit:${packageId}] auto-approved total ${elapsed(started)}`);
  if (options?.shareToFeed) {
    const { sharePackageToFeed } = await import("./activity.service.js");
    await sharePackageToFeed({
      userId: employeeId,
      companyId: pkg.companyId.toString(),
      packageId: pkg._id.toString()
    });
  }
  return { ...approved, autoApproved: true };
}
