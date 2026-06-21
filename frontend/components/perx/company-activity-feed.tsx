"use client";

import * as React from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import type { ActivityFeedItemDTO } from "@/lib/api/contracts";
import { toast } from "sonner";

export function CompanyActivityFeed() {
  const [items, setItems] = React.useState<ActivityFeedItemDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await apiGet<{ items: ActivityFeedItemDTO[] }>("/me/activity/feed");
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const highFive = async (id: string) => {
    setBusyId(id);
    try {
      const res = await apiPost<{ highFiveCount: number; xpAwarded: number }>(
        `/me/activity/${id}/high-five`,
        {}
      );
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, highFiveCount: res.highFiveCount, highFivedByMe: true }
            : item
        )
      );
      toast.success(`High-Five sent · +${res.xpAwarded} XP for them`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "120px",
          borderRadius: "16px",
          background: "rgba(1,1,16,0.04)",
        }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="ng-card-muted"
        style={{ padding: "20px 24px", textAlign: "center" }}
      >
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#6d7074", margin: 0 }}>
          When teammates share packages, you can send High-Fives here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {items.map((item) => (
        <article
          key={item.id}
          className="ng-box-card"
          style={{ padding: "16px 20px" }}
        >
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#0c1018", margin: "0 0 12px", lineHeight: 1.45 }}>
            {item.message}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#6d7074" }}>
              {item.highFiveCount > 0 ? `${item.highFiveCount} High-Fives` : "Be the first to High-Five"}
            </span>
            <button
              type="button"
              className="ng-box-btn"
              disabled={item.highFivedByMe || busyId === item.id}
              onClick={() => void highFive(item.id)}
              style={{ width: "auto", padding: "8px 16px", fontSize: "13px" }}
            >
              {item.highFivedByMe ? "Sent ✋" : "High-Five ✋"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
