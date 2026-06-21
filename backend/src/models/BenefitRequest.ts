import { Schema, model, type InferSchemaType } from "mongoose";

const BenefitRequestItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    link: String,
    phone: String,
    category: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const BenefitRequestSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    originalMessage: { type: String, required: true },
    items: { type: [BenefitRequestItemSchema], required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      required: true,
      default: "pending"
    },
    employerNote: String,
    decidedAt: Date,
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

BenefitRequestSchema.index({ companyId: 1, status: 1, createdAt: -1 });
BenefitRequestSchema.index({ employeeId: 1, createdAt: -1 });

export type BenefitRequestDocument = InferSchemaType<typeof BenefitRequestSchema>;
export const BenefitRequest = model("BenefitRequest", BenefitRequestSchema);
