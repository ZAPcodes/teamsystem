import { Schema, model, type InferSchemaType } from "mongoose";

const EmployeeAllowanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    total: { type: Number, required: true, min: 0 },
    used: { type: Number, required: true, default: 0, min: 0 },
    held: { type: Number, required: true, default: 0, min: 0 },
    bonusAvailable: { type: Number, required: true, default: 0, min: 0 },
    bonusUsed: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, required: true, trim: true },
    periodResetAt: { type: Date, required: true }
  },
  { timestamps: true }
);

EmployeeAllowanceSchema.index({ userId: 1, companyId: 1 }, { unique: true });
EmployeeAllowanceSchema.index({ companyId: 1 });
EmployeeAllowanceSchema.index({ periodResetAt: 1 });

export type EmployeeAllowanceDocument = InferSchemaType<typeof EmployeeAllowanceSchema>;
export const EmployeeAllowance = model("EmployeeAllowance", EmployeeAllowanceSchema);
