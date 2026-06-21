import { Schema, model, type InferSchemaType } from "mongoose";

const PackageSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "settled",
        "partially_redeemed",
        "redeemed",
        "expired",
        "cancelled"
      ],
      required: true,
      default: "draft"
    },
    source: { type: String, enum: ["manual", "ai", "pooled"], required: true },
    totalSnapshot: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    aiReason: String,
    submittedAt: Date,
    decidedAt: Date,
    holdExpiresAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String
  },
  { timestamps: true }
);

PackageSchema.index({ employeeId: 1, status: 1, createdAt: -1 });
PackageSchema.index({ employeeId: 1, createdAt: -1 });
PackageSchema.index({ companyId: 1, status: 1, submittedAt: -1 });
PackageSchema.index({ holdExpiresAt: 1, status: 1 });

export type PackageDocument = InferSchemaType<typeof PackageSchema>;
export const Package = model("Package", PackageSchema);
