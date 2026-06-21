import { createApp } from "./app.js";
import { initTelegramBot, stopTelegramBot } from "./bot/telegram-bot.js";
import { env } from "./config/env.js";
import { connectMongo } from "./db/mongo.js";

async function main() {
  await connectMongo();
  await initTelegramBot();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`Perx backend listening on port ${env.PORT}`);
    if (env.PUBLIC_URL) {
      console.log(`Public URL: ${env.PUBLIC_URL}`);
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`[shutdown] ${signal} received`);
    await stopTelegramBot();
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main().catch((error) => {
  console.error("Failed to start Perx backend", error);
  process.exit(1);
});
