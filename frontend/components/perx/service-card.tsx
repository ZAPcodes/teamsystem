"use client";

import * as React from "react";
import { formatMoney } from "@/lib/utils";
import { usePackageStore, selectHasOffer } from "@/lib/store/package";
import type { Offer, PosBundleResponse, ClaimComplianceResponse } from "@/lib/api/contracts";
import { apiPost } from "@/lib/api/client";
import { BoxCardButton, BoxCardHeartButton } from "@/components/perx/box-card-primitives";
import {
  CatalogMediaCard,
  CatalogMediaCardSkeleton,
  CatalogCardTitle,
  CatalogCardMeta,
  CatalogCardSpacer,
} from "@/components/perx/catalog-media-card";
import { PosBundlerModal } from "@/components/perx/pos-bundler-modal";
import { StartPooledCartSheet, isPoolEligibleOffer } from "@/components/perx/start-pooled-cart-sheet";
import { CompliancePendingModal } from "@/components/perx/compliance-pending-modal";

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

interface ServiceCardProps {
  offer: Offer;
}

export function ServiceCard({ offer }: ServiceCardProps) {
  const addLine = usePackageStore((s) => s.addLine);
  const alreadyAdded = usePackageStore(selectHasOffer(offer.id));
  const [flashAdded, setFlashAdded] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [bundlerOpen, setBundlerOpen] = React.useState(false);
  const [bundleResult, setBundleResult] = React.useState<PosBundleResponse | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [poolOpen, setPoolOpen] = React.useState(false);
  const [complianceOpen, setComplianceOpen] = React.useState(false);
  const [complianceResult, setComplianceResult] = React.useState<ClaimComplianceResponse | null>(null);
  const poolEligible = isPoolEligibleOffer(offer);

  const flashComplete = React.useCallback(() => {
    setFlashAdded(true);
    window.setTimeout(() => setFlashAdded(false), 1200);
  }, []);

  const completeAdd = React.useCallback(() => {
    addLine(offer);
    flashComplete();
    setBundlerOpen(false);
    setBundleResult(null);
  }, [addLine, flashComplete, offer]);

  const completeAddWithSelection = React.useCallback(
    (complements: Offer[]) => {
      addLine(offer);
      for (const complement of complements) {
        addLine(complement);
      }
      flashComplete();
      setBundlerOpen(false);
      setBundleResult(null);
    },
    [addLine, flashComplete, offer]
  );

  const runBundler = React.useCallback(async () => {
    if (alreadyAdded) return;
    setChecking(true);
    try {
      const compliance = await apiPost<ClaimComplianceResponse>("/offers/claim-compliance", {
        offerId: offer.id,
      });
      if (compliance.blocked) {
        setComplianceResult(compliance);
        setComplianceOpen(true);
        return;
      }

      const result = await apiPost<PosBundleResponse>("/offers/claim-bundle", {
        offerId: offer.id,
      });
      if (result.showBundler && result.complements.length > 0) {
        setBundleResult(result);
        setBundlerOpen(true);
        return;
      }
      completeAdd();
    } catch (e) {
      console.error(e);
      completeAdd();
    } finally {
      setChecking(false);
    }
  }, [alreadyAdded, completeAdd, offer.id]);

  const ctaLabel = alreadyAdded
    ? "In package"
    : flashAdded
      ? "Added"
      : checking
        ? "Checking…"
        : "Claim";

  return (
    <>
      <CatalogMediaCard
        imageUrl={offer.imageUrl}
        imageAlt={offer.title}
        logoAlt={offer.provider.name}
        heroAction={<BoxCardHeartButton saved={saved} onToggle={() => setSaved((s) => !s)} />}
      >
        <CatalogCardTitle>{offer.title}</CatalogCardTitle>
        <CatalogCardMeta>
          {offer.provider.name} · {offer.provider.location || categoryLabel(offer.category)}
          <span className="tabular-nums"> · {formatMoney(offer.priceALL, "ALL")}</span>
        </CatalogCardMeta>
        <CatalogCardSpacer />
        {poolEligible && (
          <button
            type="button"
            className="service-card-pool-link"
            onClick={() => setPoolOpen(true)}
          >
            Team pool · split with colleagues
          </button>
        )}
        <BoxCardButton disabled={alreadyAdded || checking} onClick={() => void runBundler()}>
          {ctaLabel}
        </BoxCardButton>
      </CatalogMediaCard>

      <PosBundlerModal
        open={bundlerOpen}
        result={bundleResult}
        baseOffer={offer}
        onClose={() => {
          setBundlerOpen(false);
          setBundleResult(null);
        }}
        onConfirm={completeAddWithSelection}
      />
      <StartPooledCartSheet open={poolOpen} offer={offer} onClose={() => setPoolOpen(false)} />
      <CompliancePendingModal
        open={complianceOpen}
        result={complianceResult}
        offerTitle={offer.title}
        onClose={() => {
          setComplianceOpen(false);
          setComplianceResult(null);
        }}
      />
    </>
  );
}

export function ServiceCardSkeleton() {
  return <CatalogMediaCardSkeleton />;
}
