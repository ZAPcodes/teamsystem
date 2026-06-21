import { nanoid } from "nanoid";
import mongoose from "mongoose";
import type { Types } from "mongoose";
import {
  ActivityFeedItem,
  BenefitRequest,
  ComplianceReview,
  EmployeeAllowance,
  Gift,
  Notification,
  Package,
  PackageLine,
  PooledCart,
  SelectionEvent,
  User,
  Voucher
} from "../models/index.js";
import { settlePackage } from "../services/ledger.service.js";
import { createPeerAdvocacyPrompt, suggestPeerAdvocacyColleagues } from "../services/peer-advocacy.service.js";

type Id = Types.ObjectId;

interface SeedCtx {
  now: Date;
  acmeId: Id;
  users: {
    elira: { _id: Id };
    ardit: { _id: Id; name: string; initials: string };
    mira: { _id: Id; name: string };
    luan: { _id: Id; name: string };
    nora: { _id: Id; name: string; initials: string };
    dritan: { _id: Id };
  };
  offers: Array<{
    _id: Id;
    providerId: Id;
    price: number;
    title: string;
    category: string;
  }>;
  providers: Array<{ _id: Id; name: string }>;
}

async function seedSettledPackage(
  ctx: SeedCtx,
  input: {
    employeeId: Id;
    offerIndexes: number[];
    source?: "manual" | "ai" | "pooled";
    aiReason?: string;
    redeemLineIndexes?: number[];
    selectionStatus?: "approved" | "redeemed";
  }
) {
  const picked = input.offerIndexes.map((i) => ctx.offers[i]);
  const total = picked.reduce((sum, o) => sum + o.price, 0);
  const submittedAt = new Date(ctx.now.getTime() - 1000 * 60 * 60 * 24 * (3 + input.offerIndexes.length));

  const pkg = await Package.create({
    employeeId: input.employeeId,
    companyId: ctx.acmeId,
    status: "settled",
    source: input.source ?? "manual",
    totalSnapshot: total,
    currency: "ALL",
    submittedAt,
    decidedAt: submittedAt,
    aiReason: input.aiReason
  });

  const lines = await PackageLine.create(
    picked.map((offer) => ({
      packageId: pkg._id,
      offerId: offer._id,
      providerId: offer.providerId,
      price: offer.price,
      currency: "ALL"
    }))
  );

  await EmployeeAllowance.updateOne({ userId: input.employeeId, companyId: ctx.acmeId }, { $inc: { used: total } });

  await settlePackage(
    pkg._id.toString(),
    ctx.acmeId.toString(),
    lines.map((l) => ({ _id: l._id, providerId: l.providerId, price: l.price })) as never,
    "ALL"
  );

  const vouchers = await Voucher.insertMany(
    lines.map((line) => {
      const code = `PERX-${nanoid(8).toUpperCase()}`;
      return {
        packageLineId: line._id,
        code,
        qrPayload: `perx://redeem/${code}`,
        status: "issued" as const
      };
    })
  );

  for (const lineIndex of input.redeemLineIndexes ?? []) {
    const voucher = vouchers[lineIndex];
    if (voucher) {
      await Voucher.updateOne(
        { _id: voucher._id },
        { $set: { status: "redeemed", redeemedAt: ctx.now } }
      );
    }
  }

  const primaryCategory = picked[0]?.category ?? "mixed";
  await SelectionEvent.create({
    selectionId: pkg._id,
    employeeId: input.employeeId,
    employerId: ctx.acmeId,
    amount: total,
    currency: "ALL",
    category: primaryCategory,
    approvalType: "auto",
    status: input.selectionStatus ?? (input.redeemLineIndexes?.length ? "redeemed" : "approved"),
    timestamp: submittedAt
  });

  return { pkg, lines, vouchers, picked };
}

