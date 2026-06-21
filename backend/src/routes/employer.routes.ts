import { Router } from "express";
import { z } from "zod";
import {
  EmployerCompanyResponseSchema,
  EmployerEmployeesResponseSchema,
  EmployerInsightsResponseSchema,
  FundWalletRequestSchema,
  FundWalletResponseSchema,
  UpdateEmployerPolicyRequestSchema,
  BenefitRequestsResponseSchema,
  DecideBenefitRequestSchema,
  BenefitRequestDTOSchema,
  ComplianceReviewsResponseSchema,
  DecideComplianceReviewRequestSchema,
  DecideComplianceReviewResponseSchema,
  CreateQuestRequestSchema,
  QuestsResponseSchema,
  QuestResponseSchema
} from "../../contracts/api.js";
import { ApiError } from "../http/ApiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toAllowanceSummary } from "../mappers/allowance.mapper.js";
import { Company } from "../models/Company.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { SelectionEvent } from "../models/SelectionEvent.js";
import { User } from "../models/User.js";
import { fundCompanyWallet } from "../services/ledger.service.js";
import { buildEmployerSuggestions, buildUnusedCategories } from "../services/insights.service.js";
import {
  decideBenefitRequest,
  listCompanyBenefitRequests
} from "../services/benefit-request.service.js";
import {
  decideComplianceReview,
  listComplianceReviews
} from "../services/compliance.service.js";
import { createCompanyQuest, listCompanyQuests } from "../services/gamification.service.js";

export const employerRouter = Router();

employerRouter.use(requireAuth, requireRole("employer_admin"));

employerRouter.get(
  "/company",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.user?.companyId).lean();
    const policy = await EmployerPolicy.findOne({ companyId: req.user?.companyId }).lean();

    if (!company || !policy) {
      throw new ApiError(404, "COMPANY_NOT_FOUND", "Employer company or policy not found");
    }

    respond(res, EmployerCompanyResponseSchema, {
      company: {
        id: String(company._id),
        name: company.name,
        country: company.country,
        currency: company.currency,
        locale: company.locale,
        walletBalance: company.walletBalance
      },
      policy: {
        perEmployeeAllowance: policy.perEmployeeAllowance,
        resetPeriod: policy.resetPeriod,
        allowedCategories: policy.allowedCategories,
        currency: policy.currency
      }
    });
  })
);

employerRouter.patch(
  "/policy",
  validateBody(UpdateEmployerPolicyRequestSchema),
  asyncHandler(async (req, res) => {
    const policy = await EmployerPolicy.findOneAndUpdate(
      { companyId: req.user?.companyId },
      { $set: req.body },
      { new: true }
    ).lean();

    const requestedCurrency = (req.body as { currency?: string }).currency;
    if (requestedCurrency) {
      await Promise.all([
        Company.updateOne({ _id: req.user?.companyId }, { $set: { currency: requestedCurrency } }),
        EmployeeAllowance.updateMany({ companyId: req.user?.companyId }, { $set: { currency: requestedCurrency } })
      ]);
    }

    const company = await Company.findById(req.user?.companyId).lean();

    if (!company || !policy) {
      throw new ApiError(404, "COMPANY_NOT_FOUND", "Employer company or policy not found");
    }

    respond(res, EmployerCompanyResponseSchema, {
      company: {
        id: String(company._id),
        name: company.name,
        country: company.country,
        currency: company.currency,
        locale: company.locale,
        walletBalance: company.walletBalance
      },
      policy: {
        perEmployeeAllowance: policy.perEmployeeAllowance,
        resetPeriod: policy.resetPeriod,
        allowedCategories: policy.allowedCategories,
        currency: policy.currency
      }
    });
  })
);

employerRouter.get(
  "/employees",
  asyncHandler(async (req, res) => {
    const policy = await EmployerPolicy.findOne({ companyId: req.user?.companyId }).lean();
    const employees = await User.find({
      companyId: req.user?.companyId,
      roles: "employee"
    }).lean();
    const allowances = await EmployeeAllowance.find({
      companyId: req.user?.companyId,
      userId: { $in: employees.map((employee) => employee._id) }
    }).lean();
    const allowanceByUserId = new Map(
      allowances.map((allowance) => [allowance.userId.toString(), allowance])
    );

    respond(res, EmployerEmployeesResponseSchema, {
      employees: employees.map((employee) => {
        const allowance = allowanceByUserId.get(employee._id.toString());
        if (!allowance) {
          throw new ApiError(500, "ALLOWANCE_NOT_FOUND", `Allowance missing for ${employee.email}`);
        }

        return {
          id: String(employee._id),
          name: employee.name,
          email: employee.email,
          avatarUrl: employee.avatarUrl ?? undefined,
          initials: employee.initials,
          allowance: {
            ...toAllowanceSummary(allowance),
            currency: policy?.currency ?? allowance.currency
          }
        };
      })
    });
  })
);

employerRouter.post(
  "/wallet/fund",
  validateBody(FundWalletRequestSchema),
  asyncHandler(async (req, res) => {
    const { amount } = req.body as { amount: number };

    const company = await Company.findById(req.user?.companyId).lean();
    if (!company) {
      throw new ApiError(404, "COMPANY_NOT_FOUND", "Employer company not found");
    }

    await fundCompanyWallet(String(company._id), amount, company.currency, req.user?.id);

    const updated = await Company.findById(req.user?.companyId).lean();
    if (!updated) {
      throw new ApiError(404, "COMPANY_NOT_FOUND", "Employer company not found");
    }

    respond(res, FundWalletResponseSchema, {
      company: {
        id: String(updated._id),
        walletBalance: updated.walletBalance,
        currency: updated.currency
      }
    });
  })
);

