"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useGamification } from "@/components/perx/xp-progress-pill";
import { apiPost } from "@/lib/api/client";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import type { UserProgressDTO } from "@/lib/api/contracts";

const TIER_STYLES: Record<
  UserProgressDTO["tier"],
  { gradient: string; glow: string; flame: string }
> = {
  bronze: {
    gradient: "linear-gradient(135deg, #ff9a44 0%, #ff6b1a 45%, #e6320a 100%)",
    glow: "rgba(255, 120, 40, 0.55)",
    flame: "#fff8f0",
  },
  silver: {
    gradient: "linear-gradient(135deg, #e8ecf2 0%, #9aa8bc 45%, #5a6578 100%)",
    glow: "rgba(140, 160, 190, 0.5)",
    flame: "#f5f7fa",
  },
  gold: {
    gradient: "linear-gradient(135deg, #ffe566 0%, #ffb347 40%, #ff8c00 100%)",
    glow: "rgba(255, 200, 60, 0.55)",
    flame: "#fffef5",
  },
};

function FlameIcon({ size = 48, color = "#fff8f0" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M32 8c-4 10-14 14-14 26a14 14 0 1 0 28 0c0-8-6-14-10-20-2 3-4 6-8 6s-6-3-6-10z"
        fill={color}
        opacity="0.35"
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M32 22c-2 6-8 8-8 14a8 8 0 1 0 16 0c0-4-3-7-6-10-1 2-2 3-4 3s-3-1-3-4z"
        fill={color}
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function MiniPlayerCard({ progress, onClick }: { progress: UserProgressDTO; onClick: () => void }) {
  const style = TIER_STYLES[progress.tier];
  const hasStreak = progress.streakWeeks > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="player-card-mini"
      aria-label={`${progress.xp} XP · ${progress.tierTitle} tier`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        minWidth: "132px",
        height: "52px",
        padding: "8px 12px 8px 14px",
        borderRadius: "16px",
        border: "none",
        cursor: "pointer",
        background: style.gradient,
        boxShadow: hasStreak ? `0 0 20px ${style.glow}` : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ textAlign: "left" }}>
        <span
          className="tabular-nums"
          style={{
            display: "block",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "22px",
            fontWeight: 570,
            lineHeight: 1,
            letterSpacing: "-0.44px",
            color: "#ffffff",
          }}
        >
          {progress.xp.toLocaleString()}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "-0.11px",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          XP
        </span>
      </div>
      <div
        className={hasStreak ? "player-flame-glow" : undefined}
        style={{ flexShrink: 0, lineHeight: 0 }}
      >
        <FlameIcon size={40} color={style.flame} />
      </div>
    </button>
  );
}

