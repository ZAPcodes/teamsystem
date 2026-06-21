"use client";

import * as React from "react";
import Link from "next/link";
import { useMyPackages } from "@/lib/hooks/use-engagement";
import { useOffers } from "@/lib/hooks/use-offers";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import {
  CatalogMediaCard,
  CatalogMediaCardSkeleton,
  CatalogCardTitle,
  CatalogCardMeta,
} from "@/components/perx/catalog-media-card";
import type { PackageDTO } from "@/lib/api/contracts";

interface PurchasedBenefitsChipsProps {
  spentALL: number;
}

function activePackages(packages: PackageDTO[]): PackageDTO[] {
  return packages.filter((pkg) => pkg.status === "settled" || pkg.status === "approved");
}

export function PurchasedBenefitsChips({ spentALL }: PurchasedBenefitsChipsProps) {
  const { packages, loading } = useMyPackages();
  const { offers } = useOffers();

  const imageByOfferId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const offer of offers ?? []) {
      if (offer.imageUrl) map.set(offer.id, offer.imageUrl);
    }
    return map;
  }, [offers]);

  const lines = React.useMemo(() => {
    const result: Array<{
      key: string;
      title: string;
      providerName: string;
      price: number;
      offerId: string;
    }> = [];
    for (const pkg of activePackages(packages)) {
      for (const line of pkg.lines) {
        result.push({
          key: `${pkg.id}-${line.id}`,
          title: line.title,
          providerName: line.providerName,
          price: line.price,
          offerId: line.offerId,
        });
      }
    }
    return result;
  }, [packages]);

  if (loading) {
    return (
      <div className="ng-scroll-row" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="purchased-chip-card">
            <CatalogMediaCardSkeleton elevated />
          </div>
        ))}
      </div>
    );
  }

  if (lines.length === 0 && spentALL <= 0) return null;

  return (
    <section aria-label="Benefits already purchased">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div>
          <h2 className="ng-section-title" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>
            Already yours
          </h2>
          <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: "8px 0 0" }}>
            {lines.length} perk{lines.length === 1 ? "" : "s"} ready to use
            {spentALL > 0 ? ` · ${formatMoney(spentALL, "ALL")} deployed` : ""}
          </p>
        </div>
        <Link href="/marketplace/history" className="ng-pill-btn" style={{ width: "auto", padding: "8px 18px", textDecoration: "none" }}>
          View history
        </Link>
      </div>

      {lines.length > 0 && (
        <div className="ng-scroll-row">
          {lines.map((line) => (
            <Link key={line.key} href="/marketplace/history" className="purchased-chip-card" style={{ textDecoration: "none" }}>
              <CatalogMediaCard
                elevated
                imageUrl={imageByOfferId.get(line.offerId)}
                imageAlt={line.title}
                logoAlt={line.providerName}
              >
                <CatalogCardTitle>{line.title}</CatalogCardTitle>
                <CatalogCardMeta>
                  {line.providerName}
                  <span className="tabular-nums"> · {formatMoney(line.price, "ALL")}</span>
                </CatalogCardMeta>
              </CatalogMediaCard>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
