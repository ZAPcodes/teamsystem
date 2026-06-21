import { Schema, model, type InferSchemaType } from "mongoose";

const TelegramLinkCodeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date
  },
  { timestamps: true }
);

TelegramLinkCodeSchema.index({ code: 1 }, { unique: true });
TelegramLinkCodeSchema.index({ userId: 1, createdAt: -1 });

export type TelegramLinkCodeDocument = InferSchemaType<typeof TelegramLinkCodeSchema>;
export const TelegramLinkCode = model("TelegramLinkCode", TelegramLinkCodeSchema);
