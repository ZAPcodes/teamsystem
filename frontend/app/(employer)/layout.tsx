"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { PerxNav } from "@/components/perx/nav";
import { LocaleSwitcher } from "@/components/perx/locale-switcher";
import { useRequireRole } from "@/lib/auth/use-require-role";

const EMPLOYER_NAV = [
  { label: "Overview", href: "/employer" },
  { label: "Team quests", href: "/employer/quests" },
  { label: "Compliance", href: "/employer/compliance" },
  { label: "Benefit requests", href: "/employer/benefit-requests" },
  { label: "Employees", href: "/employer/employees" },
  { label: "Insights", href: "/employer/insights" },
];

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized } = useRequireRole("employer_admin");

  if (isLoading || !isAuthorized) return null;

  return (
    <>
      <PerxNav items={EMPLOYER_NAV} trailing={<LocaleSwitcher />} />
      {children}
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            color: "#010110",
            backgroundColor: "#ffffff",
            border: "1px solid rgba(1,1,16,0.15)",
            borderRadius: "8px",
            boxShadow: "none",
          },
        }}
      />
    </>
  );
}
