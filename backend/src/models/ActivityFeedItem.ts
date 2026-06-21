import { Schema, model, type InferSchemaType } from "mongoose";

const ActivityFeedItemSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    message: { type: String, required: true },
    packageId: { type: Schema.Types.ObjectId, ref: "Package" },
    offerTitles: [{ type: String }],
    highFiveCount: { type: Number, required: true, default: 0, min: 0 },
    highFivedBy: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

ActivityFeedItemSchema.index({ companyId: 1, createdAt: -1 });

export type ActivityFeedItemDocument = InferSchemaType<typeof ActivityFeedItemSchema>;
export const ActivityFeedItem = model("ActivityFeedItem", ActivityFeedItemSchema);
