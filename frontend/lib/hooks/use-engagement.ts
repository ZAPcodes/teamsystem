"use client";

import * as React from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type {
  NotificationDTO,
  WrappedDTO,
  GiftDTO,
  ColleagueDTO,
  PeerAdvocacyPromptDTO,
  TelegramLinkCodeDTO,
  TelegramLinkStatusDTO,
  PackageDTO,
  AiConciergeResponseDTO,
  ConciergeGreetingDTO,
  GamificationAwardDTO
} from "@/lib/api/contracts";

export function useNotifications() {
  const [notifications, setNotifications] = React.useState<NotificationDTO[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ notifications: NotificationDTO[] }>("/me/notifications");
      setNotifications(data.notifications);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = async (id: string) => {
    await apiPost(`/me/notifications/${id}/read`, {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => apiPost(`/me/notifications/${n.id}/read`, {})));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, refresh, markRead, markAllAsRead };
}

export function useWrapped() {
  const [wrapped, setWrapped] = React.useState<WrappedDTO | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<WrappedDTO>("/me/wrapped");
        setWrapped(data);
      } catch {
        setWrapped(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { wrapped, loading };
}

export function useMyPackages() {
  const [packages, setPackages] = React.useState<PackageDTO[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ packages: PackageDTO[] }>("/me/packages");
      setPackages(data.packages);
    } catch {
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { packages, loading, refresh };
}

export function useColleagues() {
  const [colleagues, setColleagues] = React.useState<ColleagueDTO[]>([]);

  React.useEffect(() => {
    apiGet<{ colleagues: ColleagueDTO[] }>("/gifts/colleagues").then((d) => setColleagues(d.colleagues));
  }, []);

  return colleagues;
}

export async function sendGift(input: {
  toUserId: string;
  amount: number;
  currency: string;
  message: string;
}) {
  return apiPost<{ gift: GiftDTO }>("/gifts", input);
}

export async function runNudges() {
  return apiPost<{ nudged: number }>("/me/nudges/run", {});
}

export async function getConciergeGreeting() {
  return apiGet<ConciergeGreetingDTO>("/ai/concierge/greeting");
}

export async function askConcierge(message: string, budget?: number, demo?: boolean) {
  return apiPost<AiConciergeResponseDTO>("/ai/concierge", { message, budget, demo });
}

export async function requestBundle(goal: string, budget: number, demo?: boolean) {
  return apiPost<import("@/lib/api/contracts").AiPackageResponseDTO>("/ai/bundle", { goal, budget, demo });
}

export async function redeemVoucher(code: string) {
  return apiPost<{
    voucher: { code: string; status: string };
    gamification?: GamificationAwardDTO;
  }>(`/vouchers/${encodeURIComponent(code)}/redeem`, {});
}

export async function getPendingPeerAdvocacy() {
  return apiGet<{ advocacy: PeerAdvocacyPromptDTO | null }>("/me/peer-advocacy/pending");
}

export async function triggerDemoPeerAdvocacy() {
  return apiPost<{ advocacy: PeerAdvocacyPromptDTO | null }>("/me/peer-advocacy/demo", {});
}

export async function sendPeerAdvocacy(advocacyId: string, toUserId: string) {
  return apiPost<{ ok: boolean; recipientName: string; message: string }>(
    `/me/peer-advocacy/${advocacyId}/send`,
    { toUserId }
  );
}

export async function dismissPeerAdvocacy(advocacyId: string) {
  return apiPost<{ ok: boolean }>(`/me/peer-advocacy/${advocacyId}/dismiss`, {});
}

export function usePeerAdvocacyPrompt() {
  const [advocacy, setAdvocacy] = React.useState<PeerAdvocacyPromptDTO | null>(null);
  const [open, setOpen] = React.useState(false);
  const scheduledRef = React.useRef<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = React.useCallback(async () => {
    try {
      const data = await getPendingPeerAdvocacy();
      const pending = data.advocacy;
      if (!pending) return;
      if (scheduledRef.current === pending.id || open) return;

      scheduledRef.current = pending.id;
      setAdvocacy(pending);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setOpen(true);
      }, 5000);
    } catch {
      // demo slice — ignore polling errors
    }
  }, [open]);

  React.useEffect(() => {
    void poll();
    const interval = setInterval(() => void poll(), 8000);
    const onPending = () => void poll();
    window.addEventListener("perx:peer-advocacy-pending", onPending);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("perx:peer-advocacy-pending", onPending);
    };
  }, [poll]);

  const close = React.useCallback(() => {
    setOpen(false);
    setAdvocacy(null);
    scheduledRef.current = null;
  }, []);

  const showNow = React.useCallback((prompt: PeerAdvocacyPromptDTO) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    scheduledRef.current = prompt.id;
    setAdvocacy(prompt);
    setOpen(true);
  }, []);

  return { advocacy, open, close, showNow, refresh: poll };
}

export function useTelegramLink() {
  const [status, setStatus] = React.useState<TelegramLinkStatusDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<TelegramLinkStatusDTO>("/me/telegram/status");
      setStatus(data);
    } catch {
      setStatus(null);
      setError("Could not load Telegram link status.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const generateCode = React.useCallback(async (): Promise<TelegramLinkCodeDTO | null> => {
    setGenerating(true);
    setError(null);
    try {
      const data = await apiPost<TelegramLinkCodeDTO>("/me/telegram/link-code", {});
      return data;
    } catch {
      setError("Could not generate a link code. Try again.");
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  return { status, loading, generating, error, generateCode, refresh };
}
