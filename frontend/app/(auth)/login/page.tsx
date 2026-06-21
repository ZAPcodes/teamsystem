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

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ token: string; user: UserDTO }>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      setSession(res.token, res.user);
      router.replace(primaryRoleHome(res.user.roles));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
          <Button type="submit" variant="primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Logging in..." : "Log in."}
          </Button>
        </div>
      </form>

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
