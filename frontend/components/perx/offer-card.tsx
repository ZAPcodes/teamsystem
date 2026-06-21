"use client";

import * as React from "react";
import { motion, AnimatePresence } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { usePackageStore, selectHasOffer } from "@/lib/store/package";
import type { Offer } from "@/lib/api/contracts";

interface OfferCardProps {
  offer: Offer;
}

/**
 * Perx Offer Card -- design.md section 6.
 * 8px radius, 1px hairline border (Ink @12%), white surface, NO shadow.
 * Image: 16:10 aspect, object-cover. Provider: label style. Title: Fraunces 450.
 * Hover: border darkens to Ink @25% + translateY(-1px), 120ms.
 * Add button: connects to Zustand store, shows Added check for 1.2s.
 * Reduced motion: instant state changes, no translate.
 */
export function OfferCard({ offer }: OfferCardProps) {
  const addLine = usePackageStore((s) => s.addLine);
  const alreadyAdded = usePackageStore(selectHasOffer(offer.id));

  const [flashAdded, setFlashAdded] = React.useState(false);
  const [borderColor, setBorderColor] = React.useState("rgba(1,1,16,0.12)");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const handleAdd = React.useCallback(() => {
    addLine(offer);
    setFlashAdded(true);

    // Border flash: Ink @40% for 200ms
    setBorderColor("rgba(1,1,16,0.40)");
    setTimeout(() => setBorderColor("rgba(1,1,16,0.12)"), 200);

    // "Added" label for 1.2s (stays disabled if still in package)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlashAdded(false), 1200);
  }, [addLine, offer]);

  React.useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const buttonLabel = alreadyAdded ? "In package" : flashAdded ? "Added" : "Add";

  return (
    <article
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: `1px solid ${borderColor}`,
        overflow: "hidden",
        transition: prefersReduced ? "none" : "border-color 120ms ease, transform 120ms ease",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        if (prefersReduced) return;
        e.currentTarget.style.borderColor = "rgba(1,1,16,0.25)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (prefersReduced) return;
        e.currentTarget.style.borderColor = borderColor;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Offer image -- 16:10 aspect */}
      <div
        style={{
          aspectRatio: "16 / 10",
          overflow: "hidden",
          borderRadius: "8px 8px 0 0",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {(offer.urgencyLabel || offer.visibility === "exclusive") && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              zIndex: 1,
            }}
          >
            {offer.visibility === "exclusive" && (
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "5px 10px",
                  borderRadius: "100px",
                  backgroundColor: "#010110",
                  color: "#ffffff",
                }}
              >
                Exclusive
              </span>
            )}
            {offer.urgencyLabel && (
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "5px 10px",
                  borderRadius: "100px",
                  backgroundColor: "rgba(99,91,255,0.92)",
                  color: "#ffffff",
                }}
              >
                {offer.urgencyLabel}
              </span>
            )}
          </div>
        )}
        <img
          src={offer.imageUrl}
          alt={offer.title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      {/* Card body */}
      <div
        style={{
          padding: "16px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          flex: 1,
        }}
      >
        {/* Provider name -- label */}
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            lineHeight: 1.2,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#73737c",
            margin: 0,
          }}
        >
          {offer.provider.name}
        </p>

        {/* Title -- Fraunces 450 */}
        <h3
          style={{
            fontFamily: "var(--font-display), Georgia, serif",
            fontVariationSettings: "'wght' 450, 'opsz' 20",
            fontSize: "20px",
            lineHeight: 1.2,
            letterSpacing: "-0.4px",
            color: "#010110",
            margin: 0,
          }}
        >
          {offer.title}
        </h3>

        {/* Description -- body-sm Fog */}
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            lineHeight: 1.5,
            letterSpacing: "-0.28px",
            color: "#73737c",
            margin: 0,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {offer.description}
        </p>

        <div style={{ flex: 1, minHeight: "8px" }} />

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: 500,
              fontSize: "16px",
              letterSpacing: "-0.32px",
              color: "#010110",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMoney(offer.priceALL, "ALL")}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            disabled={alreadyAdded}
            aria-label={
              alreadyAdded
                ? `${offer.title} is already in your package`
                : `Add ${offer.title} to your package`
            }
            style={{ minWidth: "72px" }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={buttonLabel}
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                {alreadyAdded ? "In package" : flashAdded ? "Added" : "Add"}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </article>
  );
}
