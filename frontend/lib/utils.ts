import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALE: Record<string, string> = {
  ALL: "sq-AL",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
};

/** Format money with currency code or symbol. */
export function formatMoney(amount: number, currency = "ALL", locale?: string): string {
  const loc = locale ?? CURRENCY_LOCALE[currency] ?? "en-US";
  const formatted = amount.toLocaleString(loc);
  if (currency === "ALL") return `${formatted} ALL`;
  if (currency === "EUR") return `€${formatted}`;
  if (currency === "USD") return `$${formatted}`;
  if (currency === "GBP") return `£${formatted}`;
  return `${formatted} ${currency}`;
}

/** @deprecated Use formatMoney(amount, currency) */
export function formatALL(amount: number): string {
  return formatMoney(amount, "ALL");
}
