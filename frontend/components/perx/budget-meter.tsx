import * as React from "react";
import type { EmployeeBudget } from "@/lib/fixtures/employee";
import { formatMoney } from "@/lib/utils";

interface BudgetMeterProps {
  budget: EmployeeBudget;
  /** When set, shows how much of the allowance this draft would use (package builder). */
  draftTotal?: number;
  currency?: string;
}

/**
 * Perx Budget Meter — flat editorial ledger line, per design.md §6.
 */
export function BudgetMeter({ budget, draftTotal = 0, currency = "ALL" }: BudgetMeterProps) {
  const { quarterlyBudgetALL, spentALL, heldALL, quarterLabel } = budget;

  const draftSpent = spentALL + draftTotal;
  const remainingALL = quarterlyBudgetALL - draftSpent - heldALL;
  const spentPct = Math.min((draftSpent / quarterlyBudgetALL) * 100, 100);
  const heldPct = Math.min((heldALL / quarterlyBudgetALL) * 100, 100 - spentPct);
  const heldTickPct = spentPct + heldPct;

  return (
    <div className="w-full" aria-label={`Budget meter: ${formatMoney(remainingALL, currency)} remaining this ${quarterLabel}`}>
      {draftTotal > 0 && (
        <div
          className="flex items-baseline justify-between mb-2"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "13px",
            color: "#010110",
          }}
        >
          <span>Package total</span>
          <span className="tabular-nums" style={{ fontWeight: 500 }}>
            {formatMoney(draftTotal, currency)}
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between mb-3">
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: draftTotal > 0 ? "16px" : "20px",
            fontWeight: 500,
            letterSpacing: "-0.4px",
            color: "#010110",
          }}
        >
          {formatMoney(remainingALL, currency)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "12px",
            fontWeight: 400,
            letterSpacing: "-0.24px",
            color: "#73737c",
          }}
        >
          {draftTotal > 0 ? "left after this package" : "remaining"} · {formatMoney(quarterlyBudgetALL, currency)} budget · {quarterLabel}
        </span>
      </div>

      {/* Track */}
      <div
        role="progressbar"
        aria-valuenow={draftSpent}
        aria-valuemax={quarterlyBudgetALL}
        aria-label="Budget spent"
        style={{
          position: "relative",
          height: "2px",
          backgroundColor: "#d9d9d9",
          borderRadius: "1px",
          overflow: "visible",
        }}
      >
        {/* Violet fill — spent */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${spentPct}%`,
            backgroundColor: "#635bff",
            borderRadius: "1px",
            transition: "width 400ms ease",
          }}
        />

        {/* Held tick — thin Ink vertical line at the boundary of held portion */}
        {heldALL > 0 && (
          <div
            aria-label={`${formatMoney(heldALL, currency)} held in pending packages`}
            style={{
              position: "absolute",
              left: `${heldTickPct}%`,
              top: "-3px",
              width: "1px",
              height: "8px",
              backgroundColor: "#010110",
              borderRadius: "0",
            }}
          />
        )}
      </div>

      {/* Caption row */}
      <div
        className="flex gap-4 mt-2"
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "12px",
          fontWeight: 400,
          letterSpacing: "-0.24px",
          color: "#73737c",
        }}
      >
        <span className="flex items-center gap-1.5">
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "2px",
              backgroundColor: "#635bff",
              borderRadius: "1px",
            }}
          />
          {formatMoney(draftSpent, currency)} spent
        </span>
        {heldALL > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              style={{
                display: "inline-block",
                width: "1px",
                height: "10px",
                backgroundColor: "#010110",
              }}
            />
            {formatMoney(heldALL, currency)} held
          </span>
        )}
      </div>
    </div>
  );
}
