"use client";

import * as React from "react";
import { NG } from "@/lib/new-genre/tokens";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function SectionHeader({ title, actionLabel = "View all", onAction, actionHref }: SectionHeaderProps) {
  const actionStyle: React.CSSProperties = {
    fontFamily: NG.fontBody,
    fontSize: "14px",
    fontWeight: 400,
    color: NG.slateVeil,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textDecoration: "none",
    letterSpacing: "-0.14px",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "24px",
      }}
    >
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
        {title}
      </h2>
      {onAction ? (
        <button type="button" onClick={onAction} style={actionStyle}>
          {actionLabel}
        </button>
      ) : actionHref ? (
        <a href={actionHref} style={actionStyle}>
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
