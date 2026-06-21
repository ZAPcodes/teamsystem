import { Schema, model, type InferSchemaType } from "mongoose";

const LedgerEntrySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["fund", "allocate", "hold", "settle", "refund"],
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    fromWalletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    toWalletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    packageId: { type: Schema.Types.ObjectId, ref: "Package" },
    packageLineId: { type: Schema.Types.ObjectId, ref: "PackageLine" },
    employeeAllowanceId: { type: Schema.Types.ObjectId, ref: "EmployeeAllowance" },
    meta: {
      reason: String,
      actorUserId: { type: Schema.Types.ObjectId, ref: "User" },
      idempotencyKey: String,
      reversalOf: { type: Schema.Types.ObjectId, ref: "LedgerEntry" },
      providerId: { type: Schema.Types.ObjectId, ref: "Provider" },
      companyId: { type: Schema.Types.ObjectId, ref: "Company" }
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LedgerEntrySchema.index({ type: 1, createdAt: -1 });
LedgerEntrySchema.index({ fromWalletId: 1, createdAt: -1 });
LedgerEntrySchema.index({ toWalletId: 1, createdAt: -1 });
LedgerEntrySchema.index({ employeeAllowanceId: 1, createdAt: -1 });
LedgerEntrySchema.index({ packageId: 1 });
LedgerEntrySchema.index({ "meta.idempotencyKey": 1 }, { unique: true, sparse: true });

export type LedgerEntryDocument = InferSchemaType<typeof LedgerEntrySchema>;
export const LedgerEntry = model("LedgerEntry", LedgerEntrySchema);
