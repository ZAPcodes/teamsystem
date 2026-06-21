"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { PackageStub } from "@/components/perx/package-stub";
import { BudgetMeter } from "@/components/perx/budget-meter";
import { VoucherModal } from "@/components/perx/voucher-modal";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "@/components/icons";
import { usePackageStore, selectDisplayTotal } from "@/lib/store/package";
import { useAllowance } from "@/lib/hooks/use-allowance";
import { quarterLabel, type AllowanceDTO } from "@/lib/api/contracts";
import type { EmployeeBudget } from "@/lib/fixtures/employee";
import { formatMoney } from "@/lib/utils";
import { createAndSubmitPackage } from "@/lib/hooks/use-packages";
import type { PackageDTO, VoucherDTO } from "@/lib/api/contracts";

function allowanceToBudget(a: AllowanceDTO): EmployeeBudget {
  return {
    quarterlyBudgetALL: a.total,
    spentALL: a.used,
    heldALL: a.held,
    quarterLabel: quarterLabel(a.periodResetAt),
  };
}

/** Preview: show live allowance; draft is passed separately so totals are not double-counted. */
function buildPreviewBudget(allowance: AllowanceDTO): EmployeeBudget {
  return allowanceToBudget(allowance);
}

// ---- Sheet (built on Radix Dialog) -------------------------------
// Styled as a right-side panel. No default shadcn shadows.

function SheetOverlay({ onClose }: { onClose: () => void }) {
  return (
    <DialogPrimitive.Overlay
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(1,1,16,0.25)",
        zIndex: 100,
        backdropFilter: "none",
      }}
    />
  );
}

