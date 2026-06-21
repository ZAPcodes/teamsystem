export type ResetPeriod = "monthly" | "quarterly" | "annual";

export function nextPeriodReset(period: ResetPeriod, from = new Date()): Date {
  const next = new Date(from);

  if (period === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else if (period === "quarterly") {
    next.setUTCMonth(next.getUTCMonth() + 3);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  }

  return next;
}
