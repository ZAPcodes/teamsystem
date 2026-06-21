import { Router } from "express";
import TelegramBot from "node-telegram-bot-api";
import QRCode from "qrcode";
import { env, isProduction } from "../config/env.js";
import {
  findUserByTelegramChat,
  getBalanceMessage,
  getRecommendationMessage,
  linkTelegramChat,
  purchasePerkViaTelegram
} from "../services/telegram-actions.service.js";
import { parseTelegramIntent } from "../services/telegram-intent.service.js";

export const TELEGRAM_WEBHOOK_PATH = "/telegram/webhook";

const pendingCodes = new Map<string, "awaiting_code">();

let botInstance: TelegramBot | null = null;
let pollingBot: TelegramBot | null = null;

function helpMessage() {
  return [
    "Welcome to Perx on Telegram.",
    "",
    "1. Open Progress in the Perx web app and generate a one-time link code.",
    "2. Send that 6-digit code here after /start.",
    "",
    "Then try:",
    '• "What\'s my balance?"',
    '• "Suggest some movie offers"',
    '• "Grab me the Cineplexx movie pass"',
    '• "I\'m at Artigiano, grab me a 1,500 ALL lunch pass."'
  ].join("\n");
}

async function sendQrCode(bot: TelegramBot, chatId: string, qrPayload: string, caption: string) {
  const png = await QRCode.toBuffer(qrPayload, {
    type: "png",
    margin: 1,
    width: 420,
    errorCorrectionLevel: "M"
  });

  await bot.sendPhoto(chatId, png, { caption });
}

async function handleLinkedMessage(bot: TelegramBot, chatId: string, userId: string, text: string) {
  const intent = await parseTelegramIntent(text);

  if (intent.intent === "balance") {
    await bot.sendMessage(chatId, await getBalanceMessage(userId));
    return;
  }

  if (intent.intent === "recommendation") {
    await bot.sendMessage(
      chatId,
      await getRecommendationMessage(userId, {
        category: intent.category,
        searchTerms: intent.searchTerms,
        label: intent.label,
        userMessage: text
      })
    );
    return;
  }

  if (intent.intent === "purchase") {
    try {
      const result = await purchasePerkViaTelegram(userId, {
        query: intent.query,
        amount: intent.amount,
        venue: intent.venue,
        category: intent.category
      });
      await sendQrCode(bot, chatId, result.qrPayload, result.caption);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete that purchase.";
      await bot.sendMessage(chatId, message);
    }
    return;
  }

  if (intent.intent === "help") {
    await bot.sendMessage(chatId, helpMessage());
    return;
  }

  await bot.sendMessage(
    chatId,
    'I can check your balance, suggest perks, or grab one for you. Try: "Grab me the Cineplexx movie pass" or "What\'s my balance?"'
  );
}

function attachBotHandlers(bot: TelegramBot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = String(msg.chat.id);
    pendingCodes.set(chatId, "awaiting_code");
    await bot.sendMessage(
      chatId,
      `${helpMessage()}\n\nSend your 6-digit link code from the Perx app to connect this chat.`
    );
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = String(msg.chat.id);
    const text = msg.text.trim();

    if (pendingCodes.get(chatId) === "awaiting_code" && /^\d{6}$/.test(text)) {
      try {
        const linked = await linkTelegramChat(chatId, text);
        pendingCodes.delete(chatId);
        await bot.sendMessage(
          chatId,
          `Linked to ${linked.name}. You're in!\n\nAsk "What's my balance?" or tell me where you are and what to grab.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid link code.";
        await bot.sendMessage(chatId, `${message}\n\nGenerate a fresh code in the Perx app and try again.`);
      }
      return;
    }

    const user = await findUserByTelegramChat(chatId);
    if (!user) {
      pendingCodes.set(chatId, "awaiting_code");
      await bot.sendMessage(chatId, "This chat isn't linked yet. Send /start and your 6-digit Perx link code.");
      return;
    }

    await handleLinkedMessage(bot, chatId, user._id.toString(), text);
  });

  bot.on("polling_error", (error) => {
    console.error("[telegram] polling error", error.message);
  });
}

export function createTelegramWebhookRouter(): Router {
  const router = Router();

  router.post(TELEGRAM_WEBHOOK_PATH, (req, res) => {
    if (!botInstance) {
      res.sendStatus(503);
      return;
    }
    try {
      botInstance.processUpdate(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error("[telegram] webhook process error", error);
      res.sendStatus(500);
    }
  });

  return router;
}

function shouldUseWebhook() {
  if (env.TELEGRAM_USE_POLLING) return false;
  return isProduction && Boolean(env.PUBLIC_URL);
}

/**
 * Production (Render): registers a webhook so Telegram pushes updates to this service.
 * Development: long-polling on the same process.
 */
export async function initTelegramBot(): Promise<TelegramBot | null> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not set — bot disabled");
    return null;
  }

  if (shouldUseWebhook()) {
    botInstance = new TelegramBot(env.TELEGRAM_BOT_TOKEN);
    attachBotHandlers(botInstance);

    const webhookUrl = `${env.PUBLIC_URL}${TELEGRAM_WEBHOOK_PATH}`;
    await botInstance.deleteWebHook({ drop_pending_updates: false });
    await botInstance.setWebHook(webhookUrl);

    console.log(`[telegram] webhook mode — ${webhookUrl}`);
    return botInstance;
  }

  pollingBot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
  botInstance = pollingBot;
  attachBotHandlers(pollingBot);
  console.log("[telegram] polling mode started");
  return pollingBot;
}

export async function stopTelegramBot() {
  if (pollingBot) {
    await pollingBot.stopPolling();
    pollingBot = null;
  }
  if (botInstance && shouldUseWebhook()) {
    await botInstance.deleteWebHook();
  }
  botInstance = null;
}

/** @deprecated Use initTelegramBot() */
export function startTelegramBot() {
  console.warn("[telegram] startTelegramBot() is deprecated — use initTelegramBot()");
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
  attachBotHandlers(bot);
  botInstance = bot;
  pollingBot = bot;
  return bot;
}
