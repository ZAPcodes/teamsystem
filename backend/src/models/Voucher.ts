import { Schema, model, type InferSchemaType } from "mongoose";

const VoucherSchema = new Schema(
  {
    packageLineId: { type: Schema.Types.ObjectId, ref: "PackageLine", required: true },
    code: { type: String, required: true, unique: true },
    qrPayload: { type: String, required: true },
    status: {
      type: String,
      enum: ["issued", "redeemed", "expired", "void"],
      required: true,
      default: "issued"
    },
    redeemedAt: Date,
    redeemedByProviderUserId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

VoucherSchema.index({ code: 1 }, { unique: true });
VoucherSchema.index({ packageLineId: 1 }, { unique: true });
VoucherSchema.index({ status: 1 });

export type VoucherDocument = InferSchemaType<typeof VoucherSchema>;
export const Voucher = model("Voucher", VoucherSchema);
