"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { X } from "@/components/icons";
import { formatMoney } from "@/lib/utils";
import type { PackageLine } from "@/lib/store/package";

// ---- Types -------------------------------------------------------

export type StubVariant = "voucher" | "package";
export type StubStatus = "draft" | "pending" | "approved" | "settled" | "rejected";

interface StubVoucherProps {
  variant: "voucher";
  title: string;
  providerName: string;
  price: number;
  qrPayload?: string;
  code?: string;
  status?: StubStatus;
}

interface StubPackageProps {
  variant: "package";
  lines: PackageLine[];
  displayTotal: number;
  qrPayload?: string;
  code?: string;
  status?: StubStatus;
  /** Draft builder only — enables per-line remove on the stub. */
  onRemoveLine?: (lineId: string) => void;
}

type PackageStubProps = StubVoucherProps | StubPackageProps;

// ---- Paper texture — scoped only to Stub ------------------------
// SVG dot pattern at ~6% opacity. MUST NOT appear anywhere else in the app.
const PAPER_TEXTURE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='0.8' fill='%23010110' fill-opacity='0.06'/%3E%3C/svg%3E")`;

// ---- Perforation circles -----------------------------------------
function Perforation() {
  const count = 20;
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "12px",
        flexShrink: 0,
        padding: "12px 0",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: "#d9d9d9",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ---- Seal dot ----------------------------------------------------
function SealDot({ status }: { status: StubStatus }) {
  if (status === "draft") return null;
  const filled = status === "approved" || status === "settled";
  return (
    <div
      aria-label={status === "pending" ? "Pending approval" : "Approved"}
      style={{
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: filled ? "#635bff" : "transparent",
        border: filled ? "none" : "1.5px solid #635bff",
        flexShrink: 0,
      }}
    />
  );
}

// ---- Package line rows ------------------------------------------
function PackageLineRow({
  line,
  onRemove,
}: {
  line: PackageLine;
  onRemove?: (lineId: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 700,
            fontSize: "10px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#73737c",
          }}
        >
          {line.providerName}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "12px",
            color: "#73737c",
            marginLeft: "6px",
          }}
        >
          {line.offerTitle}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <span
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 500,
            fontSize: "12px",
            color: "#010110",
          }}
        >
          {formatMoney(line.price, "ALL")}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(line.id);
            }}
            aria-label={`Remove ${line.offerTitle}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: "100px",
              border: "1px solid rgba(1,1,16,0.15)",
              backgroundColor: "transparent",
              color: "#73737c",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Main component ---------------------------------------------
export function PackageStub(props: PackageStubProps) {
  const status: StubStatus = props.status ?? "draft";
  const qrPayload = props.qrPayload;
  const code = props.code;
  const canShowQr = (status === "approved" || status === "settled") && Boolean(qrPayload && code);

  const isVoucher = props.variant === "voucher";
  const packageProps = !isVoucher ? (props as StubPackageProps) : null;
  const canRemoveLines =
    packageProps?.status === "draft" && Boolean(packageProps.onRemoveLine);

  let label: string;
  let title: string;
  let subtitle: string;
  let price: number;

  if (isVoucher) {
    label = "BENEFIT";
    title = (props as StubVoucherProps).title;
    subtitle = (props as StubVoucherProps).providerName;
    price = (props as StubVoucherProps).price;
  } else {
    const p = props as StubPackageProps;
    label = "PACKAGE";
    const count = p.lines.length;
    title = count === 1 ? p.lines[0].offerTitle : `${count} benefits`;
    const providers = [...new Set(p.lines.map((l) => l.providerName))];
    subtitle = providers.slice(0, 3).join("  ·  ");
    price = p.displayTotal;
  }

  return (
    <div
      role="region"
      aria-label={`${label} stub — ${status}`}
      style={{
        display: "flex",
        borderRadius: "8px",
        border: "1px solid rgba(1,1,16,0.12)",
        backgroundColor: "#ffffff",
        backgroundImage: PAPER_TEXTURE,
        overflow: "hidden",
        position: "relative",
        minWidth: "320px",
      }}
    >
      {/* ---- LEFT HALF (benefit info ~70%) ---- */}
      <div
        style={{
          flex: "7 0 0",
          padding: "20px 16px 20px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          minWidth: 0,
        }}
      >
        {/* Label row */}
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 700,
            fontSize: "10px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#73737c",
            margin: 0,
          }}
        >
          {label}
        </p>

        {/* Title */}
        <h3
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontVariationSettings: "'wght' 450, 'opsz' 22",
            fontSize: "20px",
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
            color: "#010110",
            margin: 0,
          }}
        >
          {title}
        </h3>

        {/* Subtitle / providers */}
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: 1.4,
            color: "#73737c",
            margin: 0,
          }}
        >
          {subtitle}
        </p>

        {/* Package lines (multi-line variant only, or editable draft) */}
        {!isVoucher && packageProps && (packageProps.lines.length > 1 || canRemoveLines) && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              paddingTop: "8px",
              borderTop: "1px solid rgba(1,1,16,0.08)",
            }}
          >
            {packageProps.lines.map((line) => (
              <PackageLineRow
                key={line.id}
                line={line}
                onRemove={canRemoveLines ? packageProps.onRemoveLine : undefined}
              />
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: "12px" }} />

        {/* Price total */}
        <p
          className="tabular-nums"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 500,
            fontSize: "16px",
            letterSpacing: "-0.32px",
            color: "#010110",
            margin: 0,
          }}
        >
          {formatMoney(price, "ALL")}
        </p>
      </div>

      {/* ---- PERFORATION ---- */}
      <Perforation />

      {/* ---- RIGHT HALF (stub ~30%) ---- */}
      <div
        style={{
          flex: "3 0 0",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          position: "relative",
          minWidth: 0,
        }}
      >
        {/* Seal dot — top right */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
          }}
        >
          <SealDot status={status} />
        </div>

        {/* QR code: backend-issued only after approval */}
        {canShowQr ? (
          <div
            style={{
              marginTop: "16px",
              padding: "6px",
              border: "1px solid rgba(1,1,16,0.08)",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
            }}
          >
            <QRCodeSVG
              value={qrPayload ?? ""}
              size={72}
              level="M"
              bgColor="#ffffff"
              fgColor="#010110"
            />
          </div>
        ) : (
          <div
            style={{
              marginTop: "16px",
              width: "86px",
              height: "86px",
              border: "1px dashed rgba(1,1,16,0.18)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "10px",
              lineHeight: 1.2,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#73737c",
              backgroundColor: "#ffffff",
              padding: "8px",
            }}
          >
            {status === "pending" ? "Pending" : "No code"}
          </div>
        )}

        {/* Alphanumeric code */}
        <p
          style={{
            fontFamily: "'JetBrains Mono', 'Courier New', monospace",
            fontWeight: 400,
            fontSize: "10px",
            letterSpacing: "0.06em",
            color: "#73737c",
            margin: 0,
            textAlign: "center",
            wordBreak: "break-all",
          }}
        >
          {code ?? (status === "pending" ? "AWAITING APPROVAL" : "NOT ISSUED")}
        </p>
      </div>
    </div>
  );
}
