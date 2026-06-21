"use client";

import * as React from "react";
import { HistoryBenefitCard, HistoryBenefitCardSkeleton } from "@/components/perx/history-benefit-card";
import { groupHistoryByDate } from "@/components/perx/voucher-detail-modal";
import { useMyPackages } from "@/lib/hooks/use-engagement";
import { useOffers } from "@/lib/hooks/use-offers";
import { PeerAdvocacyDemoTrigger } from "@/components/perx/peer-advocacy-demo-trigger";
import { EmployeePageShell, EmployeeDisplayTitle } from "@/components/perx/employee-page-shell";
import { NG } from "@/lib/new-genre/tokens";

export default function HistoryPage() {
  const { packages, loading } = useMyPackages();
  const { offers } = useOffers();

  const imageByOfferId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const offer of offers ?? []) {
      if (offer.imageUrl) map.set(offer.id, offer.imageUrl);
    }
    return map;
  }, [offers]);

  const dateGroups = React.useMemo(() => {
    const groups = groupHistoryByDate(packages);
    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        imageUrl: imageByOfferId.get(item.line.offerId),
      })),
    }));
  }, [packages, imageByOfferId]);

  return (
    <main style={{ backgroundColor: NG.parchment, minHeight: "100vh" }}>
      <EmployeePageShell>
        <EmployeeDisplayTitle gradientTail="history.">
          Your perk
        </EmployeeDisplayTitle>
        <p
          style={{
            fontFamily: NG.fontBody,
            fontSize: "16px",
            lineHeight: 1.4,
            color: NG.slateVeil,
            margin: "0 0 40px",
            maxWidth: "520px",
          }}
        >
          Every approved package and redemption code — same catalog cards as the marketplace, kept for when you need them.
        </p>

        <PeerAdvocacyDemoTrigger />

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div className="shimmer" style={{ height: "28px", width: "200px", borderRadius: "8px" }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                gap: "20px",
              }}
            >
              {Array.from({ length: 2 }).map((_, i) => (
                <HistoryBenefitCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : dateGroups.length === 0 ? (
          <div className="ng-box-card ng-box-card--elevated" style={{ maxWidth: "480px", textAlign: "center", padding: "40px 28px" }}>
            <p style={{ fontFamily: NG.fontBody, fontSize: "18px", fontWeight: 570, color: NG.onyx, margin: "0 0 8px" }}>
              No packages yet
            </p>
            <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: 0 }}>
              Build a package on the marketplace and claim it — your vouchers land here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            {dateGroups.map((group) => (
              <section key={group.dateKey} id={`history-${group.dateKey}`}>
                <div style={{ marginBottom: "24px" }}>
                  <h2
                    style={{
                      fontFamily: NG.fontBody,
                      fontSize: "clamp(22px, 3vw, 28px)",
                      fontWeight: 570,
                      lineHeight: 1.15,
                      letterSpacing: "-0.28px",
                      color: NG.onyx,
                      margin: 0,
                    }}
                  >
                    {group.label}
                  </h2>
                  <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: "6px 0 0" }}>
                    {group.items.length} perk{group.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                    gap: "20px",
                  }}
                >
                  {group.items.map((item) => (
                    <HistoryBenefitCard
                      key={`${item.packageId}-${item.line.id}`}
                      line={item.line}
                      packageStatus={item.packageStatus}
                      packageId={item.packageId}
                      createdAt={item.createdAt}
                      voucherCode={item.voucherCode}
                      qrPayload={item.qrPayload}
                      imageUrl={item.imageUrl}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </EmployeePageShell>
    </main>
  );
}
