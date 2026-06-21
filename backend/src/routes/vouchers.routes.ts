import { Router } from "express";
import { RedeemVoucherResponseSchema } from "../../contracts/api.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { redeemVoucher } from "../services/voucher.service.js";

export const voucherRouter = Router();

voucherRouter.post(
  "/:code/redeem",
  requireAuth,
  requireRole("provider_admin"),
  asyncHandler(async (req, res) => {
    const voucher = await redeemVoucher(String(req.params.code), req.user!.companyId);
    respond(res, RedeemVoucherResponseSchema, voucher);
  })
);
