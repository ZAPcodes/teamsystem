import { Schema, model, type InferSchemaType } from "mongoose";

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    currency: { type: String, required: true, trim: true },
    locale: { type: String, required: true, trim: true, default: "sq-AL" },
    walletBalance: { type: Number, required: true, default: 0, min: 0 },
    employerProfile: {
      displayName: String,
      industry: String,
      employeeCount: Number
    },
    providerProfile: {
      displayName: String,
      categories: [String],
      description: String,
      logoUrl: String
    }
  },
  { timestamps: true }
);

CompanySchema.index({ name: "text" });
CompanySchema.index({ country: 1 });
CompanySchema.index({ employerProfile: 1 });
CompanySchema.index({ providerProfile: 1 });

export type CompanyDocument = InferSchemaType<typeof CompanySchema>;
export const Company = model("Company", CompanySchema);
