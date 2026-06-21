import { Schema, model, type InferSchemaType } from "mongoose";

const ProviderLeadSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    mapsUrl: { type: String, default: "" },
    website: { type: String, default: "" },
    outreachStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending"
    },
    emailSubject: { type: String },
    emailBody: { type: String },
    emailSentAt: { type: Date }
  },
  { _id: true }
);

const DemandCampaignSchema = new Schema(
  {
    normalizedKey: { type: String, required: true, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    label: { type: String, required: true },
    location: { type: String, default: "Tirana" },
    category: { type: String, default: "lifestyle" },
    totalPooledAmount: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, required: true, default: "ALL" },
    contributorIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    providers: { type: [ProviderLeadSchema], default: [] },
    lastOutreachAt: { type: Date }
  },
  { timestamps: true }
);

DemandCampaignSchema.index({ companyId: 1, normalizedKey: 1 }, { unique: true });
DemandCampaignSchema.index({ companyId: 1, updatedAt: -1 });

export type DemandCampaignDocument = InferSchemaType<typeof DemandCampaignSchema>;
export const DemandCampaign = model("DemandCampaign", DemandCampaignSchema);
