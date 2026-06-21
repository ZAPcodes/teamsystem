type AllowanceLike = {
  total: number;
  used: number;
  held: number;
  currency: string;
  periodResetAt: Date;
};

export function toAllowanceSummary(allowance: AllowanceLike) {
  return {
    total: allowance.total,
    used: allowance.used,
    held: allowance.held,
    available: allowance.total - allowance.used - allowance.held,
    currency: allowance.currency,
    periodResetAt: allowance.periodResetAt.toISOString()
  };
}
