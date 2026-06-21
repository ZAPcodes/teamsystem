"use client";

import * as React from "react";
import { PerxNav } from "@/components/perx/nav";
import { useRequireRole } from "@/lib/auth/use-require-role";

const PROVIDER_NAV = [
  { label: "Offers", href: "/provider" },
  { label: "Earnings", href: "/provider/earnings" },
  { label: "Scan", href: "/provider/scan" },
];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthorized } = useRequireRole("provider_admin");

  if (isLoading || !isAuthorized) return null;

  return (
    <>
      <PerxNav items={PROVIDER_NAV} />
      {children}
    </>
  );
}
