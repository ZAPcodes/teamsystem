import type { PackageDTO, VoucherDTO } from "../../contracts/api.js";

type PackageLike = {
  _id: unknown;
  employeeId: unknown;
  companyId: unknown;
  status: PackageDTO["status"];
  source: PackageDTO["source"];
  totalSnapshot: number;
  currency: string;
  aiReason?: string | null;
  createdAt: Date;
  submittedAt?: Date | null;
  decidedAt?: Date | null;
};

type UserLike = {
  name?: string;
};

type ProviderLike = {
  _id: unknown;
  name: string;
};

type OfferLike = {
  title: string;
};

type PackageLineLike = {
  _id: unknown;
  offerId: OfferLike & { _id: unknown };
  providerId: ProviderLike;
  price: number;
  currency: string;
  aiReason?: string | null;
};

type VoucherLike = {
  _id: unknown;
  packageLineId: unknown;
  code: string;
  qrPayload: string;
  status: VoucherDTO["status"];
  redeemedAt?: Date | null;
};

export function toVoucherDTO(voucher: VoucherLike): VoucherDTO {
  return {
    id: String(voucher._id),
    packageLineId: String(voucher.packageLineId),
    code: voucher.code,
    qrPayload: voucher.qrPayload,
    status: voucher.status,
    redeemedAt: voucher.redeemedAt?.toISOString()
  };
}

export function toPackageDTO(
  pkg: PackageLike & { employeeId?: unknown | (UserLike & { _id: unknown }) },
  lines: PackageLineLike[],
  options?: { currency?: string; vouchers?: VoucherLike[] }
): PackageDTO {
  const employeeObject = typeof pkg.employeeId === "object" && pkg.employeeId !== null
    ? pkg.employeeId as UserLike & { _id: unknown }
    : undefined;

  return {
    id: String(pkg._id),
    employeeId: employeeObject ? String(employeeObject._id) : String(pkg.employeeId),
    employeeName: employeeObject?.name,
    employerId: String(pkg.companyId),
    status: pkg.status,
    source: pkg.source,
    totalSnapshot: pkg.totalSnapshot,
    currency: options?.currency ?? pkg.currency,
    aiReason: pkg.aiReason ?? undefined,
    createdAt: pkg.createdAt.toISOString(),
    submittedAt: pkg.submittedAt?.toISOString(),
    decidedAt: pkg.decidedAt?.toISOString(),
    lines: lines.map((line) => ({
      id: String(line._id),
      offerId: String(line.offerId._id),
      providerId: String(line.providerId._id),
      providerName: line.providerId.name,
      title: line.offerId.title,
      price: line.price,
      currency: options?.currency ?? line.currency,
      aiReason: line.aiReason ?? undefined
    })),
    vouchers: options?.vouchers?.map(toVoucherDTO)
  };
}
