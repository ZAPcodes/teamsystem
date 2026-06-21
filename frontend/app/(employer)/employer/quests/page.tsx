"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useEmployerCompany, useEmployerQuests } from "@/lib/hooks/use-employer";
import { useTranslation } from "@/lib/i18n/use-translation";
import { toast } from "sonner";
import type { QuestDTO } from "@/lib/api/contracts";

const CATEGORY_LABELS: Record<string, string> = {
  wellness: "Wellness",
  food: "Food",
  travel: "Travel",
  learning: "Learning",
  lifestyle: "Lifestyle",
};

const SUGGESTED_ICONS = ["🎯", "💪", "🍽️", "✈️", "📚", "✨", "🏃", "☕"];

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px 120px" }}>{children}</div>
    </main>
  );
}

function fieldStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(1,1,16,0.15)",
    fontFamily: "var(--font-inter), sans-serif",
    fontSize: "14px",
    color: "#010110",
    backgroundColor: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function QuestCard({ quest }: { quest: QuestDTO }) {
  const categoryLabel = CATEGORY_LABELS[quest.targetCategory] ?? quest.targetCategory;

  return (
    <article
      style={{
        border: "1px solid rgba(1,1,16,0.12)",
        borderRadius: "8px",
        padding: "20px",
        backgroundColor: quest.status === "completed" ? "rgba(99,91,255,0.04)" : "#ffffff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "28px", lineHeight: 1 }} aria-hidden="true">
            {quest.icon ?? "🎯"}
          </span>
          <div>
            <h3
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontSize: "20px",
                letterSpacing: "-0.4px",
                color: "#010110",
                margin: "0 0 6px",
              }}
            >
              {quest.title}
            </h3>
            <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c", margin: 0, lineHeight: 1.5 }}>
              {quest.description}
            </p>
          </div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "5px 10px",
            borderRadius: "100px",
            border: "1px solid rgba(1,1,16,0.12)",
            color: quest.status === "active" ? "#635bff" : "#73737c",
            height: "fit-content",
          }}
        >
          {quest.status}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "14px", fontFamily: "var(--font-inter)", fontSize: "12px", color: "#73737c" }}>
        <span>
          Category: <strong style={{ color: "#010110" }}>{categoryLabel}</strong>
        </span>
        <span>
          Reward: <strong style={{ color: "#635bff" }}>+{quest.rewardXp} XP</strong>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            flex: 1,
            height: "8px",
            borderRadius: "100px",
            backgroundColor: "rgba(1,1,16,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${quest.progressPct}%`,
              background: quest.status === "completed"
                ? "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)"
                : "linear-gradient(90deg, #635bff 0%, #8b84ff 100%)",
              borderRadius: "100px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <span
          className="tabular-nums"
          style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 600, color: "#010110", minWidth: "80px", textAlign: "right" }}
        >
          {quest.currentCount}/{quest.targetCount}
        </span>
      </div>
    </article>
  );
}

export default function EmployerQuestsPage() {
  const { t } = useTranslation();
  const { data: companyData } = useEmployerCompany();
  const { quests, loading, error, createQuest } = useEmployerQuests();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetCategory, setTargetCategory] = React.useState("");
  const [targetCount, setTargetCount] = React.useState("25");
  const [rewardXp, setRewardXp] = React.useState("150");
  const [icon, setIcon] = React.useState("🎯");
  const [submitting, setSubmitting] = React.useState(false);

  const allowedCategories = companyData?.policy.allowedCategories ?? [];

  React.useEffect(() => {
    if (allowedCategories.length > 0 && !targetCategory) {
      setTargetCategory(allowedCategories[0]);
    }
  }, [allowedCategories, targetCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(targetCount, 10);
    const xp = parseInt(rewardXp, 10);
    if (!title.trim() || !description.trim() || !targetCategory || !count || count < 1) {
      toast.error("Fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await createQuest({
        title: title.trim(),
        description: description.trim(),
        targetCategory,
        targetCount: count,
        rewardXp: Number.isFinite(xp) ? xp : 100,
        icon: icon.trim() || undefined,
      });
      toast.success(t("employer.questCreated"));
      setTitle("");
      setDescription("");
      setTargetCount("25");
      setRewardXp("150");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && quests.length === 0) {
    return (
      <PageShell>
        <div style={{ height: "120px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)" }} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header style={{ marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "clamp(36px, 5vw, 44px)",
            letterSpacing: "-1.2px",
            margin: "0 0 8px",
            color: "#010110",
          }}
        >
          {t("employer.teamQuests")}
        </h1>
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c", margin: 0, maxWidth: "560px", lineHeight: 1.5 }}>
          {t("employer.teamQuestsSubtitle")}
        </p>
      </header>

      <section
        style={{
          border: "1px solid rgba(99,91,255,0.2)",
          borderRadius: "12px",
          padding: "28px",
          marginBottom: "48px",
          background: "linear-gradient(180deg, rgba(99,91,255,0.05) 0%, #ffffff 60%)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "22px",
            letterSpacing: "-0.44px",
            color: "#010110",
            margin: "0 0 20px",
          }}
        >
          {t("employer.createQuest")}
        </h2>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "16px" }}>
          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#73737c" }}>{t("employer.questTitle")}</span>
              <input
                style={fieldStyle()}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Team wellness sprint"
                maxLength={80}
                required
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#73737c" }}>{t("employer.questCategory")}</span>
              <select
                style={fieldStyle()}
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                required
              >
                {allowedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#73737c" }}>{t("employer.questDescription")}</span>
            <textarea
              style={{ ...fieldStyle(), minHeight: "88px", resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hit 25 verified wellness redemptions together before the period ends."
              maxLength={300}
              required
            />
          </label>

          <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#73737c" }}>{t("employer.questTarget")}</span>
              <input
                style={fieldStyle()}
                type="number"
                min={1}
                max={10000}
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                required
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#73737c" }}>{t("employer.questRewardXp")}</span>
              <input
                style={fieldStyle()}
                type="number"
                min={0}
                max={5000}
                value={rewardXp}
                onChange={(e) => setRewardXp(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#73737c" }}>{t("employer.questIcon")}</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                {SUGGESTED_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      border: icon === emoji ? "2px solid #635bff" : "1px solid rgba(1,1,16,0.12)",
                      backgroundColor: icon === emoji ? "rgba(99,91,255,0.08)" : "#fff",
                      fontSize: "18px",
                      cursor: "pointer",
                    }}
                    aria-label={`Icon ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div>
            <Button type="submit" variant="primary" disabled={submitting || allowedCategories.length === 0}>
              {submitting ? "Creating…" : t("employer.createQuest")}
            </Button>
          </div>
        </form>
      </section>

      {error && (
        <p role="alert" style={{ color: "#73737c", marginBottom: "24px" }}>
          {error}
        </p>
      )}

      <section>
        <h2
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontSize: "22px",
            letterSpacing: "-0.44px",
            color: "#010110",
            margin: "0 0 20px",
          }}
        >
          {t("employer.activeQuests")}
        </h2>

        {quests.length === 0 ? (
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c", lineHeight: 1.5 }}>
            {t("employer.noQuests")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
