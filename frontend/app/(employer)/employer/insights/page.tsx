"use client";

import * as React from "react";
import { useEmployerInsights } from "@/lib/hooks/use-employer";
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

export default function InsightsPage() {
  const { insights, loading, error } = useEmployerInsights();

  if (loading) {
    return (
      <PageShell>
        <div style={{ height: "48px", width: "35%", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", marginBottom: "40px", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: "100px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
          ))}
        </div>
      </PageShell>
    );
  }

  if (error || !insights) {
    return (
      <PageShell>
        <p role="alert" style={{ fontSize: "14px", color: "#73737c" }}>Could not load insights{error ? `: ${error}` : ""}.</p>
      </PageShell>
    );
  }

  const { utilization, popularCategories, unusedCategories, suggestions } = insights;
  const hasMeaningfulData = utilization.totalUsed > 0 || utilization.totalHeld > 0;

  return (
    <PageShell>
      <header style={{ marginBottom: "48px" }}>
        <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 56", fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.07, letterSpacing: "-1.56px", color: "#010110", margin: 0, marginBottom: "8px" }}>
          Insights.
        </h1>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
          How your team is using Perx this period.
        </p>
      </header>

      {/* Utilization stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "40px" }}>
        <Card>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: 0, marginBottom: "6px" }}>Total allocated</p>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, letterSpacing: "-0.72px", color: "#010110", margin: 0 }}>
            {formatMoney(utilization.totalAllocated, utilization.currency)}
          </p>
        </Card>
        <Card>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: 0, marginBottom: "6px" }}>Spent</p>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, letterSpacing: "-0.72px", color: "#010110", margin: 0 }}>
            {formatMoney(utilization.totalUsed, utilization.currency)}
          </p>
        </Card>
        <Card>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: 0, marginBottom: "6px" }}>Held in packages</p>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, letterSpacing: "-0.72px", color: "#010110", margin: 0 }}>
            {formatMoney(utilization.totalHeld, utilization.currency)}
          </p>
        </Card>
      </div>

      {/* Honest empty state when no activity yet */}
      {!hasMeaningfulData ? (
        <Card style={{ textAlign: "center", padding: "48px 32px", maxWidth: "480px" }}>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "26px", letterSpacing: "-0.78px", color: "#010110", margin: 0, marginBottom: "12px" }}>
            Nothing to show yet.
          </h2>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", lineHeight: 1.5, color: "#73737c", margin: 0 }}>
            Insights appear once employees start building packages. The data will be here when it matters.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Popular categories */}
          {popularCategories.length > 0 && (
            <Card>
              <h3 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 22", fontSize: "20px", letterSpacing: "-0.6px", color: "#010110", margin: 0, marginBottom: "16px" }}>
                Top categories
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {popularCategories.slice(0, 5).map((item) => {
                  const maxSpend = popularCategories[0]?.spend ?? 1;
                  const barPct = (item.spend / maxSpend) * 100;
                  return (
                    <div key={item.category}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#010110", textTransform: "capitalize" }}>{item.category}</span>
                        <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#73737c" }}>{formatMoney(item.spend, utilization.currency)}</span>
                      </div>
                      <div style={{ height: "2px", backgroundColor: "#d9d9d9", borderRadius: "1px" }}>
                        <div style={{ height: "100%", width: `${barPct}%`, backgroundColor: "#635bff", borderRadius: "1px", transition: "width 400ms ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <h3 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 22", fontSize: "20px", letterSpacing: "-0.6px", color: "#010110", margin: 0, marginBottom: "16px" }}>
                Suggestions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px" }}>
                    <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", padding: "3px 8px", borderRadius: "100px", border: "1px solid rgba(1,1,16,0.20)", color: "#010110", alignSelf: "flex-start", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                      {s.category}
                    </span>
                    <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0, lineHeight: 1.5 }}>
                      {s.reason}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unused categories */}
          {unusedCategories.length > 0 && (
            <Card style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 22", fontSize: "20px", letterSpacing: "-0.6px", color: "#010110", margin: 0, marginBottom: "16px" }}>
                Unused by employees
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {unusedCategories.map((u) => (
                  <div key={u.category} style={{ padding: "6px 14px", borderRadius: "100px", border: "1px solid rgba(1,1,16,0.15)", display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#010110", textTransform: "capitalize" }}>{u.category}</span>
                    <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", color: "#73737c" }}>{u.employeeCount} {u.employeeCount === 1 ? "employee" : "employees"}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
