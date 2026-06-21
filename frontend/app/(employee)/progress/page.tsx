"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "@/lib/motion";
import { useGamification } from "@/components/perx/xp-progress-pill";
import { TeamQuestBand } from "@/components/perx/team-quest-band";
import { TelegramLinkCard } from "@/components/perx/telegram-link-card";
import { formatMoney } from "@/lib/utils";
import { EmployeePageShell, EmployeeDisplayTitle } from "@/components/perx/employee-page-shell";
import { NG } from "@/lib/new-genre/tokens";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: NG.parchment, minHeight: "100vh" }}>
      <EmployeePageShell narrow>{children}</EmployeePageShell>
    </main>
  );
}

export default function ProgressPage() {
  const { data, loading } = useGamification();

  if (loading) {
    return (
      <PageShell>
        <div style={{ height: "120px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)" }} />
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell>
        <p style={{ color: "#73737c", fontSize: "14px" }}>Could not load your progress.</p>
      </PageShell>
    );
  }

  const { progress, quests } = data;
  const bandStart = progress.nextLevelXp - progress.xpToNextLevel;
  const pct =
    progress.nextLevelXp > bandStart
      ? Math.min(100, Math.round(((progress.xp - bandStart) / (progress.nextLevelXp - bandStart)) * 100))
      : 100;

  return (
    <PageShell>
      <header style={{ marginBottom: "32px" }}>
        <Link
          href="/marketplace"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "13px",
            color: "#73737c",
            textDecoration: "none",
          }}
        >
          ← Marketplace
        </Link>
        <EmployeeDisplayTitle>Your Perx journey.</EmployeeDisplayTitle>
        <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: 0 }}>
          Earn XP when providers scan your vouchers. Keep your streak alive.
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          border: "1px solid rgba(1,1,16,0.12)",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "24px",
          background: "linear-gradient(180deg, rgba(99,91,255,0.06) 0%, #ffffff 55%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#635bff",
                margin: "0 0 8px",
              }}
            >
              Level {progress.level}
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontSize: "28px",
                margin: "0 0 6px",
                color: "#010110",
              }}
            >
              {progress.levelTitle}
            </h2>
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
              {progress.xp} XP · {progress.xpToNextLevel} to next level
            </p>
          </div>
          <div
            style={{
              minWidth: "88px",
              textAlign: "center",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid rgba(1,1,16,0.08)",
              backgroundColor: "#ffffff",
            }}
          >
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "24px", margin: 0 }}>🔥</p>
            <p
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "18px",
                fontWeight: 600,
                color: "#010110",
                margin: "4px 0 0",
              }}
            >
              {progress.streakCount}
            </p>
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", color: "#73737c", margin: "2px 0 0" }}>
              day streak
            </p>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              height: "8px",
              borderRadius: "100px",
              backgroundColor: "rgba(1,1,16,0.08)",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "linear-gradient(90deg, #635bff, #4f46e5)",
                borderRadius: "100px",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <Stat label="Redemptions" value={String(progress.totalRedemptions)} />
          <Stat
            label="Bonus pool"
            value={progress.bonusCreditsAvailable > 0 ? formatMoney(progress.bonusCreditsAvailable, "ALL") : "Locked"}
          />
          <Stat label="Next unlock" value={progress.level >= 5 ? "Unlocked" : "Level 5"} />
        </div>

        {progress.bonusUnlocked && (
          <p
            style={{
              marginTop: "16px",
              marginBottom: 0,
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              color: "#010110",
              padding: "10px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(99,91,255,0.1)",
            }}
          >
            Bonus wallet unlocked — {formatMoney(progress.bonusCreditsAvailable, "ALL")} ready to spend on perks.
          </p>
        )}
      </motion.div>

      <TelegramLinkCard />

      <section style={{ marginTop: "8px" }}>
        <h3
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "22px",
            margin: "0 0 12px",
            color: "#010110",
          }}
        >
          Team quests
        </h3>
        <TeamQuestBand quests={quests} embedded />
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "8px",
        border: "1px solid rgba(1,1,16,0.08)",
        backgroundColor: "rgba(255,255,255,0.8)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#73737c",
          margin: "0 0 4px",
        }}
      >
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", fontWeight: 600, color: "#010110", margin: 0 }}>
        {value}
      </p>
    </div>
  );
}
