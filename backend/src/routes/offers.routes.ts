import { Router } from "express";
import type { Request } from "express";
import {
  DropsResponseSchema,
  OfferResponseSchema,
  OffersQuerySchema,
  OffersResponseSchema,
  PosBundleRequestSchema,
  PosBundleResponseSchema,
  ClaimComplianceRequestSchema,
  ClaimComplianceResponseSchema
} from "../../contracts/api.js";
import { ApiError } from "../http/ApiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { Company } from "../models/Company.js";
import { Drop } from "../models/Drop.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Offer } from "../models/Offer.js";
import { SelectionEvent } from "../models/SelectionEvent.js";
import { employeeVisibilityFilter, toOfferDTO } from "../mappers/offer.mapper.js";
import { buildCategoryAffinity, rankOffers } from "../services/feed.service.js";
import { buildFeedContext } from "../services/feed-context.service.js";
import { evaluatePosBundle } from "../services/pos-bundler.service.js";
import { evaluateClaimCompliance } from "../services/compliance.service.js";

export const offerRouter = Router();

async function employeeOfferConstraints(req: Request) {
  if (!req.user?.roles.includes("employee")) {
    return {};
  }

  const [company, policy] = await Promise.all([
    Company.findById(req.user.companyId).lean(),
    EmployerPolicy.findOne({ companyId: req.user.companyId }).lean()
  ]);

  if (!company || !policy) {
    throw new ApiError(404, "POLICY_NOT_FOUND", "Employee company policy not found");
  }

  return {
    category: { $in: policy.allowedCategories },
    currency: company.currency,
    companyId: String(company._id)
  };
}

function activeOfferFilter(now = new Date()) {
  return {
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
  };
}

