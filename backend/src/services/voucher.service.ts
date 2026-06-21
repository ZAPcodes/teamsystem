import { ApiError } from "../http/ApiError.js";
import { Notification } from "../models/Notification.js";
import { Offer } from "../models/Offer.js";
import { Package } from "../models/Package.js";
import { PackageLine } from "../models/PackageLine.js";
import { Provider } from "../models/Provider.js";
import { SelectionEvent } from "../models/SelectionEvent.js";
import { Voucher } from "../models/Voucher.js";
import { toVoucherDTO } from "../mappers/package.mapper.js";
import { awardXpOnRedeem } from "./gamification.service.js";
import { createPeerAdvocacyPrompt } from "./peer-advocacy.service.js";
import type { GamificationAwardDTO, VoucherDTO } from "../../contracts/api.js";

export async function redeemVoucher(
  code: string,
  providerCompanyId: string
): Promise<{ voucher: VoucherDTO; gamification?: GamificationAwardDTO }> {
  const normalized = code.trim().toUpperCase();
  const voucher = await Voucher.findOne({ code: normalized });
  if (!voucher) {
    throw new ApiError(404, "VOUCHER_NOT_FOUND", "Voucher code not found");
  }

  if (voucher.status === "redeemed") {
    throw new ApiError(400, "VOUCHER_ALREADY_REDEEMED", "This voucher has already been redeemed");
  }

  if (voucher.status !== "issued") {
    throw new ApiError(400, "VOUCHER_NOT_VALID", "This voucher cannot be redeemed");
  }

  const line = await PackageLine.findById(voucher.packageLineId).lean();
  if (!line) {
    throw new ApiError(400, "PACKAGE_LINE_NOT_FOUND", "Package line not found for voucher");
  }

  const provider = await Provider.findById(line.providerId).lean();
  if (!provider || provider.companyId.toString() !== providerCompanyId) {
    throw new ApiError(403, "FORBIDDEN", "This voucher belongs to another provider");
  }

  const offer = await Offer.findById(line.offerId).select("category title").lean();
  const category = offer?.category ?? "lifestyle";
  const offerTitle = offer?.title ?? "Perk";

  voucher.status = "redeemed";
  voucher.redeemedAt = new Date();
  await voucher.save();

  let gamification: GamificationAwardDTO | undefined;

  const pkg = await Package.findById(line.packageId);
  if (pkg) {
    const allLines = await PackageLine.find({ packageId: pkg._id }).lean();
    const vouchers = await Voucher.find({ packageLineId: { $in: allLines.map((l) => l._id) } }).lean();
    const redeemedCount = vouchers.filter((v) => v.status === "redeemed").length;
    if (redeemedCount === vouchers.length) {
      pkg.status = "redeemed";
    } else if (redeemedCount > 0) {
      pkg.status = "partially_redeemed";
    }
    await pkg.save();

    await SelectionEvent.create({
      selectionId: pkg._id,
      employeeId: pkg.employeeId,
      employerId: pkg.companyId,
      amount: line.price,
      currency: line.currency,
      category,
      approvalType: "manual",
      status: "redeemed",
      timestamp: new Date()
    });

    gamification = await awardXpOnRedeem({
      userId: pkg.employeeId.toString(),
      companyId: pkg.companyId.toString(),
      category,
      providerId: provider._id.toString(),
      providerName: provider.name ?? "Provider"
    });

    await Notification.create({
      userId: pkg.employeeId,
      type: "voucher",
      payload: {
        packageId: pkg._id.toString(),
        code: normalized,
        status: "redeemed",
        xpAwarded: gamification.xpAwarded
      },
      read: false
    });

    await createPeerAdvocacyPrompt({
      userId: pkg.employeeId.toString(),
      companyId: pkg.companyId.toString(),
      vendorName: provider.name ?? "Provider",
      offerTitle,
      category,
      voucherCode: normalized
    });
  }

  return {
    voucher: toVoucherDTO(voucher.toObject() as never),
    gamification
  };
}
