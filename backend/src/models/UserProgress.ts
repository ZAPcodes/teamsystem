import { Schema, model, type InferSchemaType } from "mongoose";

const UserProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    xp: { type: Number, required: true, default: 0, min: 0 },
    level: { type: Number, required: true, default: 1, min: 1 },
    streakCount: { type: Number, required: true, default: 0, min: 0 },
    streakWeeks: { type: Number, required: true, default: 0, min: 0 },
    lastStreakWeek: { type: String, default: "" },
    lastRedeemWeek: { type: String, default: "" },
    streakFreezes: { type: Number, required: true, default: 0, min: 0 },
    officeLegends: [
      {
        providerId: { type: Schema.Types.ObjectId, ref: "Provider" },
        providerName: { type: String },
        month: { type: String },
        badgeLabel: { type: String }
      }
    ],
    lastRedeemAt: Date,
    totalRedemptions: { type: Number, required: true, default: 0, min: 0 },
    bonusMilestoneGranted: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

UserProgressSchema.index({ userId: 1, companyId: 1 }, { unique: true });
UserProgressSchema.index({ companyId: 1, xp: -1 });

export type UserProgressDocument = InferSchemaType<typeof UserProgressSchema>;
export const UserProgress = model("UserProgress", UserProgressSchema);