offerRouter.get(
  "/",
  requireAuth,
  validateQuery(OffersQuerySchema),
  asyncHandler(async (req, res) => {
    const { category, q } = req.query as unknown as { category?: string; q?: string };
    const constraints = await employeeOfferConstraints(req);
    const filter: Record<string, unknown> = {
      ...activeOfferFilter(),
      ...constraints
    };

    delete filter.companyId;

    if (req.user?.roles.includes("employee") && constraints.companyId) {
      filter.$and = [
        employeeVisibilityFilter(constraints.companyId as string)
      ];
    }

    if (category) {
      const allowedCategories = (constraints as { category?: { $in: string[] } }).category?.$in;
      filter.category = !allowedCategories || allowedCategories.includes(category)
        ? category
        : "__no_matching_category__";
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const offers = await Offer.find(filter).populate("providerId").sort({ createdAt: -1 }).lean();
    let dtos = offers.map((offer) => toOfferDTO(offer as never));

    let feedMeta;

    if (req.user?.roles.includes("employee")) {
      const now = new Date();
      const [drops, allowance, events] = await Promise.all([
        Drop.find({ startsAt: { $lte: now }, endsAt: { $gt: now } }).lean(),
        EmployeeAllowance.findOne({ userId: req.user.id, companyId: req.user.companyId }).lean(),
        SelectionEvent.find({ employeeId: req.user.id }).lean()
      ]);

      const dropOfferIds = new Set(drops.map((drop) => String(drop.offerId)));
      const daysToAllowanceReset = allowance
        ? Math.ceil((allowance.periodResetAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const walletBalance = allowance
        ? Math.max(0, allowance.total - allowance.used - allowance.held)
        : 0;

      feedMeta = buildFeedContext({ daysUntilReset: daysToAllowanceReset, walletBalance, now });

      dtos = rankOffers({
        offers: dtos,
        dropOfferIds,
        categoryAffinity: buildCategoryAffinity(events),
        daysToAllowanceReset,
        feedContext: feedMeta
      });
    }

    respond(res, OffersResponseSchema, { offers: dtos, feedMeta });
  })
);

offerRouter.post(
  "/claim-compliance",
  requireAuth,
  validateBody(ClaimComplianceRequestSchema),
  asyncHandler(async (req, res) => {
    if (!req.user?.roles.includes("employee")) {
      throw new ApiError(403, "FORBIDDEN", "Employees only");
    }

    const { offerId } = req.body as { offerId: string };
    const result = await evaluateClaimCompliance({
      userId: req.user.id,
      companyId: req.user.companyId,
      offerId
    });

    respond(res, ClaimComplianceResponseSchema, result);
  })
);

offerRouter.post(
  "/claim-bundle",
  requireAuth,
  validateBody(PosBundleRequestSchema),
  asyncHandler(async (req, res) => {
    if (!req.user?.roles.includes("employee")) {
      throw new ApiError(403, "FORBIDDEN", "Employees only");
    }

    const { offerId } = req.body as { offerId: string };
    const constraints = await employeeOfferConstraints(req);
    const filter: Record<string, unknown> = {
      ...activeOfferFilter(),
      ...constraints
    };
    delete filter.companyId;

    if (constraints.companyId) {
      filter.$and = [employeeVisibilityFilter(constraints.companyId as string)];
    }

    const [targetOffer, catalogOffers, allowance] = await Promise.all([
      Offer.findOne({ _id: offerId, ...filter }).populate("providerId").lean(),
      Offer.find(filter).populate("providerId").lean(),
      EmployeeAllowance.findOne({ userId: req.user.id, companyId: req.user.companyId }).lean()
    ]);

    if (!targetOffer) {
      throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
    }

    if (!allowance) {
      throw new ApiError(404, "ALLOWANCE_NOT_FOUND", "Allowance not found");
    }

    const walletBalance = Math.max(0, allowance.total - allowance.used - allowance.held);
    const targetDto = toOfferDTO(targetOffer as never);
    const catalogDtos = catalogOffers.map((o) => toOfferDTO(o as never));

    const result = evaluatePosBundle({
      baseOffer: targetDto,
      catalog: catalogDtos,
      walletBalance
    });

    respond(res, PosBundleResponseSchema, result);
  })
);

offerRouter.get(
  "/drops",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const constraints = await employeeOfferConstraints(_req);
    const visibilityFilter =
      _req.user?.roles.includes("employee") && constraints.companyId
        ? employeeVisibilityFilter(constraints.companyId as string)
        : null;

    const drops = await Drop.find({
      startsAt: { $lte: now },
      endsAt: { $gt: now }
    })
      .populate({
        path: "offerId",
        populate: { path: "providerId" }
      })
      .sort({ endsAt: 1 })
      .lean();

    const filteredDrops = drops.filter((drop) => {
      const offer = drop.offerId as never as {
        isActive: boolean;
        expiresAt?: Date;
        category: string;
        currency: string;
        visibility?: string;
        exclusiveCompanyIds?: Array<{ toString(): string }>;
      };
      const categoryConstraint = (constraints as { category?: { $in: string[] } }).category;
      const currencyConstraint = (constraints as { currency?: string }).currency;
      const allowedCategory = !categoryConstraint || categoryConstraint.$in.includes(offer.category);
      const allowedCurrency = !currencyConstraint || currencyConstraint === offer.currency;
      const unexpired = !offer.expiresAt || offer.expiresAt > now;
      const visible =
        !visibilityFilter ||
        offer.visibility !== "exclusive" ||
        offer.exclusiveCompanyIds?.some((id) => id.toString() === constraints.companyId);
      return offer.isActive && unexpired && allowedCategory && allowedCurrency && visible;
    });

    respond(res, DropsResponseSchema, {
      drops: filteredDrops.map((drop) => ({
        id: String(drop._id),
        badgeLabel: drop.badgeLabel,
        startsAt: drop.startsAt.toISOString(),
        endsAt: drop.endsAt.toISOString(),
        offer: toOfferDTO(drop.offerId as never)
      }))
    });
  })
);

offerRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const offer = await Offer.findById(req.params.id).populate("providerId").lean();
    const now = new Date();
    if (!offer || !offer.isActive || (offer.expiresAt && offer.expiresAt <= now)) {
      throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
    }

    const constraints = await employeeOfferConstraints(req);
    const categoryConstraint = (constraints as { category?: { $in: string[] } }).category;
    const currencyConstraint = (constraints as { currency?: string }).currency;
    if (
      (categoryConstraint && !categoryConstraint.$in.includes(offer.category)) ||
      (currencyConstraint && currencyConstraint !== offer.currency)
    ) {
      throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
    }

    if (req.user?.roles.includes("employee") && constraints.companyId) {
      const companyId = constraints.companyId as string;
      const isExclusive = offer.visibility === "exclusive";
      const allowed =
        !isExclusive ||
        offer.exclusiveCompanyIds?.some((id) => id.toString() === companyId);
      if (!allowed) {
        throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
      }
    }

    respond(res, OfferResponseSchema, {
      offer: toOfferDTO(offer as never)
    });
  })
);
