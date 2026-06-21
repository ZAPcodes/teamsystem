import { Router } from "express";
import {
  CreateProviderOfferRequestSchema,
  ProviderCompanyResponseSchema,
  ProviderEarningsResponseSchema,
  ProviderOfferResponseSchema,
  ProviderOffersResponseSchema,
  UpdateProviderOfferRequestSchema
} from "../../contracts/api.js";
import { ApiError } from "../http/ApiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { toOfferDTO } from "../mappers/offer.mapper.js";
import { Company } from "../models/Company.js";
import { Offer } from "../models/Offer.js";
import { Provider } from "../models/Provider.js";
import { getProviderEarnings } from "../services/provider-earnings.service.js";

export const providerRouter = Router();

providerRouter.use(requireAuth, requireRole("provider_admin"));

async function getOwnedProvider(companyId: string) {
  const provider = await Provider.findOne({ companyId });
  if (!provider) {
    throw new ApiError(404, "PROVIDER_NOT_FOUND", "Provider profile not found");
  }
  return provider;
}

providerRouter.get(
  "/company",
  asyncHandler(async (req, res) => {
    const company = await Company.findById(req.user?.companyId).lean();
    const provider = await getOwnedProvider(req.user?.companyId ?? "");

    if (!company) {
      throw new ApiError(404, "COMPANY_NOT_FOUND", "Provider company not found");
    }

    respond(res, ProviderCompanyResponseSchema, {
      company: {
        id: String(company._id),
        name: company.name,
        country: company.country,
        currency: company.currency,
        locale: company.locale
      },
      provider: {
        id: String(provider._id),
        name: provider.name,
        category: provider.category,
        country: provider.country,
        logoUrl: provider.logoUrl ?? undefined,
        description: provider.description
      }
    });
  })
);

providerRouter.get(
  "/earnings",
  asyncHandler(async (req, res) => {
    const earnings = await getProviderEarnings(req.user?.companyId ?? "");
    if (!earnings) {
      throw new ApiError(404, "PROVIDER_NOT_FOUND", "Provider profile not found");
    }

    respond(res, ProviderEarningsResponseSchema, earnings);
  })
);

providerRouter.get(
  "/offers",
  asyncHandler(async (req, res) => {
    const provider = await getOwnedProvider(req.user?.companyId ?? "");
    const offers = await Offer.find({ providerId: provider._id })
      .populate("providerId")
      .sort({ createdAt: -1 })
      .lean();

    respond(res, ProviderOffersResponseSchema, {
      offers: offers.map((offer) => toOfferDTO(offer as never))
    });
  })
);

providerRouter.post(
  "/offers",
  validateBody(CreateProviderOfferRequestSchema),
  asyncHandler(async (req, res) => {
    const provider = await getOwnedProvider(req.user?.companyId ?? "");
    const body = req.body as typeof CreateProviderOfferRequestSchema._output;
    const offer = await Offer.create({
      providerId: provider._id,
      title: body.title,
      description: body.description,
      category: body.category,
      price: body.price,
      currency: body.currency,
      imageUrl: body.imageUrl,
      isLimited: body.isLimited ?? false,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      isActive: true
    });
    const populated = await offer.populate("providerId");

    respond(res, ProviderOfferResponseSchema, {
      offer: toOfferDTO(populated.toObject() as never)
    }, 201);
  })
);

providerRouter.patch(
  "/offers/:id",
  validateBody(UpdateProviderOfferRequestSchema),
  asyncHandler(async (req, res) => {
    const provider = await getOwnedProvider(req.user?.companyId ?? "");
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
    }

    if (offer.providerId.toString() !== provider._id.toString()) {
      throw new ApiError(403, "FORBIDDEN", "Offer belongs to another provider");
    }

    const body = req.body as typeof UpdateProviderOfferRequestSchema._output;
    if (body.title !== undefined) offer.title = body.title;
    if (body.description !== undefined) offer.description = body.description;
    if (body.category !== undefined) offer.category = body.category;
    if (body.price !== undefined) offer.price = body.price;
    if (body.currency !== undefined) offer.currency = body.currency;
    if (body.imageUrl !== undefined) offer.imageUrl = body.imageUrl;
    if (body.isLimited !== undefined) offer.isLimited = body.isLimited;
    if (body.expiresAt !== undefined) offer.expiresAt = new Date(body.expiresAt);

    await offer.save();
    const populated = await offer.populate("providerId");

    respond(res, ProviderOfferResponseSchema, {
      offer: toOfferDTO(populated.toObject() as never)
    });
  })
);

providerRouter.delete(
  "/offers/:id",
  asyncHandler(async (req, res) => {
    const provider = await getOwnedProvider(req.user?.companyId ?? "");
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
    }

    if (offer.providerId.toString() !== provider._id.toString()) {
      throw new ApiError(403, "FORBIDDEN", "Offer belongs to another provider");
    }

    offer.isActive = false;
    await offer.save();
    const populated = await offer.populate("providerId");

    respond(res, ProviderOfferResponseSchema, {
      offer: toOfferDTO(populated.toObject() as never)
    });
  })
);
