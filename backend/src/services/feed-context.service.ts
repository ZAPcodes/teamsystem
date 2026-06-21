/** Context-adaptive feed signals — time-of-day rules + allowance reset override. */

export type FeedMode = "default" | "expiring_soon";

export interface TimeBoost {
  category: string;
  weight: number;
  label: string;
}

export interface FeedContext {
  mode: FeedMode;
  daysUntilReset: number | null;
  walletBalance: number;
  boostedCategories: string[];
  contextLabel?: string;
  timeBoosts: TimeBoost[];
}

const TZ = "Europe/Tirane";

function localParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return { day: dayMap[weekday] ?? now.getDay(), hour, weekday };
}

/** Monday 08:00 → coffee/food; Friday 14:00 → weekend travel. */
export function getTimeBoosts(now = new Date()): TimeBoost[] {
  const { day, hour } = localParts(now);
  const boosts: TimeBoost[] = [];

  if (day === 1 && hour >= 7 && hour < 11) {
    boosts.push({
      category: "food",
      weight: 85,
      label: "Monday morning — coffee & breakfast perks boosted"
    });
  }

  if (day === 5 && hour >= 13 && hour < 19) {
    boosts.push({
      category: "travel",
      weight: 85,
      label: "Friday afternoon — weekend getaways boosted"
    });
  }

  return boosts;
}

export function buildFeedContext(input: {
  daysUntilReset: number | null;
  walletBalance: number;
  now?: Date;
}): FeedContext {
  const timeBoosts = getTimeBoosts(input.now);
  const boostedCategories = [...new Set(timeBoosts.map((b) => b.category))];

  const expiringSoon =
    input.daysUntilReset !== null &&
    input.daysUntilReset < 4 &&
    input.daysUntilReset >= 0 &&
    input.walletBalance > 0;

  if (expiringSoon) {
    return {
      mode: "expiring_soon",
      daysUntilReset: input.daysUntilReset,
      walletBalance: input.walletBalance,
      boostedCategories,
      contextLabel: `Expiring Soon — ${input.walletBalance.toLocaleString()} ALL left · reset in ${input.daysUntilReset}d`,
      timeBoosts
    };
  }

  const contextLabel =
    timeBoosts.length > 0 ? timeBoosts.map((b) => b.label).join(" · ") : undefined;

  return {
    mode: "default",
    daysUntilReset: input.daysUntilReset,
    walletBalance: input.walletBalance,
    boostedCategories,
    contextLabel,
    timeBoosts
  };
}
