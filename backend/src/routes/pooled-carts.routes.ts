import { Router } from "express";
import {
  CommitPooledCartRequestSchema,
  CreatePooledCartRequestSchema,
  PooledCartResponseSchema
} from "../../contracts/api.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  cancelPooledCart,
  commitToPooledCart,
  createPooledCart,
  getPooledCartByInvite
} from "../services/pooled-cart.service.js";

export const pooledCartRouter = Router();

pooledCartRouter.post(
  "/",
  requireAuth,
  requireRole("employee"),
  validateBody(CreatePooledCartRequestSchema),
  asyncHandler(async (req, res) => {
    const { offerId, initialCommit } = req.body as { offerId: string; initialCommit: number };
    const cart = await createPooledCart({
      userId: req.user!.id,
      companyId: req.user!.companyId,
      offerId,
      initialCommit
    });
    respond(res, PooledCartResponseSchema, { cart });
  })
);

pooledCartRouter.get(
  "/invite/:code",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const cart = await getPooledCartByInvite(
      String(req.params.code),
      req.user!.id,
      req.user!.companyId
    );
    respond(res, PooledCartResponseSchema, { cart });
  })
);

pooledCartRouter.post(
  "/invite/:code/commit",
  requireAuth,
  requireRole("employee"),
  validateBody(CommitPooledCartRequestSchema),
  asyncHandler(async (req, res) => {
    const { amount } = req.body as { amount: number };
    const cart = await commitToPooledCart({
      inviteCode: String(req.params.code),
      userId: req.user!.id,
      companyId: req.user!.companyId,
      amount
    });
    respond(res, PooledCartResponseSchema, { cart });
  })
);

pooledCartRouter.post(
  "/:id/cancel",
  requireAuth,
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const cart = await cancelPooledCart(String(req.params.id), req.user!.id);
    respond(res, PooledCartResponseSchema, { cart });
  })
);
