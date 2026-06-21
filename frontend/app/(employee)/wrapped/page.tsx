"use client";

import * as React from "react";
import Link from "next/link";
import { useWrapped } from "@/lib/hooks/use-engagement";
import { formatMoney } from "@/lib/utils";
import type { WrappedDTO } from "@/lib/api/contracts";
import styles from "./wrapped.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  wellness: "Wellness",
  lifestyle: "Lifestyle",
  travel: "Travel",
  learning: "Learning",
  mixed: "Mixed",
};

const DELAY_CLASS = [
  styles.cardDelay0,
  styles.cardDelay1,
  styles.cardDelay2,
  styles.cardDelay3,
  styles.cardDelay4,
  styles.cardDelay5,
] as const;

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
  const year = new Date().getFullYear();

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.skeleton} />
        </div>
      </main>
    );
  }

  if (!wrapped) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <Link href="/marketplace" className={styles.back}>
            ← Marketplace
          </Link>
          <EmptyWrapped />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link href="/marketplace" className={styles.back}>
          ← Marketplace
        </Link>

        <div className={styles.brandRow}>
          <span className={styles.brand}>Perx Wrapped</span>
          <span className={styles.year}>{year}</span>
        </div>

        <StoryCard
          delayClass={DELAY_CLASS[0]}
          className={styles.cardPersona}
          eyebrow="Your persona"
          title={wrapped.persona}
          subtitle={personaTagline(wrapped.persona, wrapped.topCategory)}
        />

        <StoryCard
          delayClass={DELAY_CLASS[1]}
          className={styles.cardSpend}
          eyebrow="Benefits enjoyed"
          bigNumber={formatMoney(wrapped.savedAmount, wrapped.currency)}
          hint="Total perk value claimed this period"
        />

        <StoryCard
          delayClass={DELAY_CLASS[2]}
          className={styles.cardCategory}
          eyebrow="Top category"
          emoji={categoryEmoji(wrapped.topCategory)}
          title={formatCategory(wrapped.topCategory)}
          hint="Where most of your benefits energy went"
        />

        <StoryCard
          delayClass={DELAY_CLASS[3]}
          className={styles.cardRedeem}
          eyebrow="Redemptions"
          bigNumber={String(wrapped.redeemedCount)}
          hint={wrapped.redeemedCount === 1 ? "voucher scanned at a provider" : "vouchers scanned at providers"}
        />

        <RangeCard wrapped={wrapped} delayClass={DELAY_CLASS[4]} />

        <div className={styles.ctaCard}>
          <p className={styles.ctaText}>
            Ready for the next chapter? Your allowance is still waiting on the marketplace.
          </p>
          <Link href="/marketplace" className={styles.ctaButton}>
            Browse perks
          </Link>
        </div>
      </div>
    </main>
  );
}

function StoryCard({
  delayClass,
  className,
  eyebrow,
  title,
  subtitle,
  bigNumber,
  hint,
  emoji,
}: {
  delayClass: string;
  className: string;
  eyebrow: string;
  title?: string;
  subtitle?: string;
  bigNumber?: string;
  hint?: string;
  emoji?: string;
}) {
  return (
    <article className={`${styles.card} ${delayClass} ${className}`}>
      <div className={styles.cardGlow} aria-hidden="true" />
      <p className={styles.cardEyebrow}>{eyebrow}</p>
      {emoji ? (
        <span className={styles.emoji} aria-hidden="true">
          {emoji}
        </span>
      ) : null}
      {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
      {bigNumber ? <p className={styles.cardBigNumber}>{bigNumber}</p> : null}
      {subtitle ? <p className={styles.cardSubtitle}>{subtitle}</p> : null}
      {hint ? <p className={styles.cardHint}>{hint}</p> : null}
    </article>
  );
}

function RangeCard({ wrapped, delayClass }: { wrapped: WrappedDTO; delayClass: string }) {
  const allCategories = ["food", "wellness", "lifestyle", "travel", "learning"];
  const top = wrapped.topCategory.toLowerCase();

  return (
    <article className={`${styles.card} ${delayClass} ${styles.cardRange}`}>
      <div className={styles.cardGlow} aria-hidden="true" />
      <p className={styles.cardEyebrow}>Your range</p>
      <p className={styles.cardTitle} style={{ fontSize: "clamp(28px, 7vw, 36px)" }}>
        {wrapped.categoryDiversity} categories
      </p>
      <p className={styles.cardSubtitle}>
        You explored {wrapped.categoryDiversity} different perk types this period — from{" "}
        {formatCategory(wrapped.topCategory)} to beyond.
      </p>
      <div className={styles.chips}>
        {allCategories.map((cat) => (
          <span key={cat} className={`${styles.chip}${cat === top ? ` ${styles.chipActive}` : ""}`}>
            {categoryEmoji(cat)} {formatCategory(cat)}
          </span>
        ))}
      </div>
    </article>
  );
}

function EmptyWrapped() {
  return (
    <div className={styles.empty}>
      <p className={styles.brand}>Perx Wrapped</p>
      <h2>Nothing to wrap yet</h2>
      <p>
        Claim a perk from the marketplace and your story will appear here — persona, totals, and category breakdown.
      </p>
      <Link href="/marketplace" className={styles.ctaButton}>
        Start on the marketplace
      </Link>
    </div>
  );
}
