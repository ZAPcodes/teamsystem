"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropBand } from "@/components/perx/drop-band";
import { ConciergeSheet } from "@/components/perx/concierge-sheet";
import { BoraPromptHero } from "@/components/perx/bora-prompt-hero";
import { PurchasedBenefitsChips } from "@/components/perx/purchased-benefits-chips";
import { SavingsChartPanel } from "@/components/perx/savings-chart-panel";
import { PersonalityTestCard } from "@/components/perx/personality-test-card";
import { ServiceCard, ServiceCardSkeleton } from "@/components/perx/service-card";
import { ProviderShowcaseCard, groupOffersByProvider } from "@/components/perx/provider-showcase-card";
import { SectionHeader } from "@/components/perx/section-header";
import { CompanyActivityFeed } from "@/components/perx/company-activity-feed";
import { LivingFeedBand } from "@/components/perx/living-feed-band";
import { EmployeePageShell } from "@/components/perx/employee-page-shell";
import { useOffers, useDrops } from "@/lib/hooks/use-offers";
import { useAllowance } from "@/lib/hooks/use-allowance";
import { useGamification } from "@/components/perx/xp-progress-pill";
import { TeamQuestBand } from "@/components/perx/team-quest-band";
import { usePersonalityStore } from "@/lib/store/personality";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import type { Category, Offer } from "@/lib/api/contracts";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "wellness", label: "Wellness" },
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "learning", label: "Learning" },
  { value: "lifestyle", label: "Lifestyle" },
];

