"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PackageStub } from "@/components/perx/package-stub";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import type { PackageDTO, PackageStatus } from "@/lib/api/contracts";

interface VoucherDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  providerName: string;
  price: number;
  currency?: string;
  packageStatus: PackageStatus;
  code?: string;
  qrPayload?: string;
}

export function VoucherDetailModal({
  open,
  onClose,
  title,
  providerName,
  price,
  currency = "ALL",
  packageStatus,
  code,
  qrPayload,
}: VoucherDetailModalProps) {
  const stubStatus =
    packageStatus === "settled" || packageStatus === "approved" ? "settled" : "pending";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{ position: "fixed", inset: 0, background: "rgba(12,16,24,0.45)", zIndex: 200 }}
        />
        <DialogPrimitive.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: NG.parchment,
            border: `1px solid ${NG.pureBlack}`,
            borderRadius: "16px",
            padding: "24px",
            zIndex: 201,
            maxWidth: "440px",
            width: "min(440px, 92vw)",
            boxShadow: "6px 6px 0 0 #000",
          }}
        >
          <h2
            style={{
              fontFamily: NG.fontDisplay,
              fontSize: "24px",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: NG.onyx,
              margin: "0 0 4px",
            }}
          >
            Voucher details
          </h2>
          <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: "0 0 20px" }}>
            {providerName} · {formatMoney(price, currency)}
          </p>

          <PackageStub
            variant="voucher"
            title={title}
            providerName={providerName}
            price={price}
            status={stubStatus}
            code={code}
            qrPayload={qrPayload}
          />

          <Button variant="primary" onClick={onClose} style={{ width: "100%", marginTop: "20px" }}>
            Done
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export type HistoryLineItem = {
  line: PackageDTO["lines"][number];
  packageStatus: PackageStatus;
  packageId: string;
  createdAt: string;
  voucherCode?: string;
  qrPayload?: string;
  imageUrl?: string;
};

export function groupHistoryByDate(packages: PackageDTO[]): Array<{
  dateKey: string;
  label: string;
  items: HistoryLineItem[];
}> {
  const sorted = [...packages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groups = new Map<string, HistoryLineItem[]>();

  for (const pkg of sorted) {
    const dateKey = new Date(pkg.createdAt).toISOString().slice(0, 10);

    const items = groups.get(dateKey) ?? [];
    for (const line of pkg.lines) {
      const voucher = pkg.vouchers?.find((v) => v.packageLineId === line.id);
      items.push({
        line,
        packageStatus: pkg.status,
        packageId: pkg.id,
        createdAt: pkg.createdAt,
        voucherCode: voucher?.code,
        qrPayload: voucher?.qrPayload,
        imageUrl: undefined,
      });
    }
    groups.set(dateKey, items);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    items,
  }));
}
