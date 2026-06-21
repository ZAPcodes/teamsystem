import { Router } from "express";
import {
  AllowanceResponseSchema,
  ActivityFeedResponseSchema,
  ActivityFeedItemDTOSchema,
  GamificationResponseSchema,
  HighFiveResponseSchema,
  NotificationsResponseSchema,
  PackagesQuerySchema,
  PackagesResponseSchema,
  PeerAdvocacyPendingResponseSchema,
  PeerAdvocacySendRequestSchema,
  PeerAdvocacySendResponseSchema,
  StreakFreezeResponseSchema,
  TelegramLinkCodeResponseSchema,
  TelegramLinkStatusResponseSchema,
  WrappedResponseSchema
} from "../../contracts/api.js";
import { z } from "zod";
import { ApiError } from "../http/ApiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { Notification } from "../models/Notification.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { loadEmployeePackages } from "../services/package.service.js";
import { getWrappedStats, runBudgetBurnNudges } from "../services/engagement.service.js";
import {
  buyStreakFreeze,
  getEmployeeGamification,
  runStreakDangerNudges
} from "../services/gamification.service.js";
import {
  getCompanyActivityFeed,
  sendHighFive,
  sharePackageToFeed
} from "../services/activity.service.js";
import {
  createDemoPeerAdvocacy,
  dismissPeerAdvocacy,
  getPendingPeerAdvocacy,
  sendPeerAdvocacy
} from "../services/peer-advocacy.service.js";
import { User } from "../models/User.js";
import {
  createTelegramLinkCode,
  getTelegramLinkStatus
} from "../services/telegram-actions.service.js";

export const meRouter = Router();

meRouter.get(
  "/allowance",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const allowance = await EmployeeAllowance.findOne({
      userId: req.user?.id,
      companyId: req.user?.companyId
    }).lean();

    if (!allowance) {
      throw new ApiError(404, "ALLOWANCE_NOT_FOUND", "Allowance not found");
    }

    const policy = await EmployerPolicy.findOne({ companyId: req.user?.companyId }).lean();
    const currency = policy?.currency ?? allowance.currency;

    respond(res, AllowanceResponseSchema, {
      allowance: {
        total: allowance.total,
        used: allowance.used,
        held: allowance.held,
        available: allowance.total - allowance.used - allowance.held,
        bonusAvailable: allowance.bonusAvailable ?? 0,
        bonusUsed: allowance.bonusUsed ?? 0,
        currency,
        periodResetAt: allowance.periodResetAt.toISOString(),
        allowedCategories: policy?.allowedCategories ?? []
      }
    });
  })
);

meRouter.get(
  "/packages",
  requireAuth,
  requireRole("employee"),
  validateQuery(PackagesQuerySchema),
  asyncHandler(async (req, res) => {
    const status = (req.query as { status?: string }).status;
    const packages = await loadEmployeePackages(req.user!.id);

    respond(res, PackagesResponseSchema, {
      packages: status ? packages.filter((pkg) => pkg.status === status) : packages
    });
  })
);

meRouter.get(
  "/notifications",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    respond(res, NotificationsResponseSchema, {
      notifications: notifications.map((n) => ({
        id: String(n._id),
        type: n.type,
        payload: n.payload,
        read: n.read,
        createdAt: n.createdAt.toISOString()
      }))
    });
  })
);

meRouter.post(
  "/notifications/:id/read",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.user!.id },
      { $set: { read: true } }
    );
    respond(res, z.object({ ok: z.boolean() }), { ok: true });
  })
);

meRouter.post(
  "/progress/streak-freeze",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const result = await buyStreakFreeze(req.user!.id, req.user!.companyId);
    respond(res, StreakFreezeResponseSchema, result);
  })
);

meRouter.get(
  "/activity/feed",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const items = await getCompanyActivityFeed(req.user!.companyId, req.user!.id);
    respond(res, ActivityFeedResponseSchema, { items });
  })
);

meRouter.post(
  "/activity/:id/high-five",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const result = await sendHighFive({
      feedItemId: String(req.params.id),
      fromUserId: req.user!.id,
      companyId: req.user!.companyId
    });
    respond(res, HighFiveResponseSchema, result);
  })
);

meRouter.post(
  "/activity/share",
  requireAuth,
  requireRole("employee"),
  validateBody(z.object({ packageId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { packageId } = req.body as { packageId: string };
    const item = await sharePackageToFeed({
      userId: req.user!.id,
      companyId: req.user!.companyId,
      packageId
    });
    respond(res, z.object({ item: ActivityFeedItemDTOSchema.nullable() }), { item });
  })
);

meRouter.get(
  "/progress",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const data = await getEmployeeGamification(req.user!.id, req.user!.companyId);
    respond(res, GamificationResponseSchema, data);
  })
);

meRouter.patch(
  "/locale",
  requireAuth,
  validateBody(z.object({ locale: z.enum(["en", "sq", "sq-AL"]) })),
  asyncHandler(async (req, res) => {
    const { locale } = req.body as { locale: string };
    await User.updateOne({ _id: req.user!.id }, { $set: { locale } });
    respond(res, z.object({ locale: z.string() }), { locale });
  })
);

meRouter.get(
  "/wrapped",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const stats = await getWrappedStats(req.user!.id, req.user!.companyId);
    respond(res, WrappedResponseSchema, stats);
  })
);

meRouter.post(
  "/nudges/run",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const budget = await runBudgetBurnNudges(req.user!.companyId);
    const streak = await runStreakDangerNudges(req.user!.companyId);
    respond(res, z.object({ nudged: z.number().int(), streakNudged: z.number().int() }), {
      nudged: budget.nudged,
      streakNudged: streak.nudged
    });
  })
);

meRouter.get(
  "/peer-advocacy/pending",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const advocacy = await getPendingPeerAdvocacy(req.user!.id);
    respond(res, PeerAdvocacyPendingResponseSchema, { advocacy });
  })
);

meRouter.post(
  "/peer-advocacy/demo",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const advocacy = await createDemoPeerAdvocacy(req.user!.id, req.user!.companyId);
    respond(res, PeerAdvocacyPendingResponseSchema, { advocacy });
  })
);

meRouter.post(
  "/peer-advocacy/:id/send",
  requireAuth,
  requireRole("employee"),
  validateBody(PeerAdvocacySendRequestSchema),
  asyncHandler(async (req, res) => {
    const { toUserId } = req.body as { toUserId: string };
    const result = await sendPeerAdvocacy({
      actorUserId: req.user!.id,
      advocacyId: String(req.params.id),
      toUserId
    });
    respond(res, PeerAdvocacySendResponseSchema, result);
  })
);

meRouter.post(
  "/peer-advocacy/:id/dismiss",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const result = await dismissPeerAdvocacy(req.user!.id, String(req.params.id));
    respond(res, z.object({ ok: z.boolean() }), result);
  })
);

meRouter.post(
  "/telegram/link-code",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const result = await createTelegramLinkCode(req.user!.id);
    respond(res, TelegramLinkCodeResponseSchema, result);
  })
);

meRouter.get(
  "/telegram/status",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const result = await getTelegramLinkStatus(req.user!.id);
    respond(res, TelegramLinkStatusResponseSchema, result);
  })
);
