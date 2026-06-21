import { Schema, model, type InferSchemaType } from "mongoose";

const ComplianceReviewSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeName: { type: String, required: true, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    offerTitle: { type: String, required: true, trim: true },
    providerId: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    providerName: { type: String, required: true, trim: true },
    employerName: { type: String, required: true, trim: true },
    employerIndustry: { type: String, required: true, trim: true },
    providerIndustry: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending_manual_approval", "approved", "rejected"],
      required: true,
      default: "pending_manual_approval"
    },
    competitorFlag: { type: Boolean, required: true, default: false },
    sentimentFlag: { type: Boolean, required: true, default: false },
    reason: { type: String, required: true, trim: true },
    headlines: [{ type: String, trim: true }],
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: Date,
    decisionNote: String
  },
  { timestamps: true }
);

ComplianceReviewSchema.index({ companyId: 1, status: 1, createdAt: -1 });
ComplianceReviewSchema.index({ employeeId: 1, offerId: 1, status: 1 });

export type ComplianceReviewDocument = InferSchemaType<typeof ComplianceReviewSchema>;
export const ComplianceReview = model("ComplianceReview", ComplianceReviewSchema);
