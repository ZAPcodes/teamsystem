import { Schema, model, type InferSchemaType } from "mongoose";

const WalletSchema = new Schema(
  {
    ownerType: { type: String, enum: ["company", "provider"], required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

WalletSchema.index({ ownerType: 1, ownerId: 1, currency: 1 }, { unique: true });

export type WalletDocument = InferSchemaType<typeof WalletSchema>;
export const Wallet = model("Wallet", WalletSchema);
