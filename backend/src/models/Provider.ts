import { Schema, model, type InferSchemaType } from "mongoose";

const ProviderSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    complianceDemoSentiment: { type: Boolean, default: false },
    country: { type: String, required: true, trim: true },
    logoUrl: String,
    description: { type: String, required: true }
  },
  { timestamps: true }
);

ProviderSchema.index({ companyId: 1 });
ProviderSchema.index({ category: 1, country: 1 });
ProviderSchema.index({ name: "text", description: "text" });

export type ProviderDocument = InferSchemaType<typeof ProviderSchema>;
export const Provider = model("Provider", ProviderSchema);
