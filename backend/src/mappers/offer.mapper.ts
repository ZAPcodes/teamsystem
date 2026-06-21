import type { OfferDTO } from "../../contracts/api.js";
import mongoose from "mongoose";

type OfferWithProvider = {
  _id: unknown;
  providerId: {
    _id: unknown;
    name: string;
  };
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isLimited: boolean;
  inventoryRemaining?: number;
  expiresAt?: Date;
  visibility?: "public" | "exclusive";
  exclusiveCompanyIds?: Array<{ toString(): string }>;
  isActive: boolean;
};

function daysUntil(date?: Date): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function computeUrgencyLabel(offer: {
  isLimited: boolean;
  inventoryRemaining?: number;
  expiresAt?: Date;
}): string | undefined {
  if (offer.inventoryRemaining !== undefined && offer.inventoryRemaining <= 5) {
    const count = Math.max(0, offer.inventoryRemaining);
    return count === 0 ? "Sold out" : `Only ${count} left`;
  }

  if (offer.isLimited) {
    return "Limited";
  }

  const days = daysUntil(offer.expiresAt);
  if (days !== null && days <= 0) return undefined;
  if (days !== null && days <= 2) return "Ends soon";
  if (days !== null && days <= 7) return `Ends in ${days}d`;

  return undefined;
}

export function toOfferDTO(offer: OfferWithProvider): OfferDTO {
  const visibility = offer.visibility ?? "public";
  return {
    id: String(offer._id),
    providerId: String(offer.providerId._id),
    providerName: offer.providerId.name,
    title: offer.title,
    description: offer.description,
    category: offer.category,
    price: offer.price,
    currency: offer.currency,
    imageUrl: offer.imageUrl,
    isLimited: offer.isLimited,
    inventoryRemaining: offer.inventoryRemaining,
    expiresAt: offer.expiresAt?.toISOString(),
    visibility,
    exclusiveCompanyIds: offer.exclusiveCompanyIds?.map((id) => String(id)),
    urgencyLabel: computeUrgencyLabel(offer),
    isActive: offer.isActive
  };
}

export function employeeVisibilityFilter(companyId: string) {
  const companyObjectId = new mongoose.Types.ObjectId(companyId);
  return {
    $or: [
      { visibility: { $exists: false } },
      { visibility: "public" },
      { visibility: "exclusive", exclusiveCompanyIds: companyObjectId }
    ]
  };
}
