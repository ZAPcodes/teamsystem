"use client";

import * as React from "react";
import { useEmployerCompany } from "@/lib/hooks/use-employer";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import type { EmployerCompanyDTO } from "@/lib/api/contracts";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px 120px" }}>
        {children}
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "22px", lineHeight: 1.13, letterSpacing: "-0.66px", color: "#010110", margin: 0, marginBottom: "16px" }}>
      {children}
    </h2>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", padding: "24px", ...style }}>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: 0, marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", fontWeight: 500, letterSpacing: "-0.72px", color: "#010110", margin: 0 }}>
        {value}
      </p>
    </div>
  );
}

export default function EmployerOverviewPage() {
  const { data, loading, error, refetch, fundWallet, updatePolicy } = useEmployerCompany();

  const [fundAmount, setFundAmount] = React.useState("");
  const [fundLoading, setFundLoading] = React.useState(false);
  const [fundError, setFundError] = React.useState<string | null>(null);
  const [fundSuccess, setFundSuccess] = React.useState(false);

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(fundAmount, 10);
    if (!amount || amount <= 0) { setFundError("Enter a valid amount."); return; }
    setFundLoading(true);
    setFundError(null);
    setFundSuccess(false);
    try {
      await fundWallet(amount);
      setFundAmount("");
      setFundSuccess(true);
      setTimeout(() => setFundSuccess(false), 3000);
    } catch (e) {
      setFundError((e as Error).message);
    } finally {
      setFundLoading(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <SkeletonHeader />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "40px" }}>
          <SkeletonCard height={160} />
          <SkeletonCard height={160} />
        </div>
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <ErrorCard message={error ?? "Unknown error"} onRetry={refetch} />
      </PageShell>
    );
  }

  const { company, policy } = data;
  const currency = company.currency;

  const RESET_LABELS: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", annual: "Annual" };

  return (
    <PageShell>
      {/* Header */}
      <header style={{ marginBottom: "48px" }}>
        <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 56", fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.07, letterSpacing: "-1.56px", color: "#010110", margin: 0, marginBottom: "8px" }}>
          {company.name}
        </h1>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
          {company.country} &middot; {currency}
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "40px" }}>
        {/* Wallet */}
        <Card>
          <SectionTitle>Company wallet</SectionTitle>
          <Stat label="Current balance" value={formatMoney(company.walletBalance, currency)} />

          {/* Fund form */}
          <form onSubmit={handleFund} style={{ marginTop: "24px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: "12px", letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", marginBottom: "6px" }}>
                Add funds ({currency})
              </label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="50000"
                min={1}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid rgba(1,1,16,0.15)", fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", color: "#010110", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
              />
            </div>
            <Button type="submit" variant="primary" disabled={fundLoading} style={{ flexShrink: 0 }}>
              {fundLoading ? "Adding..." : "Add"}
            </Button>
          </form>

          {fundError && (
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#010110", margin: "8px 0 0" }}>{fundError}</p>
          )}
          {fundSuccess && (
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#73737c", margin: "8px 0 0" }}>Funds added.</p>
          )}
        </Card>

        {/* Policy */}
        <Card>
          <SectionTitle>Benefits policy</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Stat label="Per-employee" value={formatMoney(policy.perEmployeeAllowance, currency)} />
            <Stat label="Reset" value={RESET_LABELS[policy.resetPeriod] ?? policy.resetPeriod} />
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c", margin: 0, marginBottom: "6px" }}>Categories</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {policy.allowedCategories.map((c) => (
                  <span key={c} style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "12px", padding: "3px 8px", borderRadius: "100px", border: "1px solid rgba(1,1,16,0.20)", color: "#010110" }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <PolicyEditor key={`${policy.perEmployeeAllowance}-${policy.resetPeriod}-${policy.allowedCategories.join("|")}`} data={data} onSave={updatePolicy} />
        </Card>
      </div>
    </PageShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(1,1,16,0.15)",
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: "14px",
  color: "#010110",
  outline: "none",
  boxSizing: "border-box",
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 400,
};

function PolicyEditor({
  data,
  onSave,
}: {
  data: EmployerCompanyDTO;
  onSave: ReturnType<typeof useEmployerCompany>["updatePolicy"];
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [form, setForm] = React.useState({
    perEmployeeAllowance: String(data.policy.perEmployeeAllowance),
    resetPeriod: data.policy.resetPeriod,
    allowedCategories: data.policy.allowedCategories.join(", "),
    currency: data.policy.currency,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await onSave({
        perEmployeeAllowance: parseInt(form.perEmployeeAllowance, 10),
        resetPeriod: form.resetPeriod as "monthly" | "quarterly" | "annual",
        allowedCategories: form.allowedCategories.split(",").map((c) => c.trim()).filter(Boolean),
        currency: form.currency.trim().toUpperCase(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
      <label style={fieldLabelStyle}>
        Per-employee
        <input type="number" min={0} value={form.perEmployeeAllowance} onChange={(e) => setForm({ ...form, perEmployeeAllowance: e.target.value })} style={inputStyle} />
      </label>
      <label style={fieldLabelStyle}>
        Reset
        <select value={form.resetPeriod} onChange={(e) => setForm({ ...form, resetPeriod: e.target.value as "monthly" | "quarterly" | "annual" })} style={inputStyle}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
        </select>
      </label>
      <label style={fieldLabelStyle}>
        Categories
        <input value={form.allowedCategories} onChange={(e) => setForm({ ...form, allowedCategories: e.target.value })} style={inputStyle} />
      </label>
      <label style={fieldLabelStyle}>
        Currency
        <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle} />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "12px" }}>
        <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving..." : "Save policy"}</Button>
        {error && <span style={{ fontSize: "13px", color: "#010110" }}>{error}</span>}
        {success && <span style={{ fontSize: "13px", color: "#73737c" }}>Policy saved.</span>}
      </div>
    </form>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#73737c",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function SkeletonHeader() {
  return (
    <div>
      <div style={{ height: "48px", width: "40%", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", marginBottom: "12px", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
      <div style={{ height: "16px", width: "20%", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
    </div>
  );
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <div style={{ height, borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ border: "1px solid rgba(1,1,16,0.15)", borderRadius: "8px", padding: "32px 24px", maxWidth: "480px" }}>
      <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "22px", letterSpacing: "-0.66px", color: "#010110", margin: 0, marginBottom: "8px" }}>
        Could not load company data.
      </p>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0, marginBottom: "20px" }}>{message}</p>
      <Button variant="ghost" onClick={onRetry}>Try again</Button>
    </div>
  );
}
