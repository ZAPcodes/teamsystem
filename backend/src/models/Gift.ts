import { Schema, model, type InferSchemaType } from "mongoose";

const GiftSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "claimed", "expired"],
      required: true,
      default: "sent"
    },
    claimedAt: Date,
    expiresAt: Date
  },
  { timestamps: true }
);

GiftSchema.index({ fromUserId: 1, createdAt: -1 });
GiftSchema.index({ toUserId: 1, status: 1 });
GiftSchema.index({ expiresAt: 1, status: 1 });

export type GiftDocument = InferSchemaType<typeof GiftSchema>;
export const Gift = model("Gift", GiftSchema);
