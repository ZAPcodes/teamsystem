import { Schema, model, type InferSchemaType } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["package_status", "gift", "drop", "nudge", "voucher", "system", "xp", "level_up", "bonus_unlock", "benefit_request", "demand_pool", "high_five", "streak_danger", "peer_advocacy", "peer_recommendation", "pooled_cart", "compliance_flag"],
      required: true
    },
    payload: { type: Schema.Types.Mixed, required: true },
    read: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof NotificationSchema>;
export const Notification = model("Notification", NotificationSchema);
