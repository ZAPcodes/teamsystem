"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PackageStub } from "@/components/perx/package-stub";
import { Button } from "@/components/ui/button";
import type { PackageDTO, VoucherDTO } from "@/lib/api/contracts";

interface VoucherModalProps {
  open: boolean;
  onClose: () => void;
  package: PackageDTO | null;
  vouchers: VoucherDTO[];
}

export function VoucherModal({ open, onClose, package: pkg, vouchers }: VoucherModalProps) {
  if (!open || !pkg) return null;

  const voucherByLine = new Map(vouchers.map((v) => [v.packageLineId, v]));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay style={{ position: "fixed", inset: 0, background: "rgba(1,1,16,0.35)", zIndex: 200 }} />
        <DialogPrimitive.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#ffffff",
            border: "1px solid rgba(1,1,16,0.12)",
            borderRadius: "8px",
            padding: "24px",
            zIndex: 201,
            maxWidth: "420px",
            width: "min(420px, 92vw)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "22px", margin: 0 }}>
            Your redemption codes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pkg.lines.map((line) => {
              const voucher = voucherByLine.get(line.id);
              return (
                <PackageStub
                  key={line.id}
                  variant="voucher"
                  title={line.title}
                  providerName={line.providerName}
                  price={line.price}
                  status={pkg.status === "settled" || pkg.status === "approved" ? "settled" : "pending"}
                  code={voucher?.code}
                  qrPayload={voucher?.qrPayload}
                />
              );
            })}
          </div>
          <Button variant="primary" onClick={onClose} style={{ width: "100%" }}>
            Done
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
