const CURRENCY_LOCALE: Record<string, string> = {
  ALL: "sq-AL",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB"
};

export function formatMoney(amount: number, currency = "ALL", locale?: string): string {
  const loc = locale ?? CURRENCY_LOCALE[currency] ?? "en-US";
  const formatted = amount.toLocaleString(loc);
  if (currency === "ALL") return `${formatted} ALL`;
  if (currency === "EUR") return `€${formatted}`;
  if (currency === "USD") return `$${formatted}`;
  if (currency === "GBP") return `£${formatted}`;
  return `${formatted} ${currency}`;
}
