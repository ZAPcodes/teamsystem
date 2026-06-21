"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/session";
import type { Role } from "@/lib/api/contracts";
import { roleHome, primaryRoleHome } from "@/lib/auth/use-require-role";
import { useTranslation } from "@/lib/i18n/use-translation";

interface NavItem {
  label: string;
  href: string;
}

interface PerxNavProps {
  items: NavItem[];
  trailing?: React.ReactNode;
  /** New Genre: transparent nav floating on gradient hero */
  variant?: "default" | "new-genre";
}

function roleLabel(role: Role): string {
  if (role === "employee") return "Employee";
  if (role === "employer_admin") return "Employer";
  if (role === "provider_admin") return "Provider";
  return role;
}

export function PerxNav({ items, trailing, variant = "default" }: PerxNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useSessionStore();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = React.useState(false);

  const isNewGenre = variant === "new-genre";
  const ink = isNewGenre ? "#0c1018" : "#010110";
  const fog = isNewGenre ? "#6d7074" : "#73737c";

  React.useEffect(() => {
    if (!isNewGenre) {
      setScrolled(false);
      return;
    }

    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isNewGenre]);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  const otherRoles = (user?.roles ?? []).filter((r) => {
    if (pathname.startsWith("/marketplace") || pathname.startsWith("/me")) return r !== "employee";
    if (pathname.startsWith("/employer")) return r !== "employer_admin";
    if (pathname.startsWith("/provider")) return r !== "provider_admin";
    return true;
  });

  const navClassName = isNewGenre
    ? `ng-nav-transparent${scrolled ? " ng-nav-scrolled" : ""}`
    : undefined;

  return (
    <nav
      aria-label="Main navigation"
      className={navClassName}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: "72px",
        backgroundColor: isNewGenre ? (scrolled ? "rgba(255,255,255,0.96)" : "transparent") : "#ffffff",
        borderBottom: isNewGenre ? (scrolled ? "1px solid rgba(1,1,16,0.12)" : "none") : "1px solid rgba(1,1,16,0.12)",
        backdropFilter: isNewGenre && scrolled ? "blur(10px)" : undefined,
        display: "flex",
        alignItems: "center",
        padding: isNewGenre ? "0 32px" : "0 24px",
      }}
    >
      <div
        className="ng-nav-inner"
        style={{
          width: "100%",
          maxWidth: isNewGenre ? "1400px" : "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr) auto",
          alignItems: "center",
          columnGap: "24px",
        }}
      >
        {/* Logo */}
        <Link
          href={user?.roles.length ? primaryRoleHome(user.roles) : "/"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          {!isNewGenre && (
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#635bff",
              }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: isNewGenre ? 500 : 700,
              fontSize: isNewGenre ? "14px" : "16px",
              letterSpacing: isNewGenre ? "0.04em" : "-0.32px",
              textTransform: isNewGenre ? "uppercase" : "none",
              color: ink,
            }}
          >
            perx
          </span>
        </Link>

        {/* Nav items — centered, width-stable */}
        <div
          className="ng-nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="ng-nav-link"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  fontWeight: active ? 570 : 400,
                  color: active ? ink : fog,
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: isNewGenre ? "8px" : "100px",
                  backgroundColor: active && !isNewGenre ? "rgba(1,1,16,0.06)" : "transparent",
                  transition: "color 120ms ease, background-color 120ms ease",
                  letterSpacing: "-0.28px",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right cluster — pinned to the right edge */}
        <div className="ng-nav-right" style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, justifySelf: "end" }}>
          {trailing && (
            <div className="ng-nav-tools-cluster" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {trailing}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {otherRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => router.push(roleHome(role))}
                className="ng-nav-ghost-pill"
              >
                {roleLabel(role)}
              </button>
            ))}

            {user && (
              <div
                aria-label={user.name}
                title={user.name}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(1,1,16,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontWeight: 700,
                  fontSize: "11px",
                  color: ink,
                  letterSpacing: "0.04em",
                  flexShrink: 0,
                }}
              >
                {user.initials}
              </div>
            )}

            <button type="button" onClick={handleLogout} className="ng-nav-ghost-pill ng-nav-logout" style={{ minWidth: "72px" }}>
              {t("nav.logout")}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
