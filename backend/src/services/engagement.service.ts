import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Notification } from "../models/Notification.js";
import { Offer } from "../models/Offer.js";
import { SelectionEvent } from "../models/SelectionEvent.js";
import { User } from "../models/User.js";

export async function runBudgetBurnNudges(companyId?: string) {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const allowanceQuery: Record<string, unknown> = {
    periodResetAt: { $lte: weekFromNow, $gte: now }
  };
  if (companyId) {
    allowanceQuery.companyId = companyId;
  }

  const allowances = await EmployeeAllowance.find(allowanceQuery).lean();
  let nudged = 0;

  for (const allowance of allowances) {
    const available = allowance.total - allowance.used - allowance.held;
    if (available <= 0 || available < allowance.total * 0.5) continue;

    const policy = await EmployerPolicy.findOne({ companyId: allowance.companyId }).lean();
    if (!policy) continue;

    const offers = await Offer.find({
      isActive: true,
      category: { $in: policy.allowedCategories },
      currency: policy.currency,
      price: { $lte: available },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    })
      .sort({ price: -1 })
      .limit(3)
      .lean();

    if (offers.length === 0) continue;

    const existing = await Notification.findOne({
      userId: allowance.userId,
      type: "nudge",
      createdAt: { $gte: new Date(now.getTime() - 1000 * 60 * 60 * 24) }
    }).lean();
    if (existing) continue;

    await Notification.create({
      userId: allowance.userId,
      type: "nudge",
      payload: {
        available,
        periodResetAt: allowance.periodResetAt.toISOString(),
        offerIds: offers.map((o) => String(o._id)),
        offerTitles: offers.map((o) => o.title)
      },
      read: false
    });
    nudged += 1;
  }

  return { nudged };
}

export async function getWrappedStats(userId: string, companyId: string) {
  const events = await SelectionEvent.find({
    employeeId: userId,
    employerId: companyId,
    status: { $in: ["approved", "redeemed"] }
  }).lean();

  const savedAmount = events.reduce((sum, e) => sum + e.amount, 0);
  const currency = events[0]?.currency ?? "ALL";

  const categoryCounts = new Map<string, number>();
  for (const event of events) {
    categoryCounts.set(event.category, (categoryCounts.get(event.category) ?? 0) + 1);
  }

  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "wellness";
  const redeemedCount = events.filter((e) => e.status === "redeemed").length;
  const categoryDiversity = categoryCounts.size;

  let persona = "Explorer";
  if (categoryDiversity <= 1) persona = "Specialist";
  else if (categoryDiversity >= 4) persona = "Renaissance";
  else if (topCategory === "wellness") persona = "Reset Seeker";
  else if (topCategory === "food") persona = "Social Eater";

  return {
    savedAmount,
    currency,
    topCategory,
    topProviders: [],
    redeemedCount,
    persona,
    categoryDiversity
  };
}

export async function listColleagues(companyId: string, excludeUserId: string) {
  const users = await User.find({
    companyId,
    roles: "employee",
    _id: { $ne: excludeUserId }
  })
    .select("name email initials avatarUrl")
    .lean();

  return users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    initials: u.initials,
    avatarUrl: u.avatarUrl ?? undefined
  }));
}
