import { Schema, model, type InferSchemaType } from "mongoose";

const ProviderMonthlyStatSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    providerName: { type: String, required: true },
    month: { type: String, required: true },
    redemptionCount: { type: Number, required: true, default: 0, min: 0 }
  },
  { timestamps: true }
);

ProviderMonthlyStatSchema.index({ companyId: 1, providerId: 1, month: 1, redemptionCount: -1 });
ProviderMonthlyStatSchema.index({ userId: 1, companyId: 1, providerId: 1, month: 1 }, { unique: true });

export type ProviderMonthlyStatDocument = InferSchemaType<typeof ProviderMonthlyStatSchema>;
export const ProviderMonthlyStat = model("ProviderMonthlyStat", ProviderMonthlyStatSchema);
