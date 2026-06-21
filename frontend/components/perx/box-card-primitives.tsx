"use client";

import * as React from "react";
import { NG } from "@/lib/new-genre/tokens";

const AVATAR_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop",
];

export function teamAvatarsFromSeed(seed: string) {
  const hash = seed.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  const extra = 2 + (hash % 6);
  return {
    extra,
    photos: [0, 1, 2].map((i) => AVATAR_PHOTOS[(hash + i) % AVATAR_PHOTOS.length]),
  };
}

export function ActiveEmployeesRow({ seed, className }: { seed: string; className?: string }) {
  const team = React.useMemo(() => teamAvatarsFromSeed(seed), [seed]);

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {team.photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${NG.parchment}`,
              marginLeft: i === 0 ? 0 : "-10px",
              display: "block",
            }}
          />
        ))}
        <span
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            backgroundColor: NG.parchment,
            border: `1px solid ${NG.pureBlack}`,
            marginLeft: "-10px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: NG.fontBody,
            fontSize: "10px",
            fontWeight: 500,
            color: NG.onyx,
          }}
        >
          +{team.extra}
        </span>
      </div>
      <span
        style={{
          fontFamily: NG.fontBody,
          fontSize: "12px",
          fontWeight: 400,
          letterSpacing: "-0.12px",
          color: NG.slateVeil,
        }}
      >
        Active Employees
      </span>
    </div>
  );
}

export function BoxCardHeartButton({
  saved,
  onToggle,
}: {
  saved: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save"}
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        padding: "2px",
        cursor: "pointer",
        color: NG.pureBlack,
        lineHeight: 0,
        flexShrink: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

export function BoxCardLogo({ src, alt }: { src?: string | null; alt: string }) {
  const hasImage = Boolean(src?.trim());

  return (
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        overflow: "hidden",
        border: `1px solid ${NG.pureBlack}`,
        flexShrink: 0,
        backgroundColor: NG.parchment,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: NG.fontBody,
        fontSize: "11px",
        fontWeight: 700,
        color: NG.onyx,
      }}
    >
      {hasImage ? (
        <img src={src!} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span aria-hidden="true">{alt.trim().charAt(0).toUpperCase() || "•"}</span>
      )}
    </div>
  );
}

interface BoxCardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function BoxCardButton({ children, disabled, ...props }: BoxCardButtonProps) {
  return (
    <button type="button" className="ng-box-btn" disabled={disabled} {...props}>
      {children}
    </button>
  );
}
