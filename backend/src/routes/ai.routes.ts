import { Router } from "express";
import { z } from "zod";
import {
  AiBundleRequestSchema,
  AiConciergeRequestSchema,
  AiConciergeResponseSchema,
  AiPackageResponseSchema,
  ConciergeGreetingResponseSchema
} from "../../contracts/api.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { composeAiPackage } from "../services/ai.service.js";
import { getConciergeGreeting, processConciergeMessage } from "../services/concierge.service.js";

export const aiRouter = Router();

aiRouter.use(requireAuth, requireRole("employee"));

aiRouter.get(
  "/concierge/greeting",
  asyncHandler(async (req, res) => {
    const greeting = await getConciergeGreeting(req.user!.id, req.user!.companyId);
    respond(res, ConciergeGreetingResponseSchema, greeting);
  })
);

aiRouter.post(
  "/concierge",
  validateBody(AiConciergeRequestSchema),
  asyncHandler(async (req, res) => {
    const { message, budget } = req.body as { message: string; budget?: number };
    const result = await processConciergeMessage(
      req.user!.id,
      req.user!.companyId,
      message,
      budget
    );
    respond(res, AiConciergeResponseSchema, result);
  })
);

aiRouter.post(
  "/bundle",
  validateBody(AiBundleRequestSchema),
  asyncHandler(async (req, res) => {
    const { goal, budget, demo } = req.body as {
      goal: string;
      budget: number;
      demo?: boolean;
    };
    const result = await composeAiPackage(
      req.user!.id,
      req.user!.companyId,
      goal,
      budget,
      demo === true
    );
    respond(res, AiPackageResponseSchema, result);
  })
);
