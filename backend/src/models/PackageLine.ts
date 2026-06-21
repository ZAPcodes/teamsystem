import { Schema, model, type InferSchemaType } from "mongoose";

const PackageLineSchema = new Schema(
  {
    packageId: { type: Schema.Types.ObjectId, ref: "Package", required: true },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    aiReason: String,
    voucherId: { type: Schema.Types.ObjectId, ref: "Voucher" }
  },
  { timestamps: true }
);

PackageLineSchema.index({ packageId: 1 });
PackageLineSchema.index({ offerId: 1 });
PackageLineSchema.index({ providerId: 1 });

export type PackageLineDocument = InferSchemaType<typeof PackageLineSchema>;
export const PackageLine = model("PackageLine", PackageLineSchema);
