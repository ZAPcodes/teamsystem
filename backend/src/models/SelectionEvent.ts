import { Schema, model, type InferSchemaType } from "mongoose";

const SelectionEventSchema = new Schema(
  {
    selectionId: { type: Schema.Types.ObjectId, ref: "Package", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employerId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    approvalType: { type: String, enum: ["manual", "auto"], required: true },
    status: {
      type: String,
      enum: ["created", "pending", "approved", "rejected", "redeemed"],
      required: true
    },
    timestamp: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);

SelectionEventSchema.index({ employerId: 1, timestamp: -1 });
SelectionEventSchema.index({ employeeId: 1, timestamp: -1 });
SelectionEventSchema.index({ selectionId: 1, status: 1 });
SelectionEventSchema.index({ employerId: 1, status: 1, approvalType: 1 });

export type SelectionEventDocument = InferSchemaType<typeof SelectionEventSchema>;
export const SelectionEvent = model("SelectionEvent", SelectionEventSchema);
