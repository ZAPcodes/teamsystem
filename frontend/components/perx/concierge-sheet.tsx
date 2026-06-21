"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { askConcierge, getConciergeGreeting } from "@/lib/hooks/use-engagement";
import { useAllowance } from "@/lib/hooks/use-allowance";
import { usePackageStore } from "@/lib/store/package";
import { apiGet } from "@/lib/api/client";
import { offerDTOtoOffer, type OfferDTO, type PackageDTO, type BenefitRequestItemDTO, type DemandPoolDTO } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  packageDraft?: PackageDTO;
  fallbackUsed?: boolean;
  benefitItems?: BenefitRequestItemDTO[];
  demandPool?: DemandPoolDTO;
}

interface ConciergeSheetProps {
  open: boolean;
  onClose: () => void;
  launchPrompt?: string | null;
}

export function ConciergeSheet({ open, onClose, launchPrompt }: ConciergeSheetProps) {
  const { t, locale } = useTranslation();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [greetingLoaded, setGreetingLoaded] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = React.useState<
    Array<{ label: string; title: string; summary: string; total: number; packageDraft: PackageDTO }>
  >([]);
  const { allowance } = useAllowance();
  const currency = allowance?.currency ?? "ALL";
  const addLine = usePackageStore((s) => s.addLine);
  const clear = usePackageStore((s) => s.clear);
  const setSource = usePackageStore((s) => s.setSource);
  const requestOpenBuilder = usePackageStore((s) => s.requestOpenBuilder);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const suggestionsList = React.useMemo(
    () => [
      t("concierge.suggestionRelax"),
      t("concierge.suggestionWeekend"),
      t("concierge.suggestionLearn"),
      t("concierge.suggestionPottery"),
    ],
    [t]
  );

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const launchedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) {
      launchedRef.current = null;
      setGreetingLoaded(false);
      setMessages([]);
      setSuggestions([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || greetingLoaded) return;
    (async () => {
      try {
        const greeting = await getConciergeGreeting();
        setSuggestions(greeting.suggestions);
        setMessages([{ role: "assistant", text: greeting.openingMessage }]);
        setGreetingLoaded(true);
      } catch {
        setMessages([
          {
            role: "assistant",
            text:
              locale === "sq"
                ? "Përshëndetje! Thuaj çfarë dëshiron dhe do të përgatis një paketë përfitimesh."
                : "Hi! Tell me what you're in the mood for and I'll bundle perks from your budget.",
          },
        ]);
        setGreetingLoaded(true);
      }
    })();
  }, [open, greetingLoaded, locale]);

  const materializeBundle = async (result: { packageDraft: PackageDTO; reason: string }) => {
    const offerIds = result.packageDraft.lines.map((l) => l.offerId);
    const catalog = await apiGet<{ offers: OfferDTO[] }>("/offers");
    const byId = new Map(catalog.offers.map((o) => [o.id, o]));

    clear();
    setSource("ai", result.reason);

    for (const line of result.packageDraft.lines) {
      const dto = byId.get(line.offerId);
      if (dto) {
        addLine(offerDTOtoOffer(dto));
        continue;
      }
      addLine({
        id: line.offerId,
        provider: { id: line.providerId, name: line.providerName, location: "" },
        category: "lifestyle",
        title: line.title,
        description: line.title,
        priceALL: line.price,
        imageUrl: "",
      });
    }

    if (offerIds.length > 0 && usePackageStore.getState().lines.length === 0) {
      throw new Error("Could not load the suggested perks — try asking Bora again.");
    }
  };

  const handleSend = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);

    try {
      const result = await askConcierge(message, allowance?.available);
      if (result.kind === "demand_generation" && result.demandPool) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: result.message,
            demandPool: result.demandPool,
          },
        ]);
        toast.success(t("concierge.demandPool"));
      } else if (result.kind === "off_catalog" && result.benefitRequest) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: result.message,
            benefitItems: result.benefitRequest?.items,
          },
        ]);
        toast.success(t("concierge.forwarded"));
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: result.message,
            packageDraft: result.packageDraft,
            fallbackUsed: result.fallbackUsed,
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: (e as Error).message }]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!open || !launchPrompt?.trim() || !greetingLoaded) return;
    if (launchedRef.current === launchPrompt) return;
    launchedRef.current = launchPrompt;
    void handleSend(launchPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, launchPrompt, greetingLoaded]);

  const handleAddToPackage = async (msg: ChatMessage) => {
    if (!msg.packageDraft) return;
    try {
      await materializeBundle({
        packageDraft: msg.packageDraft,
        reason: msg.text.replace(" (curated pick)", ""),
      });
      toast.success(t("concierge.bundleAdded"));
      onClose();
      requestOpenBuilder();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handlePickSuggestion = async (packageDraft: PackageDTO, summary: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", text: summary },
      { role: "assistant", text: summary, packageDraft },
    ]);
  };

  if (!open) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          style={{ position: "fixed", inset: 0, background: "rgba(1,1,16,0.25)", zIndex: 100 }}
        />
        <DialogPrimitive.Content
          aria-label="Bora concierge"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: "85vh",
            background: "#ffffff",
            borderTop: "1px solid rgba(1,1,16,0.12)",
            zIndex: 101,
            display: "flex",
            flexDirection: "column",
            outline: "none",
          }}
        >
          <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid rgba(1,1,16,0.08)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "26px", margin: 0, color: "#010110" }}>
                {t("concierge.title")}
              </h2>
              {allowance && (
                <span style={{ fontFamily: "var(--font-inter)", fontSize: "13px", color: "#73737c" }}>
                  {formatMoney(allowance.available, currency)} {t("concierge.left")}
                </span>
              )}
            </div>
            <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c", margin: "8px 0 0" }}>
              {t("concierge.subtitle")}
            </p>
          </div>

          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {messages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    backgroundColor: msg.role === "user" ? "#010110" : "rgba(1,1,16,0.04)",
                    color: msg.role === "user" ? "#ffffff" : "#010110",
                    fontFamily: "var(--font-inter)",
                    fontSize: "14px",
                    lineHeight: 1.5,
                    border: msg.role === "assistant" ? "1px solid rgba(1,1,16,0.08)" : "none",
                  }}
                >
                  {msg.text}
                </div>
                {msg.packageDraft && msg.packageDraft.lines.length > 0 && (
                  <PackagePreview
                    packageDraft={msg.packageDraft}
                    currency={currency}
                    onAdd={() => void handleAddToPackage(msg)}
                    t={t}
                  />
                )}
                {msg.benefitItems && msg.benefitItems.length > 0 && (
                  <OffCatalogList items={msg.benefitItems} t={t} />
                )}
                {msg.demandPool && (
                  <DemandPoolPreview pool={msg.demandPool} t={t} />
                )}
              </div>
            ))}

            {greetingLoaded && suggestions.length > 0 && messages.length <= 1 && (
              <div style={{ display: "grid", gap: "8px" }}>
                <p style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#635bff", margin: 0 }}>
                  {t("concierge.pickPackage")}
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => void handlePickSuggestion(s.packageDraft, s.summary)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(1,1,16,0.12)",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "14px", margin: "0 0 4px", color: "#010110" }}>
                      {s.title}
                    </p>
                    <p style={{ fontFamily: "var(--font-inter)", fontSize: "13px", margin: "0 0 6px", color: "#73737c" }}>
                      {s.summary}
                    </p>
                    <p className="tabular-nums" style={{ fontFamily: "var(--font-inter)", fontSize: "13px", margin: 0, color: "#635bff" }}>
                      {formatMoney(s.total, currency)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c" }}>
                {t("concierge.thinking")}
              </p>
            )}
          </div>

          <div style={{ padding: "12px 24px 24px", borderTop: "1px solid rgba(1,1,16,0.08)", flexShrink: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              {suggestionsList.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void handleSend(s)}
                  disabled={loading}
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "12px",
                    padding: "6px 12px",
                    borderRadius: "100px",
                    border: "1px solid rgba(1,1,16,0.15)",
                    background: "transparent",
                    color: "#73737c",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={t("concierge.placeholder")}
                style={{
                  flex: 1,
                  border: "1px solid rgba(1,1,16,0.15)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontFamily: "var(--font-inter)",
                  fontSize: "14px",
                }}
              />
              <Button variant="primary" disabled={loading || !input.trim()} onClick={() => void handleSend()}>
                {t("concierge.send")}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PackagePreview({
  packageDraft,
  currency,
  onAdd,
  t,
}: {
  packageDraft: PackageDTO;
  currency: string;
  onAdd: () => void;
  t: (key: string) => string;
}) {
  return (
    <div style={{ marginTop: "10px", padding: "12px", border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", background: "#ffffff" }}>
      <p style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: "10px", letterSpacing: "0.04em", textTransform: "uppercase", color: "#635bff", margin: "0 0 8px" }}>
        {t("concierge.composedBy")}
      </p>
      {packageDraft.lines.map((line) => (
        <div key={line.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontFamily: "var(--font-inter)", fontSize: "13px", marginBottom: "6px" }}>
          <span style={{ color: "#010110" }}>
            {line.title}
            <span style={{ color: "#73737c" }}> · {line.providerName}</span>
          </span>
          <span className="tabular-nums">{formatMoney(line.price, currency)}</span>
        </div>
      ))}
      <p style={{ fontFamily: "var(--font-inter)", fontWeight: 500, fontSize: "14px", margin: "8px 0 12px", color: "#010110" }}>
        {t("concierge.total")} {formatMoney(packageDraft.totalSnapshot, currency)}
      </p>
      <Button variant="primary" style={{ width: "100%" }} onClick={onAdd}>
        {t("concierge.addToPackage")}
      </Button>
    </div>
  );
}

function OffCatalogList({
  items,
  t,
}: {
  items: BenefitRequestItemDTO[];
  t: (key: string) => string;
}) {
  return (
    <div style={{ marginTop: "10px", padding: "12px", border: "1px solid rgba(99,91,255,0.2)", borderRadius: "8px", background: "rgba(99,91,255,0.04)" }}>
      <p style={{ fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: "10px", letterSpacing: "0.04em", textTransform: "uppercase", color: "#635bff", margin: "0 0 10px" }}>
        {t("concierge.offCatalogTitle")}
      </p>
      {items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: idx < items.length - 1 ? "1px solid rgba(1,1,16,0.08)" : "none" }}>
          <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "14px", margin: "0 0 4px", color: "#010110" }}>{item.name}</p>
          <p style={{ fontFamily: "var(--font-inter)", fontSize: "13px", margin: "0 0 6px", color: "#73737c" }}>{item.description}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontFamily: "var(--font-inter)", fontSize: "12px" }}>
            {item.link && (
              <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "#635bff" }}>
                {item.link.replace(/^https?:\/\//, "")}
              </a>
            )}
            {item.phone && <span style={{ color: "#010110" }}>{item.phone}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DemandPoolPreview({
  pool,
  t,
}: {
  pool: DemandPoolDTO;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div
      style={{
        marginTop: "10px",
        padding: "14px",
        border: "1px solid rgba(1,1,16,0.12)",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: 700,
          fontSize: "10px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#010110",
          margin: "0 0 12px",
        }}
      >
        {t("concierge.demandPoolTitle")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
        <StatPill label={t("concierge.demandPoolYou")} value={formatMoney(pool.yourContribution, pool.currency)} />
        <StatPill label={t("concierge.demandPoolPooled")} value={formatMoney(pool.totalPooled, pool.currency)} />
        <StatPill label={t("concierge.demandPoolColleagues")} value={String(pool.employeeCount)} />
        <StatPill label={t("concierge.demandPoolOutreach")} value={String(pool.providersContacted)} />
      </div>

      <p
        style={{
          fontFamily: "var(--font-inter)",
          fontWeight: 700,
          fontSize: "10px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#73737c",
          margin: "0 0 8px",
        }}
      >
        {t("concierge.demandPoolSourcing")}
      </p>
      {pool.providers.map((provider, idx) => (
        <div
          key={idx}
          style={{
            marginBottom: idx < pool.providers.length - 1 ? "10px" : 0,
            paddingBottom: idx < pool.providers.length - 1 ? "10px" : 0,
            borderBottom: idx < pool.providers.length - 1 ? "1px solid rgba(1,1,16,0.08)" : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
            <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "14px", margin: 0, color: "#010110" }}>
              {provider.name}
            </p>
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: "11px",
                color: provider.outreachStatus === "sent" ? "#010110" : "#73737c",
              }}
            >
              {provider.outreachStatus === "sent" ? "Email sent" : "Queued"}
            </span>
          </div>
          {provider.address && (
            <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", margin: "4px 0", color: "#73737c" }}>
              {provider.address}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontFamily: "var(--font-inter)", fontSize: "12px" }}>
            {provider.mapsUrl && (
              <a href={provider.mapsUrl} target="_blank" rel="noreferrer" style={{ color: "#010110", textDecoration: "underline" }}>
                Maps
              </a>
            )}
            {provider.phone && <span style={{ color: "#010110" }}>{provider.phone}</span>}
            {provider.email && <span style={{ color: "#73737c" }}>{provider.email}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(1,1,16,0.04)" }}>
      <p style={{ fontFamily: "var(--font-inter)", fontSize: "10px", color: "#73737c", margin: "0 0 4px" }}>{label}</p>
      <p className="tabular-nums" style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "14px", margin: 0, color: "#010110" }}>
        {value}
      </p>
    </div>
  );
}
