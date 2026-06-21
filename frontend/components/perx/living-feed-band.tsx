"use client";

import * as React from "react";
import { NG } from "@/lib/new-genre/tokens";
import type { FeedMeta } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/utils";

interface LivingFeedBandProps {
  feedMeta: FeedMeta | null;
}

export function LivingFeedBand({ feedMeta }: LivingFeedBandProps) {
  if (!feedMeta) return null;

  const isExpiring = feedMeta.mode === "expiring_soon";

  return (
    <div
      className={isExpiring ? "living-feed-band living-feed-band--expiring" : "living-feed-band"}
      role="status"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <p className="living-feed-band__title">
          {isExpiring ? "Expiring Soon" : "Living feed"}
        </p>
        <p className="living-feed-band__body">
          {isExpiring
            ? `${formatMoney(feedMeta.walletBalance, "ALL")} unused — reset in ${feedMeta.daysUntilReset ?? 0} days. Perks you can afford are ranked first.`
            : feedMeta.contextLabel ?? "Ranked for your time of day and recent picks."}
        </p>
      </div>
      {feedMeta.boostedCategories.length > 0 && (
        <div className="living-feed-band__chips">
          {feedMeta.boostedCategories.map((cat) => (
            <span key={cat} className="living-feed-band__chip">
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
