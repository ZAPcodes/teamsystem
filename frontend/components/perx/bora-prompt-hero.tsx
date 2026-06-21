"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { usePackageStore, selectLineCount } from "@/lib/store/package";

const PROMPT_IDEAS = [
  "I feel like going to Barcelona this weekend",
  "I need a gym membership and meal prep",
  "A quiet spa day to reset",
  "Something social for Friday night",
  "Learning Italian before summer",
  "A coastal trip under 8,000 ALL",
];

function SparkDoodle({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" fill="none" aria-hidden="true">
      <path
        d="M31 31c16-18 48-12 52 14 4 27-26 43-48 31"
        stroke="#010110"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M30 74c8 11 23 18 41 11" stroke="#635bff" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M25 50h16M33 42v16M78 25l4 8 8 4-8 4-4 8-4-8-8-4 8-4z"
        stroke="#010110"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useTypewriter(ideas: string[], paused: boolean) {
  const [ideaIndex, setIdeaIndex] = React.useState(0);
  const [text, setText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;

    const full = ideas[ideaIndex];
    const tick = () => {
      if (!deleting) {
        const next = full.slice(0, text.length + 1);
        setText(next);
        if (next === full) {
          window.setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        const next = full.slice(0, Math.max(0, text.length - 1));
        setText(next);
        if (next.length === 0) {
          setDeleting(false);
          setIdeaIndex((i) => (i + 1) % ideas.length);
        }
      }
    };

    const delay = deleting ? 28 : 42;
    const id = window.setTimeout(tick, delay);
    return () => window.clearTimeout(id);
  }, [deleting, ideaIndex, ideas, paused, text]);

  return { text, full: ideas[ideaIndex] };
}

interface BoraPromptHeroProps {
  onSubmit: (message: string) => void;
  loading?: boolean;
  variant?: "default" | "new-genre";
}

export function BoraPromptHero({ onSubmit, loading, variant = "default" }: BoraPromptHeroProps) {
  const isNG = variant === "new-genre";
  const packageCount = usePackageStore(selectLineCount);
  const bubbleBottom = packageCount > 0 ? 96 : 28;
  const ink = isNG ? "#0c1018" : "#010110";
  const fog = isNG ? "#6d7074" : "#73737c";
  const border = isNG ? "rgba(158,159,163,0.5)" : "rgba(1,1,16,0.12)";
  const heroRef = React.useRef<HTMLElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [placeholderHeld, setPlaceholderHeld] = React.useState(false);

  const showTypewriter = !value && !focused && !placeholderHeld;
  const { text: typewriterText, full: currentIdea } = useTypewriter(PROMPT_IDEAS, !showTypewriter);

  React.useEffect(() => {
    const node = heroRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: "-72px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const expandFromBubble = React.useCallback(() => {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => inputRef.current?.focus(), 320);
  }, []);

  const acceptSuggestion = React.useCallback(() => {
    const textToHold = typewriterText.trim().length > 0 ? typewriterText : currentIdea;
    if (!textToHold) return;
    setValue(textToHold);
    setPlaceholderHeld(true);
    inputRef.current?.focus();
  }, [currentIdea, typewriterText]);

  const handleSubmit = React.useCallback(() => {
    const message = value.trim();
    if (!message || loading) return;
    onSubmit(message);
  }, [loading, onSubmit, value]);

  return (
    <>
      <section
        ref={heroRef}
        aria-label="Ask Bora"
        className="animate-settle"
        style={{
          width: "100%",
          border: isNG ? `1px solid ${border}` : "1px solid rgba(1,1,16,0.12)",
          borderRadius: isNG ? "16px" : "8px",
          backgroundColor: isNG ? "rgba(255,255,255,0.88)" : "#ffffff",
          overflow: "hidden",
          backdropFilter: isNG ? "blur(8px)" : undefined,
        }}
      >
        <div
          style={{
            padding: "22px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 72px",
            gap: "18px",
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: fog,
                marginBottom: "8px",
              }}
            >
              Bora concierge
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display), Georgia, serif",
                fontVariationSettings: "'wght' 450, 'opsz' 28",
                fontSize: "clamp(22px, 3vw, 28px)",
                lineHeight: 1.12,
                letterSpacing: "-0.52px",
                color: ink,
                margin: "0 0 10px",
              }}
            >
              Tell Bora what you&apos;re in the mood for.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "14px",
                lineHeight: 1.5,
                letterSpacing: "-0.28px",
                color: fog,
                margin: 0,
              }}
            >
              Type freely or press Tab to keep a suggestion — Bora bundles real perks from your budget.
            </p>
          </div>
          <SparkDoodle />
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(1,1,16,0.08)",
            padding: "18px 22px 22px",
          }}
        >
          <div style={{ position: "relative" }}>
            {showTypewriter && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: "12px 14px",
                  pointerEvents: "none",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "15px",
                  color: fog,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {typewriterText}
                <span
                  className="bora-caret"
                  style={{
                    display: "inline-block",
                    width: "2px",
                    height: "1em",
                    marginLeft: "2px",
                    backgroundColor: "#635bff",
                    verticalAlign: "text-bottom",
                  }}
                />
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (e.target.value) setPlaceholderHeld(true);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  if (!value.trim()) {
                    acceptSuggestion();
                  }
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              aria-label="Describe the perk you want"
              style={{
                width: "100%",
                border: "1px solid rgba(1,1,16,0.15)",
                borderRadius: "100px",
                padding: "12px 18px",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "15px",
                color: ink,
                backgroundColor: "#ffffff",
                outline: "none",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "12px",
                color: fog,
              }}
            >
              Tab holds the placeholder · Enter sends to Bora
            </span>
            <Button
              variant="primary"
              disabled={!value.trim() || loading}
              onClick={handleSubmit}
              style={{ borderRadius: "100px", paddingInline: "20px" }}
            >
              {loading ? "Thinking…" : "Ask Bora"}
            </Button>
          </div>
        </div>
      </section>

      {collapsed && (
        <button
          type="button"
          onClick={expandFromBubble}
          aria-label="Open Bora prompt"
          style={{
            position: "fixed",
            bottom: `${bubbleBottom}px`,
            right: "28px",
            left: "auto",
            zIndex: 45,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 22px 14px 16px",
            borderRadius: "100px",
            border: "1px solid rgba(1,1,16,0.12)",
            backgroundColor: "#ffffff",
            boxShadow: "0 12px 40px rgba(1,1,16,0.14)",
            cursor: "pointer",
            maxWidth: "min(440px, calc(100vw - 56px))",
            animation: "settle-in 400ms ease forwards",
          }}
        >
          <span
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(99,91,255,0.12)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <SparkDoodle size={28} />
          </span>
          <span
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "15px",
              fontWeight: 500,
              color: "#010110",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value.trim() || typewriterText || "Ask Bora…"}
          </span>
        </button>
      )}

    </>
  );
}