export async function seedDemoShowcase(ctx: SeedCtx) {
  const { elira, ardit, mira, luan, nora, dritan } = ctx.users;

  // Telegram demo wallets on primary employee
  await User.updateOne(
    { _id: elira._id },
    {
      $set: {
        telegramFoodBalance: 4500,
        telegramWellnessBalance: 1200,
        telegramLifestyleBalance: 900,
        telegramTravelBalance: 800,
        telegramLearningBalance: 4500
      }
    }
  );

  // Rich claim history + Wrapped stats (lifestyle, wellness, travel)
  const moviePkg = await seedSettledPackage(ctx, {
    employeeId: elira._id,
    offerIndexes: [17],
    redeemLineIndexes: [0],
    selectionStatus: "redeemed"
  });

  await seedSettledPackage(ctx, {
    employeeId: elira._id,
    offerIndexes: [1],
    selectionStatus: "approved"
  });

  await seedSettledPackage(ctx, {
    employeeId: elira._id,
    offerIndexes: [8],
    selectionStatus: "approved"
  });

  await seedSettledPackage(ctx, {
    employeeId: elira._id,
    offerIndexes: [10],
    source: "ai",
    aiReason: "Bundled Bolt credit with Italian workshop for a learning weekend.",
    selectionStatus: "approved"
  });

  // Peer advocacy — pending prompt after movie redemption
  await createPeerAdvocacyPrompt({
    userId: elira._id.toString(),
    companyId: ctx.acmeId.toString(),
    vendorName: ctx.providers[8]?.name ?? "Kinema Millennium",
    offerTitle: moviePkg.picked[0]?.title ?? "Cineplexx movie pass",
    category: "lifestyle",
    voucherCode: moviePkg.vouchers[0]?.code
  });

  // Activity feed + high-five
  await ActivityFeedItem.create({
    companyId: ctx.acmeId,
    userId: elira._id,
    userName: "Elira Hoxha",
    message: "claimed a movie night perk",
    packageId: moviePkg.pkg._id,
    offerTitles: [moviePkg.picked[0]?.title].filter(Boolean),
    highFiveCount: 2,
    highFivedBy: [nora._id, ardit._id]
  });

  await ActivityFeedItem.create({
    companyId: ctx.acmeId,
    userId: nora._id,
    userName: "Nora Prifti",
    message: "claimed coworking passes for the product sprint",
    offerTitles: [ctx.offers[15]?.title].filter(Boolean),
    highFiveCount: 1,
    highFivedBy: [elira._id]
  });

  // Gift waiting for Elira
  await Gift.create({
    fromUserId: nora._id,
    toUserId: elira._id,
    offerId: ctx.offers[29]?._id,
    amount: ctx.offers[29]?.price ?? 1500,
    currency: "ALL",
    message: "Coffee on me before the retro ☕",
    status: "sent",
    expiresAt: new Date(ctx.now.getTime() + 1000 * 60 * 60 * 24 * 14)
  });

  await Notification.create({
    userId: elira._id,
    type: "gift",
    payload: {
      fromName: "Nora Prifti",
      amount: ctx.offers[29]?.price ?? 1500,
      currency: "ALL",
      message: "Coffee on me before the retro ☕"
    },
    read: false
  });

  // Off-catalog benefit request (employer benefit-requests page)
  await BenefitRequest.create({
    employeeId: mira._id,
    companyId: ctx.acmeId,
    originalMessage: "Can we add a local pottery workshop for team creativity days?",
    items: [
      {
        name: "Tirana Pottery Studio — team session",
        description: "Private 2-hour wheel-throwing class for up to 8 people in Blloku.",
        link: "https://example.com/pottery-tirana",
        phone: "+355 69 000 0000",
        category: "lifestyle"
      }
    ],
    status: "pending"
  });

  await Notification.create({
    userId: dritan._id,
    type: "benefit_request",
    payload: {
      employeeName: "Mira Dervishi",
      itemCount: 1,
      status: "pending"
    },
    read: false
  });

  // Compliance flags for employer dashboard
  const oneAlbaniaOffer = ctx.offers[27];
  const pazariOffer = ctx.offers[4];
  const oneProvider = ctx.providers[12];
  const pazariProvider = ctx.providers[2];

  if (oneAlbaniaOffer && oneProvider) {
    await ComplianceReview.create({
      employeeId: luan._id,
      employeeName: luan.name,
      companyId: ctx.acmeId,
      offerId: oneAlbaniaOffer._id,
      offerTitle: oneAlbaniaOffer.title,
      providerId: oneProvider._id,
      providerName: oneProvider.name,
      employerName: "Vodafone Albania",
      employerIndustry: "Telecommunications",
      providerIndustry: "Telecommunications",
      amount: oneAlbaniaOffer.price,
      currency: "ALL",
      status: "pending_manual_approval",
      competitorFlag: true,
      sentimentFlag: false,
      reason: "One Albania is flagged as a direct telecom competitor to Vodafone Albania.",
      headlines: []
    });
  }

  if (pazariOffer && pazariProvider) {
    await ComplianceReview.create({
      employeeId: mira._id,
      employeeName: mira.name,
      companyId: ctx.acmeId,
      offerId: pazariOffer._id,
      offerTitle: pazariOffer.title,
      providerId: pazariProvider._id,
      providerName: pazariProvider.name,
      employerName: "Vodafone Albania",
      employerIndustry: "Telecommunications",
      providerIndustry: "Food & Hospitality",
      amount: pazariOffer.price,
      currency: "ALL",
      status: "pending_manual_approval",
      competitorFlag: false,
      sentimentFlag: true,
      reason: "Recent press mentions raised brand-safety concerns for this provider.",
      headlines: ["Local press: hygiene complaint at bazaar restaurant (demo headline)"]
    });
  }

  await Notification.create({
    userId: dritan._id,
    type: "compliance_flag",
    payload: {
      reviewCount: 2,
      employerName: "Vodafone Albania"
    },
    read: false
  });

  // N-way pooled cart — escape room in progress
  const escapeOffer = ctx.offers[25];
  const escapeProvider = ctx.providers[11];
  if (escapeOffer && escapeProvider) {
    const arditCommit = 4000;
    const noraCommit = 2500;

    await PooledCart.create({
      initiatorId: ardit._id,
      companyId: ctx.acmeId,
      offerId: escapeOffer._id,
      providerId: escapeProvider._id,
      offerTitle: escapeOffer.title,
      providerName: escapeProvider.name,
      targetPrice: escapeOffer.price,
      suggestedContribution: 2000,
      currency: "ALL",
      status: "pending",
      inviteCode: "DEMO24",
      committedTotal: arditCommit + noraCommit,
      contributions: [
        {
          userId: ardit._id,
          userName: ardit.name,
          userInitials: ardit.initials,
          amount: arditCommit,
          committedAt: new Date(ctx.now.getTime() - 1000 * 60 * 45)
        },
        {
          userId: nora._id,
          userName: "Nora Prifti",
          userInitials: nora.initials,
          amount: noraCommit,
          committedAt: new Date(ctx.now.getTime() - 1000 * 60 * 20)
        }
      ]
    });

    await EmployeeAllowance.updateOne(
      { userId: ardit._id, companyId: ctx.acmeId },
      { $inc: { held: arditCommit } }
    );
    await EmployeeAllowance.updateOne(
      { userId: nora._id, companyId: ctx.acmeId },
      { $inc: { held: noraCommit } }
    );

    await Notification.create({
      userId: ardit._id,
      type: "pooled_cart",
      payload: {
        inviteCode: "DEMO24",
        offerTitle: escapeOffer.title,
        committedTotal: arditCommit + noraCommit,
        targetPrice: escapeOffer.price
      },
      read: false
    });
  }

  // Extra wrapped event for learning category
  await SelectionEvent.create({
    selectionId: new mongoose.Types.ObjectId(),
    employeeId: elira._id,
    employerId: ctx.acmeId,
    amount: ctx.offers[10]?.price ?? 2500,
    currency: "ALL",
    category: "learning",
    approvalType: "auto",
    status: "approved",
    timestamp: new Date(ctx.now.getTime() - 1000 * 60 * 60 * 24 * 12)
  });

  // Ensure colleagues exist for peer advocacy demo endpoint
  await suggestPeerAdvocacyColleagues(elira._id.toString(), ctx.acmeId.toString(), "food");
}

