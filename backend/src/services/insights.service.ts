type AllowanceRow = {
  userId: { toString(): string } | string;
  total: number;
  used: number;
  held: number;
  periodResetAt: Date;
};

type SelectionRow = {
  employeeId: { toString(): string; _id?: unknown; name?: string } | string;
  category: string;
  amount: number;
  status: string;
};

type PolicyRow = {
  allowedCategories: string[];
  perEmployeeAllowance: number;
};

function employeeIdOf(row: SelectionRow): string {
  const employee = row.employeeId;
  if (typeof employee === "string") return employee;
  if (employee && typeof employee === "object" && "_id" in employee && employee._id) {
    return String(employee._id);
  }
  return String(employee);
}

export function buildUnusedCategories(
  allowedCategories: string[],
  employeeIds: string[],
  approvedEvents: SelectionRow[]
): { category: string; employeeCount: number }[] {
  const spendByEmployeeCategory = new Map<string, Set<string>>();

  for (const event of approvedEvents) {
    const employeeId = employeeIdOf(event);
    const categories = spendByEmployeeCategory.get(employeeId) ?? new Set<string>();
    categories.add(event.category);
    spendByEmployeeCategory.set(employeeId, categories);
  }

  return allowedCategories
    .map((category) => {
      const employeeCount = employeeIds.filter((employeeId) => {
        const used = spendByEmployeeCategory.get(employeeId);
        return !used || !used.has(category);
      }).length;
      return { category, employeeCount };
    })
    .filter((row) => row.employeeCount > 0)
    .sort((a, b) => b.employeeCount - a.employeeCount);
}

export function buildEmployerSuggestions(input: {
  policy: PolicyRow;
  allowances: AllowanceRow[];
  allEvents: SelectionRow[];
  approvedEvents: SelectionRow[];
  unusedCategories: { category: string; employeeCount: number }[];
}): { category: string; reason: string }[] {
  const { policy, allowances, allEvents, approvedEvents, unusedCategories } = input;
  const suggestions: { category: string; reason: string }[] = [];
  const now = Date.now();

  const totalAllocated = allowances.reduce((sum, row) => sum + row.total, 0);
  const totalAvailable = allowances.reduce(
    (sum, row) => sum + Math.max(0, row.total - row.used - row.held),
    0
  );
  const utilizationPct =
    totalAllocated > 0 ? ((totalAllocated - totalAvailable) / totalAllocated) * 100 : 0;

  const soonestReset = allowances.reduce<Date | null>((soonest, row) => {
    if (!soonest || row.periodResetAt < soonest) return row.periodResetAt;
    return soonest;
  }, null);

  const daysToReset = soonestReset
    ? Math.max(0, Math.ceil((soonestReset.getTime() - now) / (1000 * 60 * 60 * 24)))
    : null;

  const employeesWithHighUnused = allowances.filter((row) => {
    const available = Math.max(0, row.total - row.used - row.held);
    return available >= row.total * 0.5;
  }).length;

  if (employeesWithHighUnused > 0 && daysToReset !== null && daysToReset <= 14) {
    suggestions.push({
      category: "allowance",
      reason: `${employeesWithHighUnused} employee${
        employeesWithHighUnused === 1 ? "" : "s"
      } still have over half their allowance with ${daysToReset} day${
        daysToReset === 1 ? "" : "s"
      } left this period. Run budget nudges or spotlight expiring perks.`
    });
  } else if (utilizationPct < 35 && totalAllocated > 0) {
    suggestions.push({
      category: "allowance",
      reason: `Only ${Math.round(utilizationPct)}% of allocated benefits have been used. Consider a team-wide perk drop before the period resets.`
    });
  }

  for (const unused of unusedCategories.slice(0, 2)) {
    if (unused.employeeCount < 2) continue;
    suggestions.push({
      category: unused.category,
      reason: `${unused.employeeCount} employees haven't used ${unused.category} perks yet. Add or promote offers in this category to lift adoption.`
    });
  }

  const spendByCategory = new Map<string, number>();
  for (const event of approvedEvents) {
    spendByCategory.set(event.category, (spendByCategory.get(event.category) ?? 0) + event.amount);
  }

  const topCategory = [...spendByCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const interestCounts = new Map<string, number>();
  for (const event of allEvents) {
    if (!["created", "pending", "approved", "redeemed"].includes(event.status)) continue;
    interestCounts.set(event.category, (interestCounts.get(event.category) ?? 0) + 1);
  }

  if (topCategory) {
    const rising = [...interestCounts.entries()]
      .filter(([category]) => category !== topCategory)
      .sort((a, b) => b[1] - a[1])[0];

    if (rising && rising[1] >= 2) {
      suggestions.push({
        category: rising[0],
        reason: `${rising[0]} is gaining interest (${rising[1]} recent selections) while ${topCategory} leads spend. Balance your catalog with fresh ${rising[0]} partners.`
      });
    }
  }

  const seen = new Set<string>();
  return suggestions.filter((item) => {
    const key = `${item.category}:${item.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}
