"use client";

import * as React from "react";
import type { OfferDTO } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/utils";

interface ProviderOfferCardProps {
  offer: OfferDTO;
  onEdit: (offer: OfferDTO) => void;
  onDelete: (offer: OfferDTO) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  wellness: "#e8f5e9",
  food: "#fff3e0",
  travel: "#e3f2fd",
  learning: "#f3e5f5",
  lifestyle: "#fce4ec",
};

export function ProviderOfferCard({ offer, onEdit, onDelete }: ProviderOfferCardProps) {
  const [hovered, setHovered] = React.useState(false);

  const bgColor = CATEGORY_COLORS[offer.category] ?? "#f5f5f5";

  return (
    <div
      style={{
        border: "1px solid rgba(1,1,16,0.12)",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
        transition: "border-color 120ms ease",
        borderColor: hovered ? "rgba(1,1,16,0.30)" : "rgba(1,1,16,0.12)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image / color block */}
      <div
        style={{
          height: "140px",
          backgroundColor: bgColor,
          backgroundImage: offer.imageUrl ? `url(${offer.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Status badge */}
        <div style={{ position: "absolute", top: "12px", left: "12px" }}>
          <span style={{
            display: "inline-flex",
            padding: "3px 8px",
            borderRadius: "100px",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            backgroundColor: offer.isActive ? "#010110" : "rgba(1,1,16,0.40)",
            color: "#ffffff",
          }}>
            {offer.isActive ? "Live" : "Paused"}
          </span>
        </div>

        {/* Action overlay on hover */}
        {hovered && (
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(255,255,255,0.90)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}>
            <button
              onClick={() => onEdit(offer)}
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                padding: "7px 16px",
                borderRadius: "100px",
                border: "1px solid rgba(1,1,16,0.25)",
                backgroundColor: "#ffffff",
                color: "#010110",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(offer)}
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                padding: "7px 16px",
                borderRadius: "100px",
                border: "1px solid rgba(1,1,16,0.25)",
                backgroundColor: "#ffffff",
                color: "#010110",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", fontWeight: 500, color: "#010110", margin: 0, letterSpacing: "-0.3px", lineHeight: 1.3 }}>
            {offer.title}
          </p>
          <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", fontWeight: 500, color: "#010110", letterSpacing: "-0.3px", whiteSpace: "nowrap", flexShrink: 0 }}>
            {formatMoney(offer.price, "ALL")}
          </span>
        </div>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#73737c", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {offer.description}
        </p>
        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
          <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", padding: "2px 8px", borderRadius: "100px", border: "1px solid rgba(1,1,16,0.18)", color: "#73737c", textTransform: "capitalize" }}>
            {offer.category}
          </span>
          <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", padding: "2px 8px", borderRadius: "100px", border: "1px solid rgba(1,1,16,0.18)", color: "#73737c" }}>
            {offer.currency}
          </span>
          {offer.isLimited && (
            <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", padding: "2px 8px", borderRadius: "100px", border: "1px solid rgba(1,1,16,0.18)", color: "#73737c" }}>
              Limited
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
