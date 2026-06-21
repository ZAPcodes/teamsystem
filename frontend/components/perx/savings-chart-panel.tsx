"use client";

import * as React from "react";
import { AnimatePresence, motion } from "@/lib/motion";
import { formatMoney } from "@/lib/utils";
import { useWrapped } from "@/lib/hooks/use-engagement";
import { quarterLabel } from "@/lib/api/contracts";

interface SavingsChartPanelProps {
  spentALL: number;
  quarterResetAt?: string;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar"];

function wellnessBlurb(topCategory: string | undefined): string {
  const cat = (topCategory ?? "").toLowerCase();
  if (cat.includes("wellness") || cat.includes("fit")) return "and got fit!";
  if (cat.includes("travel")) return "and explored more!";
  if (cat.includes("food")) return "and ate well!";
  if (cat.includes("learning")) return "and leveled up!";
  return "and made the most of it!";
}

function buildBars(spent: number): { label: string; value: number }[] {
  const weights = [0.18, 0.28, 0.54];
  return MONTH_LABELS.map((label, i) => ({
    label,
    value: Math.round(spent * weights[i]),
  }));
}

function SparkDoodle({ size = 112 }: { size?: number }) {
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

export function SavingsChartPanel({ spentALL, quarterResetAt }: SavingsChartPanelProps) {
  const [expanded, setExpanded] = React.useState(false);
  const { wrapped } = useWrapped();

  const saved = wrapped?.savedAmount ?? spentALL;
  const bars = React.useMemo(() => buildBars(saved), [saved]);
  const maxBar = Math.max(...bars.map((b) => b.value), 1);
  const quarter = quarterResetAt ? quarterLabel(quarterResetAt) : "this quarter";
  const blurb = wellnessBlurb(wrapped?.topCategory);

  const linePoints = bars
    .map((bar, i) => {
      const x = 12 + i * 38;
      const y = 88 - (bar.value / maxBar) * 64;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <>
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(1,1,16,0.08)",
              zIndex: 40,
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <section
        aria-label="Quarter savings chart"
        style={{
          position: expanded ? "fixed" : "relative",
          top: expanded ? 0 : undefined,
          right: expanded ? 0 : undefined,
          bottom: expanded ? 0 : undefined,
          width: expanded ? "66.666vw" : "100%",
          maxWidth: expanded ? "66.666vw" : "100%",
          zIndex: expanded ? 50 : 1,
          border: "1px solid rgba(1,1,16,0.12)",
          borderRadius: expanded ? "0" : "8px",
          borderRight: expanded ? "none" : undefined,
          backgroundColor: "#ffffff",
          overflow: "hidden",
          transition: "max-width 200ms ease, border-radius 200ms ease",
          boxShadow: expanded ? "-12px 0 48px rgba(1,1,16,0.08)" : "none",
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{
            width: "100%",
            minHeight: expanded ? "auto" : "320px",
            padding: "22px",
            border: 0,
            backgroundColor: "#ffffff",
            color: "#010110",
            cursor: "pointer",
            textAlign: "left",
            display: "grid",
            gridTemplateColumns: expanded ? "minmax(0, 1fr) 112px" : "1fr",
            gap: "18px",
            alignItems: "center",
          }}
        >
          <span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#73737c",
                marginBottom: "8px",
              }}
            >
              Quarter pulse
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-display), Georgia, serif",
                fontVariationSettings: "'wght' 450, 'opsz' 28",
                fontSize: "26px",
                lineHeight: 1.12,
                letterSpacing: "-0.52px",
              }}
            >
              Your savings {quarter.toLowerCase()}.
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "14px",
                lineHeight: 1.5,
                letterSpacing: "-0.28px",
                color: "#73737c",
                marginTop: "10px",
              }}
            >
              You&apos;ve saved{" "}
              <strong style={{ color: "#010110", fontWeight: 600 }}>{formatMoney(saved, "ALL")}</strong>{" "}
              {quarter.toLowerCase()} {blurb}
            </span>
          </span>
          <span style={{ justifySelf: expanded ? "end" : "start" }}>
            <SparkDoodle size={expanded ? 112 : 88} />
          </span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="chart-body"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{
                borderTop: "1px solid rgba(1,1,16,0.08)",
                padding: "28px 32px 40px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "28px",
                  gap: "16px",
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
                    color: "#73737c",
                    margin: 0,
                  }}
                >
                  Analysis complete
                </p>
                <p
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "13px",
                    color: "#73737c",
                    margin: 0,
                  }}
                >
                  Budget deployed · {formatMoney(spentALL, "ALL")} of allowance
                </p>
              </div>

              <div
                style={{
                  position: "relative",
                  height: "220px",
                  padding: "0 8px",
                }}
              >
                <svg
                  viewBox="0 0 120 100"
                  preserveAspectRatio="none"
                  style={{
                    position: "absolute",
                    left: "8%",
                    right: "8%",
                    top: "24px",
                    height: "140px",
                    width: "84%",
                    overflow: "visible",
                  }}
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="#635bff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={linePoints}
                  />
                  {linePoints.split(" ").map((pt, i) => {
                    const [x, y] = pt.split(",").map(Number);
                    return <circle key={i} cx={x} cy={y} r="2.5" fill="#635bff" />;
                  })}
                </svg>

                <div
                  style={{
                    position: "absolute",
                    inset: "24px 8% 32px",
                    display: "grid",
                    gridTemplateColumns: `repeat(${bars.length}, 1fr)`,
                    alignItems: "end",
                    gap: "16px",
                  }}
                >
                  {bars.map((bar, i) => {
                    const heightPct = (bar.value / maxBar) * 100;
                    return (
                      <div
                        key={bar.label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                          height: "100%",
                          justifyContent: "flex-end",
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          style={{
                            width: "100%",
                            maxWidth: "56px",
                            height: `${heightPct}%`,
                            minHeight: "8px",
                            borderRadius: "6px 6px 2px 2px",
                            background:
                              "linear-gradient(180deg, rgba(99,91,255,0.85) 0%, rgba(99,91,255,0.35) 100%)",
                            transformOrigin: "bottom center",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-inter), sans-serif",
                            fontSize: "11px",
                            color: "#73737c",
                          }}
                        >
                          {bar.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {wrapped && (
                <div
                  style={{
                    marginTop: "24px",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  <Stat label="Top category" value={wrapped.topCategory} />
                  <Stat label="Redemptions" value={String(wrapped.redeemedCount)} />
                  <Stat label="Persona" value={wrapped.persona} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: "8px",
        border: "1px solid rgba(1,1,16,0.08)",
        backgroundColor: "rgba(1,1,16,0.02)",
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
      <p
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: "16px",
          margin: 0,
          color: "#010110",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}
