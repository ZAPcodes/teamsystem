import bcrypt from "bcryptjs";
import { connectMongo, disconnectMongo } from "../db/mongo.js";
import {
  Company,
  Drop,
  EmployeeAllowance,
  EmployerPolicy,
  LedgerEntry,
  Notification,
  Offer,
  Package,
  PackageLine,
  Provider,
  SelectionEvent,
  User,
  Voucher,
  Wallet,
  UserProgress,
  Quest,
  BenefitRequest,
  ActivityFeedItem,
  ProviderMonthlyStat,
  DemandCampaign,
  PooledCart,
  ComplianceReview,
  TelegramLinkCode,
  Gift
} from "../models/index.js";
import { settlePackage } from "../services/ledger.service.js";
import { seedDefaultQuests } from "../services/gamification.service.js";
import { seedDemoShowcase, printDemoGuide } from "./seed-demo-showcase.js";
import { initialsForName } from "../utils/identity.js";
import { nextPeriodReset } from "../utils/period.js";
import { nanoid } from "nanoid";

const password = "demo123";

async function resetCollections() {
  await Promise.all([
    Company.deleteMany({}),
    EmployerPolicy.deleteMany({}),
    User.deleteMany({}),
    EmployeeAllowance.deleteMany({}),
    Provider.deleteMany({}),
    Offer.deleteMany({}),
    Drop.deleteMany({}),
    Package.deleteMany({}),
    PackageLine.deleteMany({}),
    Wallet.deleteMany({}),
    LedgerEntry.deleteMany({}),
    Voucher.deleteMany({}),
    Notification.deleteMany({}),
    SelectionEvent.deleteMany({}),
    UserProgress.deleteMany({}),
    Quest.deleteMany({}),
    BenefitRequest.deleteMany({}),
    DemandCampaign.deleteMany({}),
    PooledCart.deleteMany({}),
    ComplianceReview.deleteMany({}),
    TelegramLinkCode.deleteMany({}),
    Gift.deleteMany({}),
    ActivityFeedItem.deleteMany({}),
    ProviderMonthlyStat.deleteMany({})
  ]);
}

