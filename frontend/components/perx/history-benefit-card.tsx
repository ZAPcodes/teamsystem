"use client";

import * as React from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import { VoucherDetailModal } from "@/components/perx/voucher-detail-modal";
import {
  CatalogMediaCard,
  CatalogMediaCardSkeleton,
  CatalogCardTitle,
  CatalogCardMeta,
} from "@/components/perx/catalog-media-card";
import type { PackageDTO, PackageStatus } from "@/lib/api/contracts";

function statusLabel(status: PackageStatus): string {
  if (status === "settled") return "Ready to use";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Awaiting approval";
  if (status === "rejected") return "Declined";
  return status;
}

function statusTone(status: PackageStatus): { bg: string; color: string } {
  if (status === "settled" || status === "approved") {
    return { bg: "rgba(99,91,255,0.1)", color: "#635bff" };
  }
  if (status === "pending") {
    return { bg: "rgba(1,1,16,0.06)", color: NG.slateVeil };
  }
  return { bg: "rgba(230,50,10,0.08)", color: "#c42a0a" };
}

interface HistoryBenefitCardProps {
  line: PackageDTO["lines"][number];
  packageStatus: PackageStatus;
  packageId: string;
  createdAt: string;
  voucherCode?: string;
  qrPayload?: string;
  imageUrl?: string;
}

export function HistoryBenefitCard({
  line,
  packageStatus,
  voucherCode,
  qrPayload,
  imageUrl,
}: HistoryBenefitCardProps) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const tone = statusTone(packageStatus);
  const hasVoucher =
    Boolean(voucherCode) && (packageStatus === "settled" || packageStatus === "approved");

  return (
    <>
      <CatalogMediaCard
        elevated
        imageUrl={imageUrl}
        imageAlt={line.title}
        logoAlt={line.providerName}
        badge={
          <span style={{ backgroundColor: tone.bg, color: tone.color }} className="catalog-media-card__status-pill">
            {statusLabel(packageStatus)}
          </span>
        }
      >
        <CatalogCardTitle>{line.title}</CatalogCardTitle>
        <CatalogCardMeta>
          {line.providerName}
          <span className="tabular-nums"> · {formatMoney(line.price, line.currency ?? "ALL")}</span>
        </CatalogCardMeta>

        {hasVoucher && (
          <div className="history-benefit-card__code">
            <p className="history-benefit-card__code-label">Redemption code</p>
            <p className="history-benefit-card__code-value tabular-nums">{voucherCode}</p>
          </div>
        )}

        <button
          type="button"
          className="ng-box-btn"
          style={{ marginTop: "auto" }}
          disabled={!hasVoucher}
          onClick={() => setModalOpen(true)}
        >
          {hasVoucher ? "View voucher details" : "Code pending approval"}
        </button>
      </CatalogMediaCard>

      <VoucherDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={line.title}
        providerName={line.providerName}
        price={line.price}
        currency={line.currency}
        packageStatus={packageStatus}
        code={voucherCode}
        qrPayload={qrPayload}
      />
    </>
  );
}

export function HistoryBenefitCardSkeleton() {
  return <CatalogMediaCardSkeleton elevated />;
}
