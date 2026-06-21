"use client";

import * as React from "react";
import { NotificationPopover, type Notification } from "@/components/ui/notification-popover";
import { useNotifications } from "@/lib/hooks/use-engagement";
import { useDrops } from "@/lib/hooks/use-offers";
import { apiGet } from "@/lib/api/client";
import type { OfferDTO } from "@/lib/api/contracts";
import { formatNotification, formatOfferAlert } from "@/lib/notifications/format-notification";
import { useTranslation } from "@/lib/i18n/use-translation";

function formatExpiryCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 48) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export function NotificationsBell() {
  const { t } = useTranslation();
  const { notifications, markRead, markAllAsRead, refresh } = useNotifications();
  const { drops } = useDrops();
  const [expiringOffers, setExpiringOffers] = React.useState<OfferDTO[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    apiGet<{ offers: OfferDTO[] }>("/offers")
      .then((data) => {
        const week = Date.now() + 1000 * 60 * 60 * 24 * 7;
        setExpiringOffers(
          data.offers.filter(
            (o) => o.isLimited && o.expiresAt && new Date(o.expiresAt).getTime() <= week && new Date(o.expiresAt).getTime() > Date.now()
          )
        );
      })
      .catch(() => setExpiringOffers([]));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const dropOfferIds = new Set((drops ?? []).map((d) => d.offer.id));
  const expiringOnly = expiringOffers.filter((o) => !dropOfferIds.has(o.id));

  const items = React.useMemo<Notification[]>(() => {
    const list: Notification[] = [];

    for (const drop of drops ?? []) {
      const meta = formatOfferAlert(drop.offer, "drop", drop.endsAt);
      list.push({
        id: `drop-${drop.id}`,
        title: drop.badgeLabel || meta.title,
        description: `${meta.body} · ${formatExpiryCountdown(drop.endsAt)}`,
        timestamp: new Date(drop.startsAt),
        read: dismissedIds.has(`drop-${drop.id}`),
      });
    }

    for (const offer of expiringOnly) {
      const meta = formatOfferAlert(offer, "expiring");
      list.push({
        id: `expiring-${offer.id}`,
        title: meta.title,
        description: `${meta.body}${offer.expiresAt ? ` · ${formatExpiryCountdown(offer.expiresAt)}` : ""}`,
        timestamp: new Date(offer.expiresAt ?? Date.now()),
        read: dismissedIds.has(`expiring-${offer.id}`),
      });
    }

    for (const n of notifications) {
      const meta = formatNotification(n);
      list.push({
        id: n.id,
        title: meta.title,
        description: [meta.body, meta.detail].filter(Boolean).join(" · "),
        timestamp: new Date(n.createdAt),
        read: n.read,
      });
    }

    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [dismissedIds, drops, expiringOnly, notifications]);

  const handleMarkAsRead = React.useCallback(
    (id: string) => {
      if (id.startsWith("drop-") || id.startsWith("expiring-")) {
        setDismissedIds((prev) => new Set(prev).add(id));
        return;
      }
      void markRead(id);
    },
    [markRead]
  );

  const handleMarkAllAsRead = React.useCallback(() => {
    const syntheticIds = items.filter((n) => n.id.startsWith("drop-") || n.id.startsWith("expiring-")).map((n) => n.id);
    if (syntheticIds.length > 0) {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        for (const id of syntheticIds) next.add(id);
        return next;
      });
    }
    void markAllAsRead();
  }, [items, markAllAsRead]);

  return (
    <NotificationPopover
      notifications={items}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      headerTitle={t("nav.notifications")}
      markAllLabel={t("nav.markAllRead")}
      emptyLabel={t("nav.noNotifications")}
    />
  );
}
