import cors from "cors";
import express from "express";
import { z } from "zod";
import { createTelegramWebhookRouter } from "./bot/telegram-bot.js";
import { corsOrigins } from "./config/env.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { aiRouter } from "./routes/ai.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { employerRouter } from "./routes/employer.routes.js";
import { giftRouter } from "./routes/gifts.routes.js";
import { meRouter } from "./routes/me.routes.js";
import { offerRouter } from "./routes/offers.routes.js";
import { approvalRouter, packageRouter } from "./routes/packages.routes.js";
import { pooledCartRouter } from "./routes/pooled-carts.routes.js";
import { providerRouter } from "./routes/provider.routes.js";
import { voucherRouter } from "./routes/vouchers.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowed = corsOrigins();
        if (allowed.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "perx-backend",
      time: new Date().toISOString()
    });
  });

  app.use(createTelegramWebhookRouter());

  app.use("/auth", authRouter);
  app.use("/me", meRouter);
  app.use("/offers", offerRouter);
  app.use("/packages", packageRouter);
  app.use("/employer", employerRouter);
  app.use("/employer", approvalRouter);
  app.use("/provider", providerRouter);
  app.use("/vouchers", voucherRouter);
  app.use("/ai", aiRouter);
  app.use("/gifts", giftRouter);
  app.use("/pooled-carts", pooledCartRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found"
      }
    });
  });

  app.use(errorMiddleware);

  return app;
}

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  time: z.string().datetime()
});
