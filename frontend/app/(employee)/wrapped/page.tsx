"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "@/lib/motion";
import { useWrapped } from "@/lib/hooks/use-engagement";
import { EmployeePageShell, EmployeeDisplayTitle } from "@/components/perx/employee-page-shell";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import type { WrappedDTO } from "@/lib/api/contracts";

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  wellness: "Wellness",
  lifestyle: "Lifestyle",
  travel: "Travel",
  learning: "Learning",
  mixed: "Mixed"
};

function formatCategory(category: string) {
  return CATEGORY_LABELS[category.toLowerCase()] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

function personaTagline(persona: string, topCategory: string) {
  const cat = formatCategory(topCategory);
  switch (persona) {
    case "Reset Seeker":
      return `You leaned into recovery — ${cat.toLowerCase()} perks kept you grounded.`;
    case "Social Eater":
      return `Food and shared moments defined your quarter.`;
    case "Specialist":
      return `You know what you like — mostly ${cat.toLowerCase()}, mostly on point.`;
    case "Renaissance":
      return `You sampled across the catalog — a true benefits omnivore.`;
    default:
      return `You explored ${cat.toLowerCase()} and beyond this period.`;
  }
}

function categoryEmoji(category: string) {
  const key = category.toLowerCase();
  if (key === "food") return "🍽";
  if (key === "wellness") return "🧘";
  if (key === "travel") return "✈";
  if (key === "learning") return "📚";
  if (key === "lifestyle") return "✨";
  return "◆";
}

export default function WrappedPage() {
  const { wrapped, loading } = useWrapped();

  if (loading) {
    return (
      <PageShell>
        <div
          style={{
            height: "280px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(99,91,255,0.08) 0%, rgba(1,1,16,0.04) 100%)"
          }}
        />
      </PageShell>
    );
  }

  if (!wrapped) {
    return (
      <PageShell>
        <EmptyWrapped />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header style={{ marginBottom: "28px" }}>
        <Link href="/marketplace" className="wrapped-back-link">
          ← Marketplace
        </Link>
        <EmployeeDisplayTitle>Your Perx Wrapped.</EmployeeDisplayTitle>
        <p className="wrapped-intro">
          A quick recap of the perks you claimed this period — how much you used, what you redeemed, and where your
          benefits energy went.
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="wrapped-hero"
      >
        <div className="wrapped-hero__glow" aria-hidden="true" />
        <p className="wrapped-hero__eyebrow">Your persona</p>
        <h2 className="wrapped-hero__persona">{wrapped.persona}</h2>
        <p className="wrapped-hero__tagline">{personaTagline(wrapped.persona, wrapped.topCategory)}</p>
        <div className="wrapped-hero__amount">
          <span className="wrapped-hero__amount-label">Benefits enjoyed</span>
          <span className="wrapped-hero__amount-value tabular-nums">
            {formatMoney(wrapped.savedAmount, wrapped.currency)}
          </span>
        </div>
      </motion.div>

      <section className="wrapped-stats" aria-label="Wrapped stats">
        <StatCard
          icon={categoryEmoji(wrapped.topCategory)}
          label="Top category"
          value={formatCategory(wrapped.topCategory)}
        />
        <StatCard
          icon="🎟"
          label="Redemptions"
          value={String(wrapped.redeemedCount)}
          hint={wrapped.redeemedCount === 1 ? "voucher scanned" : "vouchers scanned"}
        />
        <StatCard
          icon="🗂"
          label="Categories explored"
          value={String(wrapped.categoryDiversity)}
          hint="different perk types"
        />
        <DiversityCard wrapped={wrapped} />
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="wrapped-footer"
      >
        <p>Ready for the next chapter? Your allowance is still waiting on the marketplace.</p>
        <Link href="/marketplace" className="ng-box-btn wrapped-footer__cta">
          Browse perks
        </Link>
      </motion.div>

      <style jsx>{`
        .wrapped-back-link {
          font-family: ${NG.fontBody};
          font-size: 13px;
          color: ${NG.slateVeil};
          text-decoration: none;
          display: inline-block;
          margin-bottom: 16px;
        }
        .wrapped-intro {
          font-family: ${NG.fontBody};
          font-size: 14px;
          line-height: 1.55;
          color: ${NG.slateVeil};
          margin: 0;
          max-width: 52ch;
        }
        .wrapped-hero {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 28px 24px 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(99, 91, 255, 0.22);
          background: linear-gradient(145deg, #0f0f1a 0%, #1a1535 42%, #2d2458 100%);
          color: #ffffff;
        }
        .wrapped-hero__glow {
          position: absolute;
          top: -40%;
          right: -20%;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 91, 255, 0.45) 0%, transparent 70%);
          pointer-events: none;
        }
        .wrapped-hero__eyebrow {
          position: relative;
          font-family: ${NG.fontBody};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          margin: 0 0 10px;
        }
        .wrapped-hero__persona {
          position: relative;
          font-family: ${NG.fontDisplay};
          font-size: clamp(32px, 6vw, 44px);
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
        }
        .wrapped-hero__tagline {
          position: relative;
          font-family: ${NG.fontBody};
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.72);
          margin: 0 0 24px;
          max-width: 38ch;
        }
        .wrapped-hero__amount {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
        }
        .wrapped-hero__amount-label {
          font-family: ${NG.fontBody};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }
        .wrapped-hero__amount-value {
          font-family: ${NG.fontDisplay};
          font-size: clamp(28px, 5vw, 36px);
          letter-spacing: -0.02em;
        }
        .wrapped-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 560px) {
          .wrapped-stats {
            grid-template-columns: 1fr;
          }
        }
        .wrapped-stat-card {
          border: 1px solid rgba(1, 1, 16, 0.1);
          border-radius: 12px;
          padding: 16px;
          background: #ffffff;
          min-height: 108px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .wrapped-stat-card__icon {
          font-size: 20px;
          line-height: 1;
        }
        .wrapped-stat-card__label {
          font-family: ${NG.fontBody};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${NG.slateVeil};
          margin: 0;
        }
        .wrapped-stat-card__value {
          font-family: ${NG.fontDisplay};
          font-size: 24px;
          color: ${NG.onyx};
          margin: 0;
          line-height: 1.1;
        }
        .wrapped-stat-card__hint {
          font-family: ${NG.fontBody};
          font-size: 12px;
          color: ${NG.ashMist};
          margin: 0;
        }
        .wrapped-diversity {
          grid-column: 1 / -1;
          border: 1px solid rgba(1, 1, 16, 0.1);
          border-radius: 12px;
          padding: 16px 18px;
          background: linear-gradient(180deg, rgba(99, 91, 255, 0.05) 0%, #ffffff 70%);
        }
        .wrapped-diversity__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .wrapped-diversity__chip {
          font-family: ${NG.fontBody};
          font-size: 12px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 100px;
          background: rgba(1, 1, 16, 0.06);
          color: ${NG.onyx};
        }
        .wrapped-diversity__chip--active {
          background: rgba(99, 91, 255, 0.14);
          color: #4f46e5;
        }
        .wrapped-footer {
          border: 1px solid rgba(1, 1, 16, 0.1);
          border-radius: 12px;
          padding: 20px;
          background: ${NG.cardSurface};
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }
        .wrapped-footer p {
          font-family: ${NG.fontBody};
          font-size: 14px;
          line-height: 1.5;
          color: ${NG.slateVeil};
          margin: 0;
          max-width: 36ch;
        }
        .wrapped-footer__cta {
          text-decoration: none;
          white-space: nowrap;
        }
        .wrapped-empty {
          text-align: center;
          padding: 48px 24px;
          border: 1px dashed rgba(1, 1, 16, 0.15);
          border-radius: 12px;
          background: rgba(99, 91, 255, 0.04);
        }
        .wrapped-empty h2 {
          font-family: ${NG.fontDisplay};
          font-size: 24px;
          margin: 0 0 8px;
          color: ${NG.onyx};
        }
        .wrapped-empty p {
          font-family: ${NG.fontBody};
          font-size: 14px;
          color: ${NG.slateVeil};
          margin: 0 0 20px;
          line-height: 1.5;
        }
      `}</style>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: NG.parchment, minHeight: "100vh" }}>
      <EmployeePageShell narrow>{children}</EmployeePageShell>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <motion.div
      className="wrapped-stat-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <span className="wrapped-stat-card__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="wrapped-stat-card__label">{label}</p>
      <p className="wrapped-stat-card__value">{value}</p>
      {hint ? <p className="wrapped-stat-card__hint">{hint}</p> : null}
    </motion.div>
  );
}

