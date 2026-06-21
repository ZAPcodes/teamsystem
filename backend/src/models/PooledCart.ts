import { Schema, model, type InferSchemaType } from "mongoose";

const PooledCartContributionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    userInitials: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    committedAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const PooledCartSchema = new Schema(
  {
    initiatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    offerTitle: { type: String, required: true, trim: true },
    providerName: { type: String, required: true, trim: true },
    targetPrice: { type: Number, required: true, min: 1 },
    suggestedContribution: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "locked", "cancelled", "redeemed"],
      required: true,
      default: "pending"
    },
    inviteCode: { type: String, required: true, unique: true, trim: true },
    committedTotal: { type: Number, required: true, default: 0, min: 0 },
    contributions: { type: [PooledCartContributionSchema], default: [] },
    packageId: { type: Schema.Types.ObjectId, ref: "Package" },
    voucherId: { type: Schema.Types.ObjectId, ref: "Voucher" },
    lockedAt: Date
  },
  { timestamps: true }
);

PooledCartSchema.index({ companyId: 1, status: 1, createdAt: -1 });
PooledCartSchema.index({ initiatorId: 1, status: 1 });

export type PooledCartDocument = InferSchemaType<typeof PooledCartSchema>;
export const PooledCart = model("PooledCart", PooledCartSchema);
