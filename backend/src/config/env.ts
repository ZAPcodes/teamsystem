import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/perx?replicaSet=rs0"),
  SESSION_SECRET: z.string().min(8).default("dev-session-secret-change-me"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  /** Public URL of this backend (Render sets RENDER_EXTERNAL_URL automatically). */
  PUBLIC_URL: z.string().url().optional(),
  /** Vercel / production frontend origin for CORS. */
  APP_URL: z.string().url().optional(),
  /** Comma-separated extra CORS origins (preview deploys, etc.). */
  CORS_ORIGINS: z.string().optional(),
  /** Force Telegram polling even in production (local tunnel testing). */
  TELEGRAM_USE_POLLING: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true")
});

function resolvePublicUrl(): string | undefined {
  const explicit = process.env.PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const render = process.env.RENDER_EXTERNAL_URL?.trim();
  if (render) return render.replace(/\/$/, "");

  return undefined;
}

export const env = EnvSchema.parse({
  ...process.env,
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? process.env.groq_api_key,
  PUBLIC_URL: resolvePublicUrl(),
  APP_URL: process.env.APP_URL?.trim() || undefined
});

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";

export function corsOrigins(): string[] {
  const origins = new Set<string>(["http://localhost:3000", "http://127.0.0.1:3000"]);

  if (env.APP_URL) origins.add(env.APP_URL.replace(/\/$/, ""));

  if (env.CORS_ORIGINS) {
    for (const origin of env.CORS_ORIGINS.split(",")) {
      const trimmed = origin.trim().replace(/\/$/, "");
      if (trimmed) origins.add(trimmed);
    }
  }

  return [...origins];
}
