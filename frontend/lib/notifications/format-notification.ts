import { formatMoney } from "@/lib/utils";
import type { NotificationDTO, OfferDTO } from "@/lib/api/contracts";

export type NotificationVisualKind =
  | "budget"
  | "drop"
  | "gift"
  | "voucher"
  | "package"
  | "streak"
  | "social"
  | "xp"
  | "generic";

export interface NotificationPresentation {
  kind: NotificationVisualKind;
  title: string;
  body: string;
  detail?: string;
  href?: string;
  hrefLabel?: string;
  accent?: string;
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  return (payload as Record<string, unknown>) ?? {};
}

export function formatNotification(n: NotificationDTO): NotificationPresentation {
  const p = payloadRecord(n.payload);
  const when = formatRelativeTime(n.createdAt);

  if (n.type === "nudge" && typeof p.available === "number") {
    const available = p.available as number;
    const currency = (p.currency as string) ?? "ALL";
    return {
      kind: "budget",
      title: "Allowance expiring soon",
      body: `${formatMoney(available, currency)} is still unused before your reset.`,
      detail: typeof p.resetAt === "string" ? `Resets ${new Date(p.resetAt).toLocaleDateString()}` : when,
      href: "/marketplace",
      hrefLabel: "Browse perks",
      accent: "#635bff",
    };
  }

  if (n.type === "drop") {
    const offerTitle = typeof p.offerTitle === "string" ? p.offerTitle : "New limited offer";
    const badge = typeof p.badgeLabel === "string" ? p.badgeLabel : "New drop";
    return {
      kind: "drop",
      title: badge,
      body: offerTitle,
      detail: when,
      href: "/marketplace",
      hrefLabel: "View drop",
      accent: "#635bff",
    };
  }

  if (n.type === "gift") {
    const from = typeof p.fromName === "string" ? p.fromName : "A colleague";
    const amount = typeof p.amount === "number" ? p.amount : undefined;
    const currency = (p.currency as string) ?? "ALL";
    const message = typeof p.message === "string" ? p.message : "Sent you a perk credit.";
    return {
      kind: "gift",
      title: `${from} sent a gift`,
      body: message,
      detail: amount != null ? `${formatMoney(amount, currency)} · ${when}` : when,
      href: "/gift",
      hrefLabel: "Open gifts",
      accent: "#e6320a",
    };
  }

  if (n.type === "voucher" && p.status === "settled") {
    return {
      kind: "voucher",
      title: "Codes are ready",
      body: "Your package was approved — redemption codes are in History.",
      detail: when,
      href: "/marketplace/history",
      hrefLabel: "Open vouchers",
      accent: "#0c1018",
    };
  }

  if (n.type === "package_status") {
    const status = typeof p.status === "string" ? p.status : "updated";
    const total = typeof p.total === "number" ? p.total : undefined;
    const currency = (p.currency as string) ?? "ALL";
    return {
      kind: "package",
      title: `Package ${status}`,
      body:
        total != null
          ? `Total ${formatMoney(total, currency)} — check History for line items.`
          : "Your employer updated a package submission.",
      detail: when,
      href: "/marketplace/history",
      hrefLabel: "View history",
    };
  }

  if (n.type === "streak_danger") {
    const weeks = typeof p.streakWeeks === "number" ? p.streakWeeks : undefined;
    const message =
      typeof p.message === "string"
        ? p.message
        : weeks != null
          ? `Your ${weeks}-week streak ends Sunday unless you redeem a perk.`
          : "Your weekly streak is at risk.";
    return {
      kind: "streak",
      title: "Streak in danger",
      body: message,
      detail: when,
      href: "/marketplace",
      hrefLabel: "Redeem now",
      accent: "#e6320a",
    };
  }

  if (n.type === "compliance_flag") {
    const event = typeof p.event === "string" ? p.event : undefined;
    const employeeName = typeof p.employeeName === "string" ? p.employeeName : "An employee";
    const offerTitle = typeof p.offerTitle === "string" ? p.offerTitle : "a perk";
    const providerName = typeof p.providerName === "string" ? p.providerName : "a provider";
    const amount = typeof p.amount === "number" ? p.amount : undefined;
    const currency = (p.currency as string) ?? "ALL";
    const reason = typeof p.reason === "string" ? p.reason : "Compliance review required.";

    if (event === "approved") {
      return {
        kind: "package",
        title: "Claim approved by HR",
        body: `You can claim ${offerTitle} at ${providerName} again.`,
        detail: when,
        href: "/marketplace",
        hrefLabel: "Back to marketplace",
        accent: "#635bff",
      };
    }

    if (event === "rejected") {
      return {
        kind: "package",
        title: "Claim rejected by HR",
        body: `${offerTitle} at ${providerName} was not approved.`,
        detail: reason,
        href: "/marketplace",
        hrefLabel: "Browse perks",
        accent: "#e6320a",
      };
    }

    return {
      kind: "social",
      title: "Compliance red flag",
      body: `Transaction halted: ${employeeName} attempted${amount != null ? ` ${formatMoney(amount, currency)}` : ""} at ${providerName}.`,
      detail: reason,
      href: "/employer/compliance",
      hrefLabel: "Review in compliance",
      accent: "#e6320a",
    };
  }

  if (n.type === "pooled_cart") {
    const event = typeof p.event === "string" ? p.event : "update";
    const offerTitle = typeof p.offerTitle === "string" ? p.offerTitle : "a team perk";
    const inviteCode = typeof p.inviteCode === "string" ? p.inviteCode : "";
    if (event === "locked") {
      return {
        kind: "voucher",
        title: "Team pool locked",
        body: `${offerTitle} is fully funded — your group QR is ready.`,
        detail: when,
        href: inviteCode ? `/marketplace/pool/${inviteCode}` : "/marketplace",
        hrefLabel: "Open group code",
        accent: "#635bff",
      };
    }
    const from = typeof p.fromName === "string" ? p.fromName : "A teammate";
    const amount = typeof p.amount === "number" ? p.amount : undefined;
    const currency = (p.currency as string) ?? "ALL";
    return {
      kind: "social",
      title: "Team pool update",
      body: `${from} committed${amount != null ? ` ${formatMoney(amount, currency)}` : ""} to ${offerTitle}.`,
      detail: when,
      href: inviteCode ? `/marketplace/pool/${inviteCode}` : "/marketplace",
      hrefLabel: "View pool",
      accent: "#635bff",
    };
  }

  if (n.type === "peer_recommendation") {
    const from = typeof p.fromName === "string" ? p.fromName : "A colleague";
    const offerTitle = typeof p.offerTitle === "string" ? p.offerTitle : "a perk";
    const vendorName = typeof p.vendorName === "string" ? p.vendorName : "a partner";
    const walletLabel =
      typeof p.categoryWalletLabel === "string" ? p.categoryWalletLabel : "Benefits Wallet";
    const message =
      typeof p.message === "string"
        ? p.message
        : `${from} recommended ${offerTitle} at ${vendorName}. You have enough in your ${walletLabel} to try it.`;
    return {
      kind: "social",
      title: `${from} recommended a perk`,
      body: message,
      detail: when,
      href: "/marketplace",
      hrefLabel: "Browse perks",
      accent: "#635bff",
    };
  }

  if (n.type === "high_five") {
    const from = typeof p.fromName === "string" ? p.fromName : "Someone";
    const xp = typeof p.xpAwarded === "number" ? p.xpAwarded : 5;
    return {
      kind: "social",
      title: "High-Five received",
      body: `${from} cheered your perk pick on the team feed.`,
      detail: `+${xp} XP · ${when}`,
      href: "/marketplace",
      hrefLabel: "Team pulse",
      accent: "#635bff",
    };
  }

  if (n.type === "xp" && typeof p.xpAwarded === "number") {
    const reason = typeof p.reason === "string" ? p.reason : "You earned XP.";
    return {
      kind: "xp",
      title: `+${p.xpAwarded} XP`,
      body: reason,
      detail: when,
      href: "/progress",
      hrefLabel: "View progress",
      accent: "#ff8c00",
    };
  }

  return {
    kind: "generic",
    title: n.type.replace(/_/g, " "),
    body: "You have a new update in Perx.",
    detail: when,
  };
}

export function formatOfferAlert(offer: OfferDTO, variant: "expiring" | "drop", endsAt?: string) {
  if (variant === "drop") {
    return {
      kind: "drop" as const,
      title: "Limited drop",
      body: offer.title,
      detail: `${offer.providerName} · ${formatMoney(offer.price, offer.currency ?? "ALL")}${endsAt ? ` · ${formatExpiryCountdown(endsAt)}` : ""}`,
      href: "/marketplace",
      hrefLabel: "Grab it",
      accent: "#635bff",
      imageUrl: offer.imageUrl,
    };
  }

  return {
    kind: "drop" as const,
    title: "Expiring soon",
    body: offer.title,
    detail: `${offer.providerName} · ${formatMoney(offer.price, offer.currency ?? "ALL")}${offer.expiresAt ? ` · ${formatExpiryCountdown(offer.expiresAt)}` : ""}`,
    href: "/marketplace",
    hrefLabel: "View offer",
    accent: "#e6320a",
    imageUrl: offer.imageUrl,
  };
}

function formatExpiryCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 48) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

function formatRelativeTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(createdAt).toLocaleDateString();
}
