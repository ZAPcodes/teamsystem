"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session";
import { apiGet, apiPost } from "@/lib/api/client";
import type { UserDTO, PublicCompanyDTO } from "@/lib/api/contracts";

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

export default function EmployeeSignupPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [companyQuery, setCompanyQuery] = React.useState("");

  const [companies, setCompanies] = React.useState<PublicCompanyDTO[] | null>(null);
  const [companiesLoading, setCompaniesLoading] = React.useState(true);
  const [companiesError, setCompaniesError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch company list on mount (no auth required)
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ companies: PublicCompanyDTO[] }>("/auth/companies?role=employer");
        setCompanies(res.companies);
      } catch (e) {
        setCompaniesError((e as Error).message);
      } finally {
        setCompaniesLoading(false);
      }
    })();
  }, []);

  const filteredCompanies = React.useMemo(() => {
    if (!companies) return [];
    const q = companyQuery.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, companyQuery]);

  const selectedCompany = companies?.find((c) => c.id === companyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) { setError("Select your company first."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ token: string; user: UserDTO }>("/auth/signup/employee", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        companyId,
      });
      setSession(res.token, res.user);
      router.replace("/marketplace");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Back link */}
      <div style={{ marginBottom: "48px" }}>
        <Link
          href="/login"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            color: "#73737c",
            textDecoration: "none",
          }}
        >
          &larr; Log in instead
        </Link>
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontVariationSettings: "'wght' 400, 'opsz' 56",
          fontSize: "clamp(32px, 5vw, 48px)",
          lineHeight: 1.07,
          letterSpacing: "-1.44px",
          color: "#010110",
          margin: 0,
          marginBottom: "8px",
        }}
      >
        Join your company&apos;s benefits.
      </h1>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0, marginBottom: "40px" }}>
        Browse, build, and redeem perks your company funds.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={LABEL}>Your name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Elira Hoxha" required style={FIELD}
            onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          />
        </div>
        <div>
          <label style={LABEL}>Work email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required style={FIELD}
            onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          />
        </div>
        <div>
          <label style={LABEL}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" required minLength={6} style={FIELD}
            onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          />
        </div>

        {/* Company picker */}
        <div>
          <label style={LABEL}>Your company</label>
          {companiesLoading ? (
            <div style={{ ...FIELD, color: "#73737c", display: "flex", alignItems: "center" }}>Loading companies...</div>
          ) : companiesError ? (
            <p style={{ fontSize: "14px", color: "#010110", margin: 0 }}>{companiesError}</p>
          ) : companies && companies.length === 0 ? (
            <div style={{ padding: "16px", border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0, marginBottom: "8px" }}>
                No companies have set up Perx yet.
              </p>
              <Link href="/signup/company" style={{ fontSize: "14px", color: "#010110", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Be the first &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ border: "1px solid rgba(1,1,16,0.15)", borderRadius: "8px", overflow: "hidden" }}>
              <input
                type="text"
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                placeholder="Search companies..."
                style={{ ...FIELD, borderRadius: "8px 8px 0 0", border: "none", borderBottom: "1px solid rgba(1,1,16,0.10)" }}
                onFocus={(e) => (e.currentTarget.style.outline = "none")}
              />
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {filteredCompanies.length === 0 ? (
                  <div style={{ padding: "12px 16px", fontSize: "14px", color: "#73737c" }}>No matches</div>
                ) : (
                  filteredCompanies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCompanyId(c.id); setCompanyQuery(c.name); }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 16px",
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: "15px",
                        color: "#010110",
                        background: companyId === c.id ? "rgba(1,1,16,0.04)" : "#ffffff",
                        border: "none",
                        borderBottom: "1px solid rgba(1,1,16,0.06)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {companyId === c.id && (
                        <span style={{ color: "#635bff", fontWeight: 700, fontSize: "12px" }}>&#10003;</span>
                      )}
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", border: "1px solid rgba(1,1,16,0.20)", borderRadius: "8px", padding: "10px 14px", margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: "8px" }}>
          <Button type="submit" variant="primary" disabled={loading || !companyId} style={{ width: "100%" }}>
            {loading ? "Creating account..." : "Join Perx."}
          </Button>
        </div>
      </form>
    </div>
  );
}
