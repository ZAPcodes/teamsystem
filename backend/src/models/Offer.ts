import { Schema, model, type InferSchemaType } from "mongoose";

const OfferSchema = new Schema(
  {
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    imageUrl: String,
    isLimited: { type: Boolean, required: true, default: false },
    inventoryRemaining: { type: Number, min: 0 },
    expiresAt: Date,
    visibility: { type: String, enum: ["public", "exclusive"], default: "public" },
    exclusiveCompanyIds: [{ type: Schema.Types.ObjectId, ref: "Company" }],
    isActive: { type: Boolean, required: true, default: true }
  },
  { timestamps: true }
);

OfferSchema.index({ providerId: 1 });
OfferSchema.index({ category: 1, isActive: 1 });
OfferSchema.index({ expiresAt: 1 });
OfferSchema.index({ visibility: 1, exclusiveCompanyIds: 1 });
OfferSchema.index({ title: "text", description: "text" });

export type OfferDocument = InferSchemaType<typeof OfferSchema>;
export const Offer = model("Offer", OfferSchema);