function PlayerCardModal({
  open,
  onClose,
  progress,
  onBuyFreeze,
  buying,
}: {
  open: boolean;
  onClose: () => void;
  progress: UserProgressDTO;
  onBuyFreeze: () => void;
  buying: boolean;
}) {
  const style = TIER_STYLES[progress.tier];
  const bandStart = progress.nextLevelXp - progress.xpToNextLevel;
  const pct =
    progress.nextLevelXp > bandStart
      ? Math.min(100, Math.round(((progress.xp - bandStart) / (progress.nextLevelXp - bandStart)) * 100))
      : 100;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(12,16,24,0.45)",
            zIndex: 200,
          }}
        />
        <DialogPrimitive.Content
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 201,
            width: "min(400px, calc(100vw - 32px))",
            borderRadius: "24px",
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid rgba(1,1,16,0.1)",
          }}
        >
          <div
            style={{
              background: style.gradient,
              padding: "28px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: progress.streakWeeks > 0 ? `inset 0 -20px 40px ${style.glow}` : undefined,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.85)",
                  margin: "0 0 4px",
                }}
              >
                {progress.tierTitle} · Level {progress.level}
              </p>
              <p
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "48px",
                  fontWeight: 570,
                  lineHeight: 1.05,
                  letterSpacing: "-1.44px",
                  color: "#ffffff",
                  margin: 0,
                }}
              >
                {progress.xp.toLocaleString()}
              </p>
              <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "rgba(255,255,255,0.9)", margin: "4px 0 0" }}>
                XP · {progress.levelTitle}
              </p>
            </div>
            <div className={progress.streakWeeks > 0 ? "player-flame-glow" : undefined}>
              <FlameIcon size={72} color={style.flame} />
            </div>
          </div>

          <div style={{ padding: "20px 24px 24px" }}>
            {progress.streakAtRisk && (
              <p
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "13px",
                  color: "#e6320a",
                  margin: "0 0 16px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(230,50,10,0.08)",
                }}
              >
                Your {progress.streakWeeks}-week streak is in danger — redeem a perk this week!
              </p>
            )}

            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#6d7074" }}>
                  Next level
                </span>
                <span className="tabular-nums" style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "#0c1018" }}>
                  {progress.xpToNextLevel} XP to go
                </span>
              </div>
              <div style={{ height: "6px", borderRadius: "100px", background: "rgba(1,1,16,0.08)" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: "100px",
                    background: style.gradient,
                    transition: "width 600ms ease-out",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <StatBox label="Week streak" value={`${progress.streakWeeks} 🔥`} />
              <StatBox label="Streak freezes" value={String(progress.streakFreezes)} />
              <StatBox label="Redemptions" value={String(progress.totalRedemptions)} />
              <StatBox
                label="Bonus wallet"
                value={formatMoney(progress.bonusCreditsAvailable, "ALL")}
              />
            </div>

            {progress.officeLegends && progress.officeLegends.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#6d7074",
                    margin: "0 0 8px",
                  }}
                >
                  Office Legend badges
                </p>
                {progress.officeLegends.map((b, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: "var(--font-inter)",
                      fontSize: "13px",
                      color: "#0c1018",
                      margin: "0 0 4px",
                    }}
                  >
                    🏆 {b.badgeLabel}
                  </p>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={buying || progress.xp < 200}
              onClick={onBuyFreeze}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "50px",
                border: "1px solid rgba(1,1,16,0.15)",
                background: "#ffffff",
                fontFamily: "var(--font-inter)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#0c1018",
                cursor: progress.xp >= 200 ? "pointer" : "not-allowed",
                opacity: progress.xp >= 200 ? 1 : 0.5,
              }}
            >
              {buying ? "Buying…" : "Buy Streak Freeze (200 XP)"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "12px", background: "rgba(1,1,16,0.04)" }}>
      <p style={{ fontFamily: "var(--font-inter)", fontSize: "10px", color: "#6d7074", margin: "0 0 4px" }}>{label}</p>
      <p className="tabular-nums" style={{ fontFamily: "var(--font-inter)", fontSize: "15px", fontWeight: 600, margin: 0, color: "#0c1018" }}>
        {value}
      </p>
    </div>
  );
}

export function PlayerCardNav() {
  const { data, loading, refresh } = useGamification();
  const [open, setOpen] = React.useState(false);
  const [buying, setBuying] = React.useState(false);

  const handleBuyFreeze = async () => {
    if (!data) return;
    setBuying(true);
    try {
      await apiPost("/me/progress/streak-freeze", {});
      toast.success("Streak Freeze added to your inventory");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBuying(false);
    }
  };

  if (loading || !data) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: "132px",
          height: "52px",
          borderRadius: "16px",
          backgroundColor: "rgba(1,1,16,0.06)",
        }}
      />
    );
  }

  return (
    <>
      <MiniPlayerCard progress={data.progress} onClick={() => setOpen(true)} />
      <PlayerCardModal
        open={open}
        onClose={() => setOpen(false)}
        progress={data.progress}
        onBuyFreeze={() => void handleBuyFreeze()}
        buying={buying}
      />
    </>
  );
}
