import { Router } from "express";
import { z } from "zod";
import {
  CreateGiftRequestSchema,
  GiftResponseSchema
} from "../../contracts/api.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { claimGift, createGift } from "../services/gift.service.js";
import { listColleagues } from "../services/engagement.service.js";

const ColleaguesResponseSchema = z.object({
  colleagues: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    initials: z.string(),
    avatarUrl: z.string().url().optional()
  }))
});

export const giftRouter = Router();

giftRouter.use(requireAuth, requireRole("employee"));

giftRouter.get(
  "/colleagues",
  asyncHandler(async (req, res) => {
    const colleagues = await listColleagues(req.user!.companyId, req.user!.id);
    respond(res, ColleaguesResponseSchema, { colleagues });
  })
);

giftRouter.post(
  "/",
  validateBody(CreateGiftRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as {
      toUserId: string;
      amount: number;
      currency: string;
      message: string;
      offerId?: string;
    };
    const gift = await createGift({
      fromUserId: req.user!.id,
      companyId: req.user!.companyId,
      ...body
    });
    respond(res, GiftResponseSchema, { gift }, 201);
  })
);

giftRouter.post(
  "/:id/claim",
  asyncHandler(async (req, res) => {
    const gift = await claimGift(String(req.params.id), req.user!.id);
    respond(res, GiftResponseSchema, { gift });
  })
);