export function printDemoGuide() {
  const line = "─".repeat(56);
  console.log(`\n${line}`);
  console.log("PERX DEMO — login accounts (password for all: demo123)");
  console.log(line);
  console.log("\nEMPLOYEE (primary demo)");
  console.log("  elira@acme.test     History, Wrapped, Progress, Telegram, Bora");
  console.log("  nora@acme.test      Budget nudge, pooled cart contributor");
  console.log("  ardit@acme.test     Pooled cart host — invite code DEMO24");
  console.log("  mira@acme.test      Pending benefit request");
  console.log("  luan@acme.test      Compliance-blocked telecom perk");
  console.log("\nEMPLOYER ADMIN");
  console.log("  dritan@acme.test    Compliance queue, insights, employees");
  console.log("  mulliri@perx.test   Dual employer + provider admin");
  console.log("\nPROVIDER");
  console.log("  provider@perx.test  Espa Tirana — scan vouchers, earnings");
  console.log(line);
  console.log("\nFEATURE CHEAT SHEET");
  console.log("  Marketplace      Drops, POS bundler, compliance on One Albania + Pazari");
  console.log("  Progress         XP, quests, Telegram link card");
  console.log("  History          elira@ — multiple settled vouchers");
  console.log("  Gift             elira@ — gift from Nora waiting");
  console.log("  Wrapped          elira@ — persona + category stats");
  console.log("  Team pool        /marketplace/pool/DEMO24 (ardit@ or nora@)");
  console.log("  Peer advocacy    History → demo trigger, or redeem movie voucher as elira@");
  console.log("  Employer         dritan@ → Compliance (2 flags), Benefit requests");
  console.log("  Telegram bot     Progress → generate code → /start in Telegram");
  console.log(`${line}\n`);
}