employerRouter.get(
  "/insights",
  asyncHandler(async (req, res) => {
    const [allowances, policy, employees, approvedEvents, allEvents] = await Promise.all([
      EmployeeAllowance.find({ companyId: req.user?.companyId }).lean(),
      EmployerPolicy.findOne({ companyId: req.user?.companyId }).lean(),
      User.find({ companyId: req.user?.companyId, roles: "employee" }).select("_id").lean(),
      SelectionEvent.find({
        employerId: req.user?.companyId,
        status: { $in: ["approved", "redeemed"] }
      }).populate("employeeId").lean(),
      SelectionEvent.find({ employerId: req.user?.companyId }).populate("employeeId").lean()
    ]);
    const employeeIds = employees.map((employee) => employee._id.toString());
    const totalAllocated = allowances.reduce((sum, allowance) => sum + allowance.total, 0);
    const totalHeld = allowances.reduce((sum, allowance) => sum + allowance.held, 0);
    const totalSpent = approvedEvents.reduce((sum, event) => sum + event.amount, 0);
    const requestCounts = approvedEvents.reduce(
      (counts, event) => {
        counts[event.approvalType] += 1;
        return counts;
      },
      { auto: 0, manual: 0 }
    );
    const spendByCategory = new Map<string, number>();
    const spendByEmployee = new Map<string, { employeeId: string; employeeName: string; amount: number }>();

    for (const event of approvedEvents) {
      spendByCategory.set(event.category, (spendByCategory.get(event.category) ?? 0) + event.amount);
      const employee = event.employeeId as unknown as { _id?: unknown; name?: string };
      const employeeId = String(employee?._id ?? event.employeeId);
      const existing = spendByEmployee.get(employeeId);
      spendByEmployee.set(employeeId, {
        employeeId,
        employeeName: employee?.name ?? "Employee",
        amount: (existing?.amount ?? 0) + event.amount
      });
    }

    const allowedCategories = policy?.allowedCategories ?? [];
    const unusedCategories = buildUnusedCategories(allowedCategories, employeeIds, approvedEvents);
    const suggestions = policy
      ? buildEmployerSuggestions({
          policy,
          allowances,
          allEvents,
          approvedEvents,
          unusedCategories
        })
      : [];

    const popularCategories = [...spendByCategory.entries()]
      .map(([category, spend]) => ({
        category,
        spend,
        count: approvedEvents.filter((event) => event.category === category).length
      }))
      .sort((a, b) => b.spend - a.spend);

    respond(res, EmployerInsightsResponseSchema, {
      utilization: {
        totalAllocated,
        totalUsed: totalSpent,
        totalHeld,
        currency: policy?.currency ?? allowances[0]?.currency ?? "ALL",
        totalSpent
      },
      requestCounts,
      spendByCategory: [...spendByCategory.entries()].map(([category, amount]) => ({ category, amount })),
      spendByEmployee: [...spendByEmployee.values()],
      popularCategories,
      unusedCategories,
      suggestions
    });
  })
);

employerRouter.get(
  "/quests",
  asyncHandler(async (req, res) => {
    const quests = await listCompanyQuests(req.user!.companyId);
    respond(res, QuestsResponseSchema, { quests });
  })
);

employerRouter.post(
  "/quests",
  validateBody(CreateQuestRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      title: string;
      description: string;
      targetCategory: string;
      targetCount: number;
      rewardXp?: number;
      icon?: string;
    };
    const quest = await createCompanyQuest(req.user!.companyId, body);
    respond(res, QuestResponseSchema, { quest }, 201);
  })
);

employerRouter.get(
  "/benefit-requests",
  asyncHandler(async (req, res) => {
    const requests = await listCompanyBenefitRequests(req.user?.companyId ?? "");
    respond(res, BenefitRequestsResponseSchema, { requests });
  })
);

employerRouter.post(
  "/benefit-requests/:id/decide",
  validateBody(DecideBenefitRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as { status: "approved" | "declined"; employerNote?: string };
    const result = await decideBenefitRequest(
      String(req.params.id),
      req.user?.companyId ?? "",
      req.user!.id,
      body.status,
      body.employerNote
    );
    respond(res, z.object({ request: BenefitRequestDTOSchema }), { request: result });
  })
);

employerRouter.get(
  "/compliance-reviews",
  asyncHandler(async (req, res) => {
    const status = (req.query.status as "pending_manual_approval" | "approved" | "rejected") || "pending_manual_approval";
    const reviews = await listComplianceReviews(req.user!.companyId, status);
    respond(res, ComplianceReviewsResponseSchema, { reviews });
  })
);

employerRouter.post(
  "/compliance-reviews/:id/decide",
  validateBody(DecideComplianceReviewRequestSchema),
  asyncHandler(async (req, res) => {
    const { decision, note } = req.body as { decision: "approved" | "rejected"; note?: string };
    const result = await decideComplianceReview({
      reviewId: String(req.params.id),
      companyId: req.user!.companyId,
      employerId: req.user!.id,
      decision,
      note
    });
    respond(res, DecideComplianceReviewResponseSchema, result);
  })
);
