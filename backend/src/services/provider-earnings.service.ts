import { LedgerEntry } from "../models/LedgerEntry.js";
import { Package } from "../models/Package.js";
import { PackageLine } from "../models/PackageLine.js";
import { Provider } from "../models/Provider.js";
import { Company } from "../models/Company.js";
import { getOrCreateWallet } from "./ledger.service.js";

export async function getProviderEarnings(companyId: string) {
  const [provider, company] = await Promise.all([
    Provider.findOne({ companyId }).lean(),
    Company.findById(companyId).lean()
  ]);

  if (!provider || !company) {
    return null;
  }

  const currency = company.currency;
  const wallet = await getOrCreateWallet("provider", companyId, currency);

  const lines = await PackageLine.find({ providerId: provider._id }).lean();
  const packageIds = [...new Set(lines.map((line) => line.packageId.toString()))];

  const packages = packageIds.length
    ? await Package.find({
        _id: { $in: packageIds },
        status: { $in: ["pending", "approved"] }
      }).lean()
    : [];

  const pendingPackageIds = new Set(packages.map((pkg) => pkg._id.toString()));
  const pendingSettlements = lines
    .filter((line) => pendingPackageIds.has(line.packageId.toString()))
    .map((line) => {
      const pkg = packages.find((p) => p._id.toString() === line.packageId.toString());
      return {
        packageId: line.packageId.toString(),
        packageLineId: line._id.toString(),
        amount: line.price,
        currency: line.currency,
        status: pkg?.status ?? "pending",
        submittedAt: pkg?.submittedAt?.toISOString()
      };
    });

  const pendingTotal = pendingSettlements.reduce((sum, row) => sum + row.amount, 0);

  const recentEntries = await LedgerEntry.find({
    toWalletId: wallet._id,
    type: "settle"
  })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const recentSettlements = recentEntries.map((entry) => ({
    type: "settle" as const,
    amount: entry.amount,
    currency: entry.currency,
    createdAt: entry.createdAt.toISOString()
  }));

  const settledTotal = recentSettlements.reduce((sum, row) => sum + row.amount, 0);

  return {
    balance: wallet.balance,
    currency,
    pendingTotal,
    pendingCount: pendingSettlements.length,
    settledTotal,
    pendingSettlements,
    recentSettlements
  };
}
