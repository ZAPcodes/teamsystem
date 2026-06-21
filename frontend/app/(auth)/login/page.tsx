"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store/session";
import { apiPost } from "@/lib/api/client";
import type { UserDTO } from "@/lib/api/contracts";
import { primaryRoleHome } from "@/lib/auth/use-require-role";

const FIELD_STYLE: React.CSSProperties = {
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

const DEMO_PASSWORD = "demo123";

const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    email: "elira@acme.test",
    description: "Marketplace, Bora AI, history, Wrapped",
    accent: "#635bff",
  },
  {
    role: "Employer",
    email: "dritan@acme.test",
    description: "Compliance, team quests, insights, employees",
    accent: "#010110",
  },
  {
    role: "Provider",
    email: "provider@perx.test",
    description: "Manage offers, scan vouchers, earnings",
    accent: "#2d6a4f",
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    const res = await apiPost<{ token: string; user: UserDTO }>("/auth/login", {
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });
    setSession(res.token, res.user);
    router.replace(primaryRoleHome(res.user.roles));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await performLogin(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError(null);
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setDemoLoading(demoEmail);
    try {
      await performLogin(demoEmail, DEMO_PASSWORD);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDemoLoading(null);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "48px" }}>
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#635bff",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 700,
            fontSize: "16px",
            letterSpacing: "-0.32px",
            color: "#010110",
          }}
        >
          perx
        </span>
      </div>

      {/* Headline */}
      <h1
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontVariationSettings: "'wght' 400, 'opsz' 56",
          fontSize: "clamp(38px, 6vw, 56px)",
          lineHeight: 1.07,
          letterSpacing: "-1.68px",
          color: "#010110",
          margin: 0,
          marginBottom: "8px",
        }}
      >
        Welcome back.
      </h1>
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "14px",
          lineHeight: 1.5,
          color: "#73737c",
          margin: 0,
          marginBottom: "40px",
        }}
      >
        Log in to your Perx account.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label
            style={{
              display: "block",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#73737c",
              marginBottom: "6px",
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            autoComplete="email"
            style={FIELD_STYLE}
            onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#73737c",
              marginBottom: "6px",
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            style={FIELD_STYLE}
            onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
            onBlur={(e) => (e.currentTarget.style.outline = "none")}
          />
        </div>

        {error && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "14px",
              color: "#010110",
              border: "1px solid rgba(1,1,16,0.20)",
              borderRadius: "8px",
              padding: "10px 14px",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        <div style={{ marginTop: "8px" }}>
          <Button type="submit" variant="primary" disabled={loading || demoLoading !== null} style={{ width: "100%" }}>
            {loading ? "Logging in..." : "Log in."}
          </Button>
        </div>
      </form>

      <section
        aria-label="Demo accounts for reviewers"
        style={{
          marginTop: "40px",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(99,91,255,0.2)",
          background: "linear-gradient(180deg, rgba(99,91,255,0.06) 0%, rgba(255,255,255,0.9) 100%)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#635bff",
            margin: "0 0 6px",
          }}
        >
          Demo access
        </p>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            lineHeight: 1.5,
            color: "#010110",
            margin: "0 0 4px",
          }}
        >
          Password for all accounts:{" "}
          <code
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "13px",
              padding: "2px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(1,1,16,0.06)",
            }}
          >
            {DEMO_PASSWORD}
          </code>
        </p>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "13px",
            color: "#73737c",
            margin: "0 0 16px",
          }}
        >
          One-click into each portal — employee, employer, and provider.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {DEMO_ACCOUNTS.map((account) => {
            const busy = demoLoading === account.email;
            return (
              <div
                key={account.email}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(1,1,16,0.1)",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-inter), sans-serif",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: account.accent,
                      }}
                    >
                      {account.role}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "13px",
                      color: "#010110",
                      margin: "0 0 4px",
                    }}
                  >
                    {account.email}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "12px",
                      color: "#73737c",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {account.description}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => fillDemo(account.email)}
                    disabled={loading || demoLoading !== null}
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "13px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(1,1,16,0.15)",
                      backgroundColor: "#ffffff",
                      color: "#010110",
                      cursor: loading || demoLoading !== null ? "not-allowed" : "pointer",
                      opacity: loading || demoLoading !== null ? 0.6 : 1,
                    }}
                  >
                    Fill
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={loading || demoLoading !== null}
                    onClick={() => void handleDemoLogin(account.email)}
                    style={{ minWidth: "100px" }}
                  >
                    {busy ? "…" : "Enter"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div
        style={{
          marginTop: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <Link
          href="/signup/employee"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            color: "#010110",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          New employee? Join your company &rarr;
        </Link>
        <Link
          href="/signup/company"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            color: "#010110",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          Setting up a company? &rarr;
        </Link>
      </div>
    </div>
  );
}
