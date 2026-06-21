import { Schema, model, type InferSchemaType } from "mongoose";

const EmployerPolicySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    perEmployeeAllowance: { type: Number, required: true, min: 0 },
    resetPeriod: {
      type: String,
      enum: ["monthly", "quarterly", "annual"],
      required: true
    },
    allowedCategories: [{ type: String, required: true }],
    autoApproveThreshold: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

EmployerPolicySchema.index({ companyId: 1 }, { unique: true });
EmployerPolicySchema.index({ currency: 1 });

export type EmployerPolicyDocument = InferSchemaType<typeof EmployerPolicySchema>;
export const EmployerPolicy = model("EmployerPolicy", EmployerPolicySchema);