export default function MarketplacePage() {
  const [activeCategory, setActiveCategory] = React.useState<Category>("all");
  const [conciergeOpen, setConciergeOpen] = React.useState(false);
  const [launchPrompt, setLaunchPrompt] = React.useState<string | null>(null);
  const [providerFilter, setProviderFilter] = React.useState<string | null>(null);
  const personalityResult = usePersonalityStore((s) => s.result);

  const { offers, feedMeta, loading: offersLoading, error: offersError, refetch: refetchOffers } = useOffers();
  const { allowance, loading: allowanceLoading, error: allowanceError } = useAllowance();
  const { drops } = useDrops();
  const { data: gamification } = useGamification();

  const currency = allowance?.currency ?? "ALL";

  const visibleOffers = React.useMemo(() => {
    if (!offers) return null;
    return offers.filter((offer) => {
      const matchesTab = activeCategory === "all" || offer.category === activeCategory;
      const matchesPersonality =
        !personalityResult ||
        personalityResult.recommendedCategories.includes(offer.category);
      const matchesProvider = !providerFilter || offer.provider.id === providerFilter;
      return matchesTab && matchesPersonality && matchesProvider;
    });
  }, [activeCategory, offers, personalityResult, providerFilter]);

  const trendingOffers = React.useMemo(() => {
    if (!offers) return [];
    const scored = [...offers].sort((a, b) => {
      const score = (o: Offer) =>
        (o.isLimited ? 2 : 0) + (o.visibility === "exclusive" ? 1 : 0) + (o.urgencyLabel ? 1 : 0);
      return score(b) - score(a);
    });
    return scored.slice(0, 6);
  }, [offers]);

  const topProviders = React.useMemo(
    () => (offers ? groupOffersByProvider(offers).slice(0, 4) : []),
    [offers]
  );

  const handlePersonalityApplied = React.useCallback(() => {
    setActiveCategory("all");
    setProviderFilter(null);
  }, []);

  const handleBoraSubmit = React.useCallback((message: string) => {
    setLaunchPrompt(message);
    setConciergeOpen(true);
  }, []);

  const handleConciergeClose = React.useCallback(() => {
    setConciergeOpen(false);
    setLaunchPrompt(null);
  }, []);

  const spentALL = allowance?.used ?? 0;

  return (
    <>
      {drops && drops.length > 0 && <DropBand drops={drops} />}
      {gamification?.quests && <TeamQuestBand quests={gamification.quests} />}
      <ConciergeSheet open={conciergeOpen} onClose={handleConciergeClose} launchPrompt={launchPrompt} />

      {/* Dawn arc hero — full bleed */}
      <section className="ng-hero-banner" style={{ padding: "0 0 56px" }}>
        <EmployeePageShell flushTop>
          <div className="ng-hero-copy" style={{ paddingTop: "32px", paddingBottom: "8px" }}>
            <h1
              className="animate-settle ng-hero-title"
              style={{
                fontFamily: NG.fontDisplay,
                fontSize: "clamp(36px, 6vw, 56px)",
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: "0 0 12px",
                color: "#FFF9F0",
              }}
            >
              Benefits,{" "}
              <span className="ng-hero-gradient-tail">curated.</span>
            </h1>
            <p className="ng-hero-subtitle">
              Real perks from your allowance — pick a package or ask Bora to bundle something new.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <BoraPromptHero onSubmit={handleBoraSubmit} variant="new-genre" />
            </div>

            {allowance && !allowanceLoading && (
              <p className="ng-hero-meta tabular-nums">
                {formatMoney(allowance.available, currency)} remaining · {formatMoney(spentALL, currency)} deployed
              </p>
            )}
          </div>
        </EmployeePageShell>
      </section>

      <main style={{ backgroundColor: NG.parchment, minHeight: "50vh" }}>
        <EmployeePageShell flushTop>
          <LivingFeedBand feedMeta={feedMeta} />

          {/* Already yours — below hero */}
          <section style={{ marginBottom: "64px", paddingTop: "8px" }}>
            <PurchasedBenefitsChips spentALL={spentALL} />
          </section>

          {/* Engagement row */}
          <section style={{ marginBottom: "64px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "16px",
                alignItems: "stretch",
              }}
            >
              <PersonalityTestCard offers={offers ?? []} onApplyResult={handlePersonalityApplied} />
              {!allowanceError && (
                <SavingsChartPanel spentALL={spentALL} quarterResetAt={allowance?.periodResetAt} />
              )}
            </div>
          </section>

          {/* Trending benefits — horizontal card row */}
          {!offersLoading && trendingOffers.length > 0 && (
            <section style={{ marginBottom: "64px" }}>
              <SectionHeader
                title="Trending benefits"
                onAction={() => {
                  setActiveCategory("all");
                  setProviderFilter(null);
                  document.getElementById("all-services")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
              <div className="ng-scroll-row">
                {trendingOffers.map((offer) => (
                  <ServiceCard key={offer.id} offer={offer} />
                ))}
              </div>
            </section>
          )}

          {/* Top providers — showcase cards */}
          {!offersLoading && topProviders.length > 0 && (
            <section style={{ marginBottom: "64px" }}>
              <SectionHeader title="Top providers" />
              <div className="ng-scroll-row">
                {topProviders.map((group) => (
                  <ProviderShowcaseCard
                    key={group.providerId}
                    group={group}
                    onBrowse={(id) => {
                      setProviderFilter(id);
                      setActiveCategory("all");
                      document.getElementById("all-services")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Team pulse feed */}
          <section style={{ marginBottom: "64px" }}>
            <SectionHeader title="Team pulse" />
            <CompanyActivityFeed />
          </section>

          {/* All services */}
          <section id="all-services">
            <SectionHeader
              title="All services"
              actionLabel={providerFilter ? "Clear filter" : undefined}
              onAction={
                providerFilter
                  ? () => setProviderFilter(null)
                  : undefined
              }
            />

            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)}>
              <TabsList aria-label="Filter offers by category" style={{ marginBottom: "28px" }}>
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.value} value={cat.value} className="ng-filter-pill">
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CATEGORIES.map((cat) => (
                <TabsContent key={cat.value} value={cat.value}>
                  {activeCategory !== cat.value ? null : offersLoading ? (
                    <ServiceGridSkeleton />
                  ) : offersError ? (
                    <ErrorCard message={offersError} onRetry={() => refetchOffers()} />
                  ) : !visibleOffers || visibleOffers.length === 0 ? (
                    <EmptyState
                      hasPersonalityFilter={Boolean(personalityResult)}
                      hasProviderFilter={Boolean(providerFilter)}
                      onReset={() => {
                        setActiveCategory("all");
                        setProviderFilter(null);
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                        gap: "20px",
                      }}
                    >
                      {visibleOffers.map((offer) => (
                        <ServiceCard key={offer.id} offer={offer} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </section>
        </EmployeePageShell>
      </main>
    </>
  );
}

function ServiceGridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading offers"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
        gap: "20px",
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="ng-card" style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
      <p className="ng-section-title" style={{ fontSize: "24px", marginBottom: "8px" }}>
        Could not load offers.
      </p>
      <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: "0 0 20px" }}>{message}</p>
      <Button variant="ghost" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyState({
  hasPersonalityFilter,
  hasProviderFilter,
  onReset,
}: {
  hasPersonalityFilter: boolean;
  hasProviderFilter: boolean;
  onReset: () => void;
}) {
  return (
    <div className="ng-card" style={{ textAlign: "center", maxWidth: "480px", margin: "0 auto" }}>
      <h2 className="ng-section-title" style={{ fontSize: "26px", marginBottom: "12px" }}>
        Nothing matches that yet.
      </h2>
      <p
        style={{
          fontFamily: NG.fontBody,
          fontSize: "14px",
          lineHeight: 1.4,
          color: NG.slateVeil,
          margin: "0 0 24px",
        }}
      >
        {hasProviderFilter
          ? "No benefits from this provider in the current filter. Try another category or clear the filter."
          : hasPersonalityFilter
            ? "Your taste result narrows the marketplace. Try All or retake the matcher."
            : "We're adding more perks each quarter."}
      </p>
      <button type="button" className="ng-pill-btn" style={{ width: "auto", padding: "10px 24px" }} onClick={onReset}>
        Show everything
      </button>
    </div>
  );
}
