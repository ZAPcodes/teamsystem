"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session";
import { apiPost } from "@/lib/api/client";
import type { UserDTO } from "@/lib/api/contracts";

const KNOWN_CATEGORIES = ["wellness", "food", "travel", "learning", "lifestyle"];

const FIELD: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(1,1,16,0.15)",
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: "16px",
  color: "#010110",
  backgroundColor: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  fontSize: "12px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#73737c",
  marginBottom: "6px",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "22px", lineHeight: 1.13, letterSpacing: "-0.66px", color: "#010110", margin: 0, marginBottom: "16px" }}>
      {children}
    </h2>
  );
}

export default function CompanySignupPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  // Role selection
  const [selectedRoles, setSelectedRoles] = React.useState<Array<"employer" | "provider">>([]);

  // Common fields
  const [companyName, setCompanyName] = React.useState("");
  const [country, setCountry] = React.useState("AL");
  const [currency, setCurrency] = React.useState("ALL");
  const [locale, setLocale] = React.useState("sq");
  const [adminName, setAdminName] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [adminPassword, setAdminPassword] = React.useState("");

  // Employer policy
  const [allowance, setAllowance] = React.useState("20000");
  const [resetPeriod, setResetPeriod] = React.useState<"monthly" | "quarterly" | "annual">("quarterly");
  const [allowedCategories, setAllowedCategories] = React.useState<string[]>([...KNOWN_CATEGORIES]);

  // Provider profile
  const [providerCategory, setProviderCategory] = React.useState("wellness");
  const [providerDescription, setProviderDescription] = React.useState("");
  const [providerLogoUrl, setProviderLogoUrl] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggleRole = (role: "employer" | "provider") => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleCategory = (cat: string) => {
    setAllowedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const canSubmit = selectedRoles.length > 0 && companyName.trim() && adminName.trim() && adminEmail.trim() && adminPassword.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) { setError("Select at least one company role."); return; }
    setError(null);
    setLoading(true);

    const payload: Record<string, unknown> = {
      companyName: companyName.trim(),
      country: country.trim(),
      currency: currency.trim(),
      locale: locale.trim(),
      roles: selectedRoles,
      admin: { name: adminName.trim(), email: adminEmail.trim().toLowerCase(), password: adminPassword },
    };

    if (selectedRoles.includes("employer")) {
      payload.employerPolicy = {
        perEmployeeAllowance: parseInt(allowance, 10) || 0,
        resetPeriod,
        allowedCategories: allowedCategories.length > 0 ? allowedCategories : KNOWN_CATEGORIES,
      };
    }
    if (selectedRoles.includes("provider")) {
      const prov: Record<string, unknown> = {
        category: providerCategory,
        description: providerDescription.trim() || "A Perx provider.",
      };
      if (providerLogoUrl.trim()) prov.logoUrl = providerLogoUrl.trim();
      payload.providerProfile = prov;
    }

    try {
      const res = await apiPost<{ token: string; user: UserDTO }>("/auth/signup/company", payload);
      setSession(res.token, res.user);
      // Dual-role: default to employer home
      router.replace(selectedRoles.includes("employer") ? "/employer" : "/provider");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const roleChipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "100px",
    border: active ? "1px solid #010110" : "1px solid rgba(1,1,16,0.20)",
    backgroundColor: active ? "#010110" : "transparent",
    color: active ? "#ffffff" : "#010110",
    fontFamily: "var(--font-inter), sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 120ms ease",
  });

  const catPillStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    padding: "5px 12px",
    borderRadius: "100px",
    border: active ? "1px solid #010110" : "1px solid rgba(1,1,16,0.20)",
    backgroundColor: active ? "#010110" : "transparent",
    color: active ? "#ffffff" : "#73737c",
    fontFamily: "var(--font-inter), sans-serif",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 120ms ease",
  });

  return (
    <div style={{ paddingBottom: "48px" }}>
      <div style={{ marginBottom: "48px" }}>
        <Link href="/login" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", textDecoration: "none" }}>
          &larr; Log in instead
        </Link>
      </div>

      <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 56", fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.07, letterSpacing: "-1.44px", color: "#010110", margin: 0, marginBottom: "8px" }}>
        Bring Perx to your company.
      </h1>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0, marginBottom: "40px" }}>
        Set up your company profile in under a minute.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Role toggle */}
        <div>
          <p style={{ ...LABEL, marginBottom: "12px" }}>What does your company do?</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={roleChipStyle(selectedRoles.includes("employer"))} onClick={() => toggleRole("employer")}>
              {selectedRoles.includes("employer") && <span style={{ fontSize: "11px" }}>&#10003;</span>}
              We give benefits
            </button>
            <button type="button" style={roleChipStyle(selectedRoles.includes("provider"))} onClick={() => toggleRole("provider")}>
              {selectedRoles.includes("provider") && <span style={{ fontSize: "11px" }}>&#10003;</span>}
              We offer services
            </button>
          </div>
          {selectedRoles.length === 0 && (
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#73737c", margin: "8px 0 0" }}>
              Select at least one to continue.
            </p>
          )}
        </div>

        {/* Common fields — always visible once role is selected */}
        {selectedRoles.length > 0 && (
          <>
            {/* Company basics */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <SectionHeading>Company</SectionHeading>
              <div>
                <label style={LABEL}>Company name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Albania" required style={FIELD}
                  onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                  onBlur={(e) => (e.currentTarget.style.outline = "none")}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={LABEL}>Country</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="AL" required maxLength={2} style={FIELD}
                    onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                    onBlur={(e) => (e.currentTarget.style.outline = "none")}
                  />
                </div>
                <div>
                  <label style={LABEL}>Currency</label>
                  <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="ALL" required maxLength={3} style={FIELD}
                    onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                    onBlur={(e) => (e.currentTarget.style.outline = "none")}
                  />
                </div>
              </div>
            </div>

            {/* Employer policy section */}
            {selectedRoles.includes("employer") && (
              <div style={{ borderTop: "1px solid rgba(1,1,16,0.10)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeading>Benefits policy</SectionHeading>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={LABEL}>Per-employee allowance</label>
                    <input type="number" value={allowance} onChange={(e) => setAllowance(e.target.value)} placeholder="20000" min={0} required style={FIELD}
                      onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                      onBlur={(e) => (e.currentTarget.style.outline = "none")}
                    />
                    <span style={{ fontSize: "12px", color: "#73737c", marginTop: "4px", display: "block" }}>in {currency}</span>
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Reset period</label>
                  <select value={resetPeriod} onChange={(e) => setResetPeriod(e.target.value as "monthly" | "quarterly" | "annual")} style={{ ...FIELD, cursor: "pointer" }}
                    onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                    onBlur={(e) => (e.currentTarget.style.outline = "none")}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Allowed categories</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    {KNOWN_CATEGORIES.map((cat) => (
                      <button key={cat} type="button" style={catPillStyle(allowedCategories.includes(cat))} onClick={() => toggleCategory(cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Provider section */}
            {selectedRoles.includes("provider") && (
              <div style={{ borderTop: "1px solid rgba(1,1,16,0.10)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <SectionHeading>Provider profile</SectionHeading>
                <div>
                  <label style={LABEL}>Category</label>
                  <select value={providerCategory} onChange={(e) => setProviderCategory(e.target.value)} style={{ ...FIELD, cursor: "pointer" }}
                    onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                    onBlur={(e) => (e.currentTarget.style.outline = "none")}
                  >
                    {KNOWN_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Description</label>
                  <textarea
                    value={providerDescription}
                    onChange={(e) => setProviderDescription(e.target.value)}
                    placeholder="What services do you offer employees?"
                    rows={3}
                    style={{ ...FIELD, resize: "vertical", lineHeight: 1.5 }}
                    onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                    onBlur={(e) => (e.currentTarget.style.outline = "none")}
                  />
                </div>
                <div>
                  <label style={LABEL}>Logo URL (optional)</label>
                  <input type="url" value={providerLogoUrl} onChange={(e) => setProviderLogoUrl(e.target.value)} placeholder="https://..." style={FIELD}
                    onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                    onBlur={(e) => (e.currentTarget.style.outline = "none")}
                  />
                </div>
              </div>
            )}

            {/* Admin account */}
            <div style={{ borderTop: "1px solid rgba(1,1,16,0.10)", paddingTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <SectionHeading>Admin account</SectionHeading>
              <div>
                <label style={LABEL}>Your name</label>
                <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Dritan Selmani" required style={FIELD}
                  onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                  onBlur={(e) => (e.currentTarget.style.outline = "none")}
                />
              </div>
              <div>
                <label style={LABEL}>Work email</label>
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com" required style={FIELD}
                  onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                  onBlur={(e) => (e.currentTarget.style.outline = "none")}
                />
              </div>
              <div>
                <label style={LABEL}>Password</label>
                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="6+ characters" required minLength={6} style={FIELD}
                  onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                  onBlur={(e) => (e.currentTarget.style.outline = "none")}
                />
              </div>
            </div>
          </>
        )}

        {error && (
          <p role="alert" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", border: "1px solid rgba(1,1,16,0.20)", borderRadius: "8px", padding: "10px 14px", margin: 0 }}>
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSubmit || loading} style={{ width: "100%" }}>
          {loading ? "Setting up..." : selectedRoles.length === 0 ? "Select a role to continue" : "Launch on Perx."}
        </Button>
      </form>
    </div>
  );
}
