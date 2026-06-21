"use client";

import * as React from "react";
import type { DropDTO } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/utils";

function formatCountdown(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d left`;
  return `${hours}h ${mins}m`;
}

export function DropBand({ drops }: { drops: DropDTO[] }) {
  const [tick, setTick] = React.useState(0);
  const active = drops[0];

  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (!active) return null;
  void tick;

  return (
    <div
      style={{
        backgroundColor: "#635bff",
        color: "#ffffff",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "var(--font-inter), sans-serif",
        fontSize: "13px",
        letterSpacing: "-0.26px",
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "11px" }}>
        The Drop · {active.badgeLabel}
      </span>
      <span>{active.offer.title}</span>
      <span style={{ opacity: 0.9 }}>{formatMoney(active.offer.price, "ALL")}</span>
      <span style={{ fontWeight: 500 }}>{formatCountdown(active.endsAt)}</span>
    </div>
  );
}
