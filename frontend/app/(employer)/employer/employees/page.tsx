"use client";

import * as React from "react";
import { useEmployerEmployees } from "@/lib/hooks/use-employer";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import type { EmployeeWithAllowanceDTO } from "@/lib/api/contracts";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px 120px" }}>
        {children}
      </div>
    </main>
  );
}

export default function EmployeesPage() {
  const { employees, loading, error } = useEmployerEmployees();

  if (loading) {
    return (
      <PageShell>
        <div style={{ height: "48px", width: "30%", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", marginBottom: "40px", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: "72px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", marginBottom: "8px", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
        ))}
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <p role="alert" style={{ fontSize: "14px", color: "#73737c" }}>Could not load employees: {error}</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header style={{ marginBottom: "48px" }}>
        <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 56", fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.07, letterSpacing: "-1.56px", color: "#010110", margin: 0, marginBottom: "8px" }}>
          Your team.
        </h1>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
          {employees?.length ?? 0} {employees?.length === 1 ? "employee" : "employees"}
        </p>
      </header>

      {!employees || employees.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", overflow: "hidden" }}>
          {employees.map((emp) => (
            <EmployeeRow key={emp.id} employee={emp} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function EmployeeRow({ employee: emp }: { employee: EmployeeWithAllowanceDTO }) {
  const { allowance } = emp;
  const pct = allowance.total > 0
    ? Math.min(((allowance.used + allowance.held) / allowance.total) * 100, 100)
    : 0;
  const spentPct = allowance.total > 0 ? Math.min((allowance.used / allowance.total) * 100, 100) : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "40px 1fr 1fr 160px",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid rgba(1,1,16,0.07)",
      }}
    >
      {/* Avatar */}
      <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(1,1,16,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "11px", color: "#010110", letterSpacing: "0.04em", flexShrink: 0 }}>
        {emp.initials}
      </div>

      {/* Name + email */}
      <div>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", fontWeight: 500, color: "#010110", margin: 0, letterSpacing: "-0.3px" }}>{emp.name}</p>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#73737c", margin: 0 }}>{emp.email}</p>
      </div>

      {/* Allowance numbers */}
      <div>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", fontWeight: 500, color: "#010110", margin: 0, letterSpacing: "-0.28px" }}>
          {formatMoney(allowance.available, allowance.currency)} <span style={{ color: "#73737c", fontWeight: 400 }}>/ {formatMoney(allowance.total, allowance.currency)}</span>
        </p>
      </div>

      {/* Mini budget meter */}
      <div>
        <div style={{ position: "relative", height: "2px", backgroundColor: "#d9d9d9", borderRadius: "1px" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${spentPct}%`, backgroundColor: "#635bff", borderRadius: "1px" }} />
          {allowance.held > 0 && (
            <div style={{ position: "absolute", left: `${pct}%`, top: "-3px", width: "1px", height: "8px", backgroundColor: "#010110" }} />
          )}
        </div>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", color: "#73737c", margin: 0, marginTop: "4px" }}>
          {formatMoney(allowance.used, allowance.currency)} spent
          {allowance.held > 0 ? ` · ${formatMoney(allowance.held, allowance.currency)} held` : ""}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", padding: "48px 32px", textAlign: "center", maxWidth: "480px" }}>
      <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "26px", lineHeight: 1.13, letterSpacing: "-0.78px", color: "#010110", margin: 0, marginBottom: "12px" }}>
        No employees yet.
      </h2>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
        Share your company sign-up link with your team to get started.
      </p>
    </div>
  );
}
