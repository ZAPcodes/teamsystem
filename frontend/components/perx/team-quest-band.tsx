"use client";

import { motion } from "@/lib/motion";
import type { QuestDTO } from "@/lib/api/contracts";

interface TeamQuestBandProps {
  quests: QuestDTO[];
  embedded?: boolean;
}

function QuestCards({ quests }: { quests: QuestDTO[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "12px",
      }}
    >
      {quests.map((quest, index) => (
        <motion.div
          key={quest.id}
          role="article"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            border: "1px solid rgba(1,1,16,0.1)",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "20px", lineHeight: 1 }} aria-hidden="true">
                {quest.icon ?? "🎯"}
              </span>
              <div>
                <h3
                  style={{
                    fontFamily: "var(--font-display), Georgia, serif",
                    fontSize: "16px",
                    lineHeight: 1.2,
                    letterSpacing: "-0.32px",
                    color: "#010110",
                    margin: "0 0 4px",
                  }}
                >
                  {quest.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    color: "#73737c",
                    margin: 0,
                  }}
                >
                  {quest.description}
                </p>
              </div>
            </div>
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                fontWeight: 700,
                color: "#635bff",
                whiteSpace: "nowrap",
              }}
            >
              +{quest.rewardXp} XP
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                flex: 1,
                height: "6px",
                borderRadius: "100px",
                backgroundColor: "rgba(1,1,16,0.06)",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  height: "100%",
                  width: `${quest.progressPct}%`,
                  background: "linear-gradient(90deg, #635bff 0%, #8b84ff 100%)",
                  borderRadius: "100px",
                }}
              />
            </div>
            <span
              className="tabular-nums"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "#010110",
                minWidth: "72px",
                textAlign: "right",
              }}
            >
              {quest.currentCount}/{quest.targetCount}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function TeamQuestBand({ quests, embedded }: TeamQuestBandProps) {
  const active = quests.filter((quest) => quest.status === "active").slice(0, 2);
  if (active.length === 0) return null;

  if (embedded) {
    return <QuestCards quests={active} />;
  }

  return (
    <section
      aria-label="Team quests"
      style={{
        borderBottom: "1px solid rgba(1,1,16,0.08)",
        backgroundColor: "#faf9ff",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#635bff",
              margin: 0,
            }}
          >
            Team quests
          </p>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "12px",
              color: "#73737c",
              margin: 0,
            }}
          >
            Verified redemptions count toward company goals
          </p>
        </div>
        <QuestCards quests={active} />
      </div>
    </section>
  );
}