// ---- Line row ----------------------------------------------------
function LineRow({ lineId, imageUrl, providerName, title, price, currency, onRemove }: {
  lineId: string;
  imageUrl: string;
  providerName: string;
  title: string;
  price: number;
  currency: string;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 0",
      }}
    >
      {/* Thumbnail */}
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "8px",
          objectFit: "cover",
          flexShrink: 0,
          border: "1px solid rgba(1,1,16,0.08)",
        }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontWeight: 700,
          fontSize: "11px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#73737c",
          margin: "0 0 2px",
        }}>
          {providerName}
        </p>
        <p style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontVariationSettings: "'wght' 450, 'opsz' 18",
          fontSize: "16px",
          lineHeight: 1.2,
          letterSpacing: "-0.32px",
          color: "#010110",
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {title}
        </p>
      </div>

      {/* Price + remove */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 500,
            fontSize: "14px",
            color: "#010110",
          }}
        >
          {formatMoney(price, currency)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(lineId);
          }}
          aria-label={`Remove ${title}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "100px",
            border: "1px solid rgba(1,1,16,0.15)",
            backgroundColor: "transparent",
            color: "#73737c",
            cursor: "pointer",
            transition: "border-color 120ms, color 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#010110";
            e.currentTarget.style.color = "#010110";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(1,1,16,0.15)";
            e.currentTarget.style.color = "#73737c";
          }}
        >
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// ---- Main component ----------------------------------------------
interface PackageBuilderSheetProps {
  open: boolean;
  onClose: () => void;
}

export function PackageBuilderSheet({ open, onClose }: PackageBuilderSheetProps) {
  const lines = usePackageStore((s) => s.lines);
  const removeLine = usePackageStore((s) => s.removeLine);
  const clear = usePackageStore((s) => s.clear);
  const getSubmitPayload = usePackageStore((s) => s.getSubmitPayload);
  const displayTotal = usePackageStore(selectDisplayTotal);
  const source = usePackageStore((s) => s.source);
  const aiReason = usePackageStore((s) => s.aiReason);
  const { allowance } = useAllowance();
  const currency = allowance?.currency ?? "ALL";
  const [submitting, setSubmitting] = React.useState(false);
  const [voucherOpen, setVoucherOpen] = React.useState(false);
  const [submittedPkg, setSubmittedPkg] = React.useState<PackageDTO | null>(null);
  const [submittedVouchers, setSubmittedVouchers] = React.useState<VoucherDTO[]>([]);
  const [shareToFeed, setShareToFeed] = React.useState(false);

  const previewBudget = allowance ? buildPreviewBudget(allowance) : null;
  const available = allowance ? allowance.available : 0;
  const overBudgetBy = displayTotal - available;
  const isOverBudget = allowance ? overBudgetBy > 0 : false;
  const canSubmit = lines.length > 0 && !isOverBudget && allowance;

  const handleSubmit = React.useCallback(async () => {
    const payload = getSubmitPayload();
    setSubmitting(true);
    try {
      const result = await createAndSubmitPackage(payload.offerIds, { shareToFeed });
      clear();
      onClose();
      if (result.vouchers.length > 0) {
        setSubmittedPkg(result.package);
        setSubmittedVouchers(result.vouchers);
        setVoucherOpen(true);
      } else {
        toast("Package submitted — vouchers will appear when ready");
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [getSubmitPayload, clear, onClose, shareToFeed]);

  if (!open) return (
    <VoucherModal
      open={voucherOpen}
      onClose={() => setVoucherOpen(false)}
      package={submittedPkg}
      vouchers={submittedVouchers}
    />
  );

  return (
    <>
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogPrimitive.Portal>
        <SheetOverlay onClose={onClose} />

        {/* Sheet panel */}
        <DialogPrimitive.Content
          aria-label="Package builder"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(460px, 100vw)",
            zIndex: 101,
            backgroundColor: "#ffffff",
            borderLeft: "1px solid rgba(1,1,16,0.12)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            outline: "none",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 24px 16px",
              borderBottom: "1px solid rgba(1,1,16,0.08)",
              flexShrink: 0,
            }}
          >
            <span style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: source === "ai" ? "#635bff" : "#73737c",
            }}>
              {source === "ai" ? "Composed by Bora" : "Your package"}
              {lines.length > 0 && (
                <span style={{ color: "#73737c", fontWeight: 400, marginLeft: "8px" }}>
                  · {formatMoney(displayTotal, currency)}
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => clear()}
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "12px",
                    color: "#73737c",
                    background: "none",
                    border: "1px solid rgba(1,1,16,0.15)",
                    borderRadius: "100px",
                    padding: "5px 10px",
                    cursor: "pointer",
                  }}
                >
                  Clear all
                </button>
              )}
            <DialogPrimitive.Close asChild>
              <button
                aria-label="Close package builder"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "100px",
                  border: "1px solid rgba(1,1,16,0.15)",
                  backgroundColor: "transparent",
                  color: "#73737c",
                  cursor: "pointer",
                }}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </DialogPrimitive.Close>
            </div>
          </div>
          {source === "ai" && aiReason && (
            <p style={{
              padding: "0 24px 12px",
              margin: 0,
              fontFamily: "var(--font-inter)",
              fontSize: "13px",
              color: "#73737c",
              borderBottom: "1px solid rgba(1,1,16,0.08)",
            }}>
              {aiReason}
            </p>
          )}

          {/* Stub header — compact PackageStub showing draft */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(1,1,16,0.08)", flexShrink: 0 }}>
            {lines.length > 0 ? (
              <PackageStub
                variant="package"
                lines={lines}
                displayTotal={displayTotal}
                status="draft"
              />
            ) : (
              <div style={{
                padding: "24px 0",
                textAlign: "center",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "14px",
                color: "#73737c",
              }}>
                Add offers from the marketplace to build your package.
              </div>
            )}
          </div>

          {/* Line list */}
          {lines.length > 0 && (
            <div
              style={{
                flex: 1,
                padding: "0 24px",
                overflowY: "auto",
              }}
            >
              {lines.map((line, i) => (
                <React.Fragment key={line.id}>
                  {i > 0 && (
                    <div style={{ height: "1px", backgroundColor: "rgba(1,1,16,0.08)" }} />
                  )}
                  <LineRow
                    lineId={line.id}
                    imageUrl={line.imageUrl}
                    providerName={line.providerName}
                    title={line.offerTitle}
                    price={line.price}
                    currency={currency}
                    onRemove={removeLine}
                  />
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              flexShrink: 0,
              padding: "16px 24px 28px",
              borderTop: "1px solid rgba(1,1,16,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Budget preview meter */}
            {previewBudget && <BudgetMeter budget={previewBudget} draftTotal={displayTotal} currency={currency} />}

            {/* Over-budget warning — Fog text, no red */}
            {isOverBudget && (
              <p style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "#73737c",
                margin: 0,
              }}>
                {`That is ${formatMoney(overBudgetBy, currency)} over your remaining budget. Remove an item or swap for something cheaper.`}
              </p>
            )}

            {/* Share opt-in */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "13px",
                color: "#73737c",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(e) => setShareToFeed(e.target.checked)}
                style={{ width: "16px", height: "16px" }}
              />
              Share with my team (they can High-Five me)
            </label>

            {/* Primary action */}
            <Button
              variant="primary"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              style={{ width: "100%" }}
            >
              {submitting ? "Claiming..." : "Claim package"}
            </Button>

            {/* Ghost: Save as draft — store persists automatically */}
            <Button
              variant="ghost"
              style={{ width: "100%" }}
              disabled={lines.length === 0}
              onClick={() => {
                onClose();
                toast("Draft saved — pick up where you left off anytime");
              }}
            >
              Save as draft
            </Button>

            {/* Editorial copy */}
            <p style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              lineHeight: 1.5,
              letterSpacing: "-0.26px",
              color: "#73737c",
              margin: 0,
              textAlign: "center",
            }}>
              Money goes straight from your company to the providers. You won&apos;t see a charge.
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
    <VoucherModal
      open={voucherOpen}
      onClose={() => setVoucherOpen(false)}
      package={submittedPkg}
      vouchers={submittedVouchers}
    />
    </>
  );
}
