import { Schema, model, type InferSchemaType } from "mongoose";

const QuestSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    targetCategory: { type: String, required: true, trim: true },
    targetCount: { type: Number, required: true, min: 1 },
    currentCount: { type: Number, required: true, default: 0, min: 0 },
    rewardXp: { type: Number, required: true, default: 100, min: 0 },
    status: { type: String, enum: ["active", "completed"], required: true, default: "active" },
    icon: { type: String, trim: true },
    periodEnd: Date
  },
  { timestamps: true }
);

QuestSchema.index({ companyId: 1, status: 1 });
QuestSchema.index({ companyId: 1, slug: 1 }, { unique: true });

export type QuestDocument = InferSchemaType<typeof QuestSchema>;
export const Quest = model("Quest", QuestSchema);
