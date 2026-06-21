"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { PackageBuilderSheet } from "@/components/perx/package-builder-sheet";
import { PeerAdvocacySheet } from "@/components/perx/peer-advocacy-sheet";
import { PackageFloatingTrigger } from "@/components/perx/package-floating-trigger";
import { PerxNav } from "@/components/perx/nav";
import { NotificationsBell } from "@/components/perx/notifications-bell";
import { PlayerCardNav } from "@/components/perx/player-card-nav";
import { LocaleSwitcher } from "@/components/perx/locale-switcher";
import { useRequireRole } from "@/lib/auth/use-require-role";
import { usePeerAdvocacyPrompt } from "@/lib/hooks/use-engagement";
import { usePackageStore } from "@/lib/store/package";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const consumeOpenBuilder = usePackageStore((s) => s.consumeOpenBuilder);
  const peerAdvocacy = usePeerAdvocacyPrompt();
  const { isLoading, isAuthorized } = useRequireRole("employee");
  const { t } = useTranslation();

  const employeeNav = React.useMemo(
    () => [
      { label: t("nav.marketplace"), href: "/marketplace" },
      { label: t("nav.progress"), href: "/progress" },
      { label: t("nav.history"), href: "/marketplace/history" },
      { label: t("nav.gift"), href: "/gift" },
      { label: t("nav.wrapped"), href: "/wrapped" },
    ],
    [t]
  );

  React.useEffect(() => {
    const id = setInterval(() => {
      if (consumeOpenBuilder()) setSheetOpen(true);
    }, 100);
    return () => clearInterval(id);
  }, [consumeOpenBuilder]);

  const pathname = usePathname();
  const heroNav = pathname === "/marketplace" || pathname.startsWith("/marketplace?");

  if (isLoading || !isAuthorized) return null;

  return (
    <div className="employee-theme">
      <PerxNav
        variant={heroNav ? "new-genre" : "default"}
        items={employeeNav}
        trailing={
          <>
            <LocaleSwitcher />
            <PlayerCardNav />
            <NotificationsBell />
          </>
        }
      />
      {children}

      <PackageFloatingTrigger onOpen={() => setSheetOpen(true)} />
      <PackageBuilderSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <PeerAdvocacySheet
        open={peerAdvocacy.open}
        advocacy={peerAdvocacy.advocacy}
        onClose={peerAdvocacy.close}
      />
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
    </div>
  );
}
