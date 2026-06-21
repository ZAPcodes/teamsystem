"use client";

import * as React from "react";
import { useProviderEarnings } from "@/lib/hooks/use-provider";
import { formatMoney } from "@/lib/utils";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px 120px" }}>
        {children}
      </div>
    </main>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", padding: "24px", ...style }}>
      {children}
    </div>
  );
}

export default function ProviderEarningsPage() {
  const { earnings, loading, error } = useProviderEarnings();

  if (loading) {
    return (
      <PageShell>
        <div style={{ height: "48px", width: "35%", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", marginBottom: "40px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: "100px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)" }} />
          ))}
        </div>
      </PageShell>
    );
  }

  if (error || !earnings) {
    return (
      <PageShell>
        <p role="alert" style={{ fontSize: "14px", color: "#73737c" }}>
          Could not load earnings{error ? `: ${error}` : ""}.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header style={{ marginBottom: "48px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontVariationSettings: "'wght' 400, 'opsz' 56",
            fontSize: "clamp(36px, 5vw, 52px)",
            lineHeight: 1.07,
            letterSpacing: "-1.56px",
            color: "#010110",
            margin: 0,
            marginBottom: "8px",
          }}
        >
          Earnings.
        </h1>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
          Wallet balance and settlement activity from Perx.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "40px" }}>
        <Card>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: "0 0 6px" }}>
            Available balance
          </p>
          <p className="tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, color: "#010110", margin: 0 }}>
            {formatMoney(earnings.balance, earnings.currency)}
          </p>
        </Card>
        <Card>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: "0 0 6px" }}>
            Pending settlement
          </p>
          <p className="tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, color: "#010110", margin: 0 }}>
            {formatMoney(earnings.pendingTotal, earnings.currency)}
          </p>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#73737c", margin: "8px 0 0" }}>
            {earnings.pendingCount} line{earnings.pendingCount === 1 ? "" : "s"} awaiting approval
          </p>
        </Card>
        <Card>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: "0 0 6px" }}>
            Recent settled
          </p>
          <p className="tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, color: "#010110", margin: 0 }}>
            {formatMoney(earnings.settledTotal, earnings.currency)}
          </p>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <Card>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "20px", margin: "0 0 16px", color: "#010110" }}>
            Pending packages
          </h2>
          {earnings.pendingSettlements.length === 0 ? (
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
              No pending settlements right now.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {earnings.pendingSettlements.map((row) => (
                <div
                  key={row.packageLineId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid rgba(1,1,16,0.08)",
                  }}
                >
                  <div>
                    <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#010110", margin: 0 }}>
                      Package {row.packageId.slice(-6)}
                    </p>
                    <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", color: "#73737c", margin: "4px 0 0", textTransform: "capitalize" }}>
                      {row.status}
                    </p>
                  </div>
                  <span className="tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#010110" }}>
                    {formatMoney(row.amount, row.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "20px", margin: "0 0 16px", color: "#010110" }}>
            Recent settlements
          </h2>
          {earnings.recentSettlements.length === 0 ? (
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
              Settlements appear after employer-approved packages are paid out.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {earnings.recentSettlements.map((row, i) => (
                <div
                  key={`${row.createdAt}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid rgba(1,1,16,0.08)",
                  }}
                >
                  <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
                    {new Date(row.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <span className="tabular-nums" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#010110" }}>
                    {formatMoney(row.amount, row.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
