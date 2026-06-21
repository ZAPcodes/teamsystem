import { Router } from "express";
import {
  ApprovalsQuerySchema,
  ApprovalsResponseSchema,
  ApprovePackageResponseSchema,
  CreatePackageRequestSchema,
  PackageResponseSchema,
  RejectPackageRequestSchema,
  RejectPackageResponseSchema,
  SubmitPackageResponseSchema
} from "../../contracts/api.js";
import { z } from "zod";
import type { PackageDTO } from "../../contracts/api.js";
import { ApiError } from "../http/ApiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Package } from "../models/Package.js";
import { SelectionEvent } from "../models/SelectionEvent.js";
import { releaseAllowanceHold } from "../services/ledger.service.js";
import {
  approvePackage,
  createDraftPackage,
  loadPackageDTO,
  loadPackagesDTO,
  submitPackage
} from "../services/package.service.js";

export const packageRouter = Router();

packageRouter.post(
  "/",
  requireAuth,
  requireRole("employee"),
  validateBody(CreatePackageRequestSchema),
  asyncHandler(async (req, res) => {
    const { offerIds, source } = req.body as { offerIds: string[]; source: "manual" | "ai" };
    const pkg = await createDraftPackage(req.user!.id, req.user!.companyId, offerIds, source);
    respond(res, PackageResponseSchema, { package: pkg }, 201);
  })
);

packageRouter.post(
  "/:id/submit",
  requireAuth,
  requireRole("employee"),
  validateBody(z.object({ shareToFeed: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { shareToFeed?: boolean };
    const result = await submitPackage(String(req.params.id), req.user!.id, {
      shareToFeed: body.shareToFeed === true
    });
    respond(res, SubmitPackageResponseSchema, result);
  })
);

packageRouter.post(
  "/:id/approve",
  requireAuth,
  requireRole("employer_admin"),
  asyncHandler(async (req, res) => {
    const packageId = String(req.params.id);
    const pkg = await Package.findById(packageId).lean();
    if (!pkg) {
      throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found");
    }
    if (pkg.companyId.toString() !== req.user!.companyId) {
      throw new ApiError(403, "FORBIDDEN", "Package belongs to another employer");
    }

    const result = await approvePackage(packageId, req.user!.id);
    respond(res, ApprovePackageResponseSchema, result);
  })
);

packageRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole("employer_admin"),
  validateBody(RejectPackageRequestSchema),
  asyncHandler(async (req, res) => {
    const packageId = String(req.params.id);
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      throw new ApiError(404, "PACKAGE_NOT_FOUND", "Package not found");
    }
    if (pkg.companyId.toString() !== req.user!.companyId) {
      throw new ApiError(403, "FORBIDDEN", "Package belongs to another employer");
    }
    if (pkg.status !== "pending") {
      throw new ApiError(400, "PACKAGE_NOT_PENDING", "Package is not pending approval");
    }

    const policy = await EmployerPolicy.findOne({ companyId: pkg.companyId }).lean();
    const allowance = await EmployeeAllowance.findOne({
      userId: pkg.employeeId,
      companyId: pkg.companyId
    });
    if (allowance) {
      allowance.held = Math.max(0, allowance.held - pkg.totalSnapshot);
      await allowance.save();
      await releaseAllowanceHold(
        allowance._id,
        pkg.totalSnapshot,
        policy?.currency ?? pkg.currency,
        pkg._id,
        "rejected"
      );
    }

    pkg.status = "rejected";
    pkg.decidedAt = new Date();
    pkg.rejectedBy = req.user!.id as never;
    pkg.rejectionReason = (req.body as { reason?: string }).reason;
    await pkg.save();
    await SelectionEvent.create({
      selectionId: pkg._id,
      employeeId: pkg.employeeId,
      employerId: pkg.companyId,
      amount: pkg.totalSnapshot,
      currency: policy?.currency ?? pkg.currency,
      category: "mixed",
      approvalType: "manual",
      status: "rejected",
      timestamp: new Date()
    });

    const { Notification } = await import("../models/Notification.js");
    await Notification.create({
      userId: pkg.employeeId,
      type: "package_status",
      payload: { packageId: pkg._id.toString(), status: "rejected" },
      read: false
    });

    respond(res, RejectPackageResponseSchema, {
      package: await loadPackageDTO(pkg._id.toString()),
      ledgerEntries: []
    });
  })
);

export const approvalRouter = Router();

approvalRouter.get(
  "/approvals",
  requireAuth,
  requireRole("employer_admin"),
  validateQuery(ApprovalsQuerySchema),
  asyncHandler(async (req, res) => {
    const { status } = req.query as unknown as { status: PackageDTO["status"] };
    const packages = await Package.find({
      companyId: req.user!.companyId,
      status
    })
      .populate("employeeId")
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    const dtos = await loadPackagesDTO(packages as never);
    respond(res, ApprovalsResponseSchema, { packages: dtos });
  })
);
