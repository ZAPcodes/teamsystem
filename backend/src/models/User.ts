import { Schema, model, type InferSchemaType } from "mongoose";

const SessionTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, required: true, default: Date.now }
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: String,
    initials: { type: String, required: true, trim: true },
    locale: { type: String, required: true, default: "sq-AL" },
    preferences: [{ type: String, required: true }],
    roles: [{
      type: String,
      enum: ["employee", "employer_admin", "provider_admin"],
      required: true
    }],
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    departmentId: { type: String, trim: true },
    telegramChatId: { type: String, trim: true, sparse: true, unique: true },
    telegramLinkedAt: Date,
    telegramFoodBalance: { type: Number, min: 0 },
    telegramWellnessBalance: { type: Number, min: 0 },
    telegramLifestyleBalance: { type: Number, min: 0 },
    telegramTravelBalance: { type: Number, min: 0 },
    telegramLearningBalance: { type: Number, min: 0 },
    sessionTokens: [SessionTokenSchema]
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ companyId: 1, roles: 1 });
UserSchema.index({ preferences: 1 });

export type UserDocument = InferSchemaType<typeof UserSchema>;
export const User = model("User", UserSchema);