async function main() {
  await connectMongo();
  await resetCollections();

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const activeDropStart = new Date(now.getTime() - 1000 * 60 * 60);
  const activeDropEnd = new Date(now.getTime() + 1000 * 60 * 60 * 48);

  const acme = await Company.create({
    name: "Acme Albania",
    country: "AL",
    currency: "ALL",
    locale: "sq",
    walletBalance: 2_000_000,
    employerProfile: {
      displayName: "Vodafone Albania",
      industry: "Telecommunications",
      employeeCount: 72
    }
  });

  const mulliri = await Company.create({
    name: "Mulliri Group",
    country: "AL",
    currency: "ALL",
    locale: "sq",
    walletBalance: 250_000,
    employerProfile: {
      displayName: "Mulliri Group",
      industry: "Hospitality",
      employeeCount: 44
    },
    providerProfile: {
      displayName: "Mulliri Vjeter",
      categories: ["food"],
      description: "Cafe treats and team lunches across Tirana",
      logoUrl: "https://picsum.photos/seed/mulliri/800/500"
    }
  });

  await EmployerPolicy.create([
    {
      companyId: acme._id,
      perEmployeeAllowance: 20_000,
      resetPeriod: "quarterly",
      allowedCategories: ["wellness", "food", "learning", "travel", "lifestyle"],
      autoApproveThreshold: 3_000,
      currency: "ALL"
    },
    {
      companyId: mulliri._id,
      perEmployeeAllowance: 12_000,
      resetPeriod: "monthly",
      allowedCategories: ["food", "wellness", "lifestyle"],
      autoApproveThreshold: 2_000,
      currency: "ALL"
    }
  ]);

  const providerCompanies = await Company.create([
    { name: "Soma Wellness", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Espa Tirana", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Pazari i Ri Bistro", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Riviera Express", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Shkolla Italiana Tirana", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Bolt Albania", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Clinica Hygeia", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "ImpactHub Tirana", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Kinema Millennium", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Conad Tirana", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "ALBtelecom", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "Outdoor Albania", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 },
    { name: "One Albania", country: "AL", currency: "ALL", locale: "sq", walletBalance: 0 }
  ]);

  const providerSpecs = [
    [providerCompanies[0], "Soma Wellness", "wellness", "Blloku, Tirana", "Gym access, classes, and recovery amenities"],
    [providerCompanies[1], "Espa Tirana", "wellness", "Tirana e Re", "Licensed massage and spa treatments"],
    [providerCompanies[2], "Pazari i Ri Bistro", "food", "Pazari i Ri, Tirana", "Seasonal Albanian cooking in the old bazaar"],
    [providerCompanies[3], "Riviera Express", "travel", "Tirana to Vlore", "Weekend transfers and coastal breaks"],
    [providerCompanies[4], "Shkolla Italiana Tirana", "learning", "Blloku, Tirana", "Small-group language courses"],
    [providerCompanies[5], "Bolt Albania", "lifestyle", "Nationwide", "Urban mobility credit"],
    [providerCompanies[6], "Clinica Hygeia", "wellness", "Tirana e Re", "Preventive checks and consultations"],
    [providerCompanies[7], "ImpactHub Tirana", "lifestyle", "Rruga Ismail Qemali", "Coworking and founder community"],
    [providerCompanies[8], "Kinema Millennium", "lifestyle", "Tirana Centre", "Cinema tickets and events"],
    [providerCompanies[9], "Conad Tirana", "food", "Blloku, Tirana", "Groceries and daily essentials"],
    [providerCompanies[10], "ALBtelecom", "lifestyle", "Nationwide", "Mobile top-ups and connectivity"],
    [providerCompanies[11], "Outdoor Albania", "travel", "Theth and Valbona", "Certified guides and mountain trips"],
    [providerCompanies[12], "One Albania", "lifestyle", "Nationwide", "Mobile plans, devices, and telecom perks"],
    [mulliri, "Mulliri Vjeter", "food", "Tirana", "Cafe cards and team lunches"]
  ] as const;

  const providerIndustries: Record<string, string> = {
    "One Albania": "Telecommunications",
    "ALBtelecom": "Telecommunications",
    "Pazari i Ri Bistro": "Food & Hospitality"
  };

  const providers = await Provider.create(
    providerSpecs.map(([company, name, category, _location, description]) => ({
      companyId: company._id,
      name,
      category,
      industry: providerIndustries[name] ?? category,
      complianceDemoSentiment: name === "Pazari i Ri Bistro",
      country: "AL",
      description,
      logoUrl: `https://picsum.photos/seed/${name.toLowerCase().replace(/\s+/g, "-")}/300/200`
    }))
  );

  const offerSpecs = [
    [providers[0], "Monthly gym membership", "Full access to equipment, classes, and the rooftop sauna on Rruga e Elbasanit.", 8500, "soma-gym"],
    [providers[0], "Weekend yoga drop-in", "Two guided yoga sessions and one sauna visit.", 1800, "soma-yoga"],
    [providers[1], "60-min deep tissue massage", "A proper reset with pressure-point work by a licensed therapist.", 5200, "espa-spa"],
    [providers[1], "Sauna and tea ritual", "A quiet evening recovery slot with herbal tea.", 2200, "espa-sauna"],
    [providers[2], "Lunch for two - set menu", "Three courses of seasonal Albanian cooking in the heart of the old bazaar.", 4800, "pazari-food"],
    [providers[2], "Artigiano lunch pass", "A 1,500 ALL lunch credit mapped to partner bistros including Pazari i Ri.", 1500, "artigiano-lunch"],
    [providers[2], "Weekday lunch reset", "A balanced lunch plate and fresh juice.", 1400, "pazari-lunch"],
    [providers[3], "Vlore weekend - hotel + transfer", "Two nights at a seafront guesthouse with private minibus from Tirana.", 18500, "vlora-beach"],
    [providers[3], "Dajti sunset escape", "A guided late-afternoon trip just outside Tirana.", 6500, "dajti"],
    [providers[4], "Italian language course - A1", "Eight weeks, twice a week, small group, taught by a native speaker.", 12400, "italian-class"],
    [providers[4], "Italian starter workshop", "A one-day starter session for travel basics.", 2500, "italian-workshop"],
    [providers[5], "Bolt ride credit - 2,000 ALL", "Pre-loaded credit applied directly to your Bolt account.", 2000, "bolt-ride"],
    [providers[5], "Airport transfer credit", "A fixed transfer credit for Rinas airport rides.", 3200, "bolt-airport"],
    [providers[6], "Annual health check-up", "Full blood panel, ECG, and a 20-minute consultation with a GP.", 9800, "hygeia-clinic"],
    [providers[6], "Nutrition consult", "One private nutrition consult and follow-up plan.", 3600, "nutrition"],
    [providers[7], "Coworking day pass - 5 days", "Hot-desk access, fast wifi, and free coffee at Tirana's main startup hub.", 3500, "impacthub-cowork"],
    [providers[7], "Focus room afternoon", "A quiet meeting room for deep work or team planning.", 2400, "focus-room"],
    [providers[8], "Cineplexx movie pass", "One standard ticket for any weekday showing at Kinema Millennium.", 700, "cineplexx-pass"],
    [providers[8], "Cinema night - 4 tickets", "Four standard seats for any showing, including weekend premieres.", 2800, "cinema-tirana"],
    [providers[8], "Premiere pair", "Two premiere seats plus popcorn.", 1900, "cinema-pair"],
    [providers[9], "Grocery voucher - 3,000 ALL", "Redeemable at any Conad branch in Tirana; no minimum spend.", 3000, "conad-grocery"],
    [providers[9], "Healthy grocery box", "Curated weekly essentials and fresh produce.", 2800, "healthy-box"],
    [providers[10], "Mobile top-up - 1,500 ALL", "Data and calls credit added to your ALBtelecom number within the hour.", 1500, "albtelecom"],
    [providers[10], "Home internet booster", "A one-month speed booster for remote-work days.", 2600, "internet-booster"],
    [providers[11], "Accursed Mountains guided trek", "A two-day hike through the Albanian Alps with a certified mountain guide.", 14000, "albania-mountains"],
    [providers[11], "Escape room team package", "Private escape room for up to six colleagues — puzzles, locks, and a victory drink after.", 8000, "escape-room-team"],
    [providers[11], "Theth day planning session", "Route planning and gear checklist with a mountain guide.", 2100, "theth-plan"],
    [providers[12], "5G device bundle", "Employee handset upgrade with 12-month data plan from One Albania.", 3000, "one-albania-device"],
    [providers[12], "Team mobile top-up", "Shared mobile credit for field teams on the One Albania network.", 2500, "one-albania-topup"],
    [providers[13], "Coffee card", "Five cafe drinks at Mulliri Vjeter locations.", 1500, "mulliri-coffee"],
    [providers[13], "Team breakfast tray", "A breakfast tray for a small team.", 4200, "mulliri-breakfast"]
  ] as const;

  const offers = await Offer.create(
    offerSpecs.map(([provider, title, description, price, seed], index) => {
      const row = {
        providerId: provider._id,
        title,
        description,
        category: provider.category,
        price,
        currency: "ALL",
        imageUrl: `https://picsum.photos/seed/${seed}/800/500`,
        isLimited: index === 2 || index === 18,
        inventoryRemaining: index === 2 ? 3 : index === 18 ? 5 : undefined,
        expiresAt: index === 2 || index === 18 ? activeDropEnd : undefined,
        visibility: (index === 6 ? "exclusive" : "public") as "public" | "exclusive",
        isActive: true,
        ...(index === 6 ? { exclusiveCompanyIds: [acme._id] } : {})
      };
      return row;
    })
  );

  const users = await User.create([
    {
      name: "Elira Hoxha",
      email: "elira@acme.test",
      passwordHash,
      avatarUrl: "https://picsum.photos/seed/elira/300/300",
      initials: "EH",
      locale: "sq",
      preferences: ["wellness", "food", "lifestyle"],
      roles: ["employee"],
      companyId: acme._id,
      departmentId: "product"
    },
    {
      name: "Ardit Kola",
      email: "ardit@acme.test",
      passwordHash,
      initials: "AK",
      locale: "sq",
      preferences: ["learning", "lifestyle"],
      roles: ["employee"],
      companyId: acme._id,
      departmentId: "product"
    },
    {
      name: "Mira Dervishi",
      email: "mira@acme.test",
      passwordHash,
      initials: "MD",
      locale: "sq",
      preferences: ["wellness"],
      roles: ["employee"],
      companyId: acme._id,
      departmentId: "people"
    },
    {
      name: "Luan Meta",
      email: "luan@acme.test",
      passwordHash,
      initials: "LM",
      locale: "sq",
      preferences: ["travel", "food"],
      roles: ["employee"],
      companyId: acme._id,
      departmentId: "sales"
    },
    {
      name: "Nora Prifti",
      email: "nora@acme.test",
      passwordHash,
      initials: "NP",
      locale: "sq",
      preferences: ["lifestyle", "food"],
      roles: ["employee"],
      companyId: acme._id,
      departmentId: "product"
    },
    {
      name: "Dritan Selmani",
      email: "dritan@acme.test",
      passwordHash,
      initials: "DS",
      locale: "sq",
      preferences: ["work", "learning"],
      roles: ["employer_admin", "employee"],
      companyId: acme._id
    },
    {
      name: "Espa Provider",
      email: "provider@perx.test",
      passwordHash,
      initials: "EP",
      locale: "sq",
      preferences: [],
      roles: ["provider_admin"],
      companyId: providerCompanies[1]._id
    },
    {
      name: "Mulliri Admin",
      email: "mulliri@perx.test",
      passwordHash,
      initials: initialsForName("Mulliri Admin"),
      locale: "sq",
      preferences: [],
      roles: ["employer_admin", "provider_admin"],
      companyId: mulliri._id
    }
  ]);

  const acmeEmployees = users.filter((user) => user.companyId.toString() === acme._id.toString() && user.roles.includes("employee"));
  const seedUsed = [2500, 0, 7800, 11_500, 16_000, 4200];

  await EmployeeAllowance.create(
    acmeEmployees.map((user, index) => ({
      userId: user._id,
      companyId: acme._id,
      total: 20_000,
      // Seed-only dashboard texture. In the money-loop slice this will be derived from ledger/package activity.
      used: seedUsed[index] ?? 0,
      held: 0,
      currency: "ALL",
      periodResetAt: nextPeriodReset("quarterly")
    }))
  );

  await Drop.create([
    {
      offerId: offers[2]._id,
      startsAt: activeDropStart,
      endsAt: activeDropEnd,
      badgeLabel: "48h Reset"
    },
    {
      offerId: offers[18]._id,
      startsAt: activeDropStart,
      endsAt: activeDropEnd,
      badgeLabel: "Tonight"
    }
  ]);

  // Wallets + ledger fund for employer float
  await Wallet.create({
    ownerType: "company",
    ownerId: acme._id,
    balance: acme.walletBalance,
    currency: "ALL"
  });
  await LedgerEntry.create({
    type: "fund",
    amount: acme.walletBalance,
    currency: "ALL",
    toWalletId: (await Wallet.findOne({ ownerType: "company", ownerId: acme._id }))!._id,
    meta: { reason: "seed", idempotencyKey: "seed:acme:fund" }
  });

  const elira = users.find((u) => u.email === "elira@acme.test")!;
  const ardit = users.find((u) => u.email === "ardit@acme.test")!;
  const mira = users.find((u) => u.email === "mira@acme.test")!;
  const luan = users.find((u) => u.email === "luan@acme.test")!;
  const nora = users.find((u) => u.email === "nora@acme.test")!;
  const dritan = users.find((u) => u.email === "dritan@acme.test")!;

  // Nora: near period reset with unused budget for nudge demo
  await EmployeeAllowance.updateOne(
    { userId: nora._id },
    {
      $set: {
        used: 2000,
        held: 0,
        periodResetAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3)
      }
    }
  );

  await Notification.create({
    userId: nora._id,
    type: "nudge",
    payload: {
      available: 18_000,
      periodResetAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      offerTitles: [offers[2]?.title, offers[6]?.title].filter(Boolean)
    },
    read: false
  });

  await Notification.create({
    userId: elira._id,
    type: "drop",
    payload: {
      dropId: String((await Drop.findOne({ offerId: offers[2]._id }))?._id),
      badgeLabel: "48h Reset",
      offerTitle: offers[2].title
    },
    read: false
  });

  // Settled multi-provider package for Elira (auto-approve path)
  const settledOffers = [offers[30], offers[6]]; // coffee card + weekday lunch = 2900
  const settledPkg = await Package.create({
    employeeId: elira._id,
    companyId: acme._id,
    status: "settled",
    source: "manual",
    totalSnapshot: settledOffers[0].price + settledOffers[1].price,
    currency: "ALL",
    submittedAt: now,
    decidedAt: now
  });
  const settledLines = await PackageLine.create(
    settledOffers.map((offer) => ({
      packageId: settledPkg._id,
      offerId: offer._id,
      providerId: offer.providerId,
      price: offer.price,
      currency: "ALL"
    }))
  );
  await EmployeeAllowance.updateOne(
    { userId: elira._id },
    { $inc: { used: settledPkg.totalSnapshot } }
  );
  await settlePackage(
    settledPkg._id.toString(),
    acme._id.toString(),
    settledLines.map((l) => ({ _id: l._id, providerId: l.providerId, price: l.price })) as never,
    "ALL"
  );
  const settledVouchers = await Voucher.insertMany(
    settledLines.map((line) => {
      const code = `PERX-${nanoid(8).toUpperCase()}`;
      return {
        packageLineId: line._id,
        code,
        qrPayload: `perx://redeem/${code}`,
        status: "issued"
      };
    })
  );
  await Voucher.updateOne(
    { _id: settledVouchers[0]._id },
    { $set: { status: "redeemed", redeemedAt: now } }
  );

  await SelectionEvent.create({
    selectionId: settledPkg._id,
    employeeId: elira._id,
    employerId: acme._id,
    amount: settledPkg.totalSnapshot,
    currency: "ALL",
    category: "food",
    approvalType: "auto",
    status: "approved",
    timestamp: now
  });

  // Pending approval removed — purchases settle instantly unless compliance blocks them.

  await seedDefaultQuests(acme._id);

  await UserProgress.create({
    userId: elira._id,
    companyId: acme._id,
    xp: 2480,
    level: 14,
    streakCount: 3,
    streakWeeks: 14,
    lastStreakWeek: "2026-W24",
    lastRedeemWeek: "2026-W24",
    streakFreezes: 1,
    lastRedeemAt: now,
    totalRedemptions: 12,
    bonusMilestoneGranted: true,
    officeLegends: [
      {
        providerName: "Soma Wellness",
        month: "2026-06",
        badgeLabel: "Soma Wellness Office Legend"
      }
    ]
  });

  await seedDemoShowcase({
    now,
    acmeId: acme._id,
    users: {
      elira,
      ardit,
      mira,
      luan,
      nora,
      dritan
    },
    offers: offers.map((o) => ({
      _id: o._id,
      providerId: o.providerId as never,
      price: o.price,
      title: o.title,
      category: o.category
    })),
    providers: providers.map((p) => ({ _id: p._id, name: p.name }))
  });

  console.log("Seeded Perx demo database.");
  printDemoGuide();

  await disconnectMongo();
}

void main().catch(async (error) => {
  console.error(error);
  await disconnectMongo();
  process.exit(1);
});
