import { Schema, model, type InferSchemaType } from "mongoose";

const DropSchema = new Schema(
  {
    offerId: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    badgeLabel: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

DropSchema.index({ startsAt: 1, endsAt: 1 });
DropSchema.index({ offerId: 1 });

export type DropDocument = InferSchemaType<typeof DropSchema>;
export const Drop = model("Drop", DropSchema);
