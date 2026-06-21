import mongoose from "mongoose";
import { isDevelopment } from "../config/env.js";
import { Company } from "../models/Company.js";
import { Wallet } from "../models/Wallet.js";

export async function recomputeCompanyBalance(companyId: string): Promise<number> {
  if (!isDevelopment) {
    throw new Error("recomputeCompanyBalance is development-only");
  }

  const wallet = await Wallet.findOne({
    ownerType: "company",
    ownerId: new mongoose.Types.ObjectId(companyId)
  });

  if (!wallet) {
    throw new Error(`Company wallet not found for ${companyId}`);
  }

  await Company.updateOne(
    { _id: companyId },
    { $set: { walletBalance: wallet.balance } }
  );

  return wallet.balance;
}