function DiversityCard({ wrapped }: { wrapped: WrappedDTO }) {
  const allCategories = ["food", "wellness", "lifestyle", "travel", "learning"];
  const top = wrapped.topCategory.toLowerCase();
  const extra = Math.max(0, wrapped.categoryDiversity - 1);

  return (
    <motion.div
      className="wrapped-diversity"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <p className="wrapped-stat-card__label">Your range</p>
      <p className="wrapped-stat-card__value" style={{ fontSize: "20px" }}>
        {wrapped.categoryDiversity} perk {wrapped.categoryDiversity === 1 ? "category" : "categories"} explored
        {extra > 0 ? ` — ${formatCategory(wrapped.topCategory)} plus ${extra} more` : ""}
      </p>
      <div className="wrapped-diversity__chips">
        {allCategories.map((cat) => (
          <span
            key={cat}
            className={`wrapped-diversity__chip${cat === top ? " wrapped-diversity__chip--active" : ""}`}
          >
            {categoryEmoji(cat)} {formatCategory(cat)}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function EmptyWrapped() {
  return (
    <div className="wrapped-empty">
      <p className="wrapped-hero__eyebrow" style={{ color: NG.slateVeil }}>
        Perx Wrapped
      </p>
      <h2>Nothing to wrap yet</h2>
      <p>
        Claim a perk from the marketplace and your recap will show up here — totals, redemptions, and your benefits
        persona.
      </p>
      <Link href="/marketplace" className="ng-box-btn" style={{ textDecoration: "none" }}>
        Start on the marketplace
      </Link>
      <style jsx>{`
        .wrapped-empty {
          text-align: center;
          padding: 48px 24px;
          border: 1px dashed rgba(1, 1, 16, 0.15);
          border-radius: 12px;
          background: rgba(99, 91, 255, 0.04);
        }
        .wrapped-empty h2 {
          font-family: ${NG.fontDisplay};
          font-size: 24px;
          margin: 0 0 8px;
          color: ${NG.onyx};
        }
        .wrapped-empty p {
          font-family: ${NG.fontBody};
          font-size: 14px;
          color: ${NG.slateVeil};
          margin: 0 auto 20px;
          line-height: 1.5;
          max-width: 40ch;
        }
      `}</style>
    </div>
  );
}
