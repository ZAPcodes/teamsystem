"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "@/lib/motion";
import { apiGet } from "@/lib/api/client";
import type { GamificationDTO } from "@/lib/api/contracts";

export function useGamification() {
  const [data, setData] = React.useState<GamificationDTO | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiGet<GamificationDTO>("/me/progress");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

interface XpProgressPillProps {
  compact?: boolean;
}

export function XpProgressPill({ compact }: XpProgressPillProps) {
  const { data, loading } = useGamification();

  if (loading || !data) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: compact ? "88px" : "120px",
          height: "32px",
          borderRadius: "100px",
          backgroundColor: "rgba(1,1,16,0.05)",
        }}
      />
    );
  }

  const { progress } = data;
  const bandStart = progress.nextLevelXp - progress.xpToNextLevel;
  const pct =
    progress.nextLevelXp > bandStart
      ? Math.min(100, Math.round(((progress.xp - bandStart) / (progress.nextLevelXp - bandStart)) * 100))
      : 100;

  return (
    <Link
      href="/progress"
      title={`${progress.levelTitle} · ${progress.xp} XP · ${progress.streakCount}-day streak`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 12px 5px 8px",
        borderRadius: "100px",
        border: "1px solid rgba(99,91,255,0.22)",
        backgroundColor: "rgba(99,91,255,0.06)",
        textDecoration: "none",
        transition: "border-color 120ms ease, background-color 120ms ease",
      }}
    >
      <span
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          backgroundColor: "#635bff",
          color: "#ffffff",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "11px",
          fontWeight: 700,
        }}
      >
        {progress.level}
      </span>
      {!compact && (
        <span style={{ minWidth: "72px" }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#010110",
              lineHeight: 1.2,
            }}
          >
            {progress.streakCount > 0 ? `${progress.streakCount}🔥` : "Perx XP"}
          </span>
          <span
            style={{
              display: "block",
              marginTop: "3px",
              height: "3px",
              borderRadius: "100px",
              backgroundColor: "rgba(1,1,16,0.08)",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                display: "block",
                height: "100%",
                width: `${pct}%`,
                backgroundColor: "#635bff",
                borderRadius: "100px",
              }}
            />
          </span>
        </span>
      )}
    </Link>
  );
}
