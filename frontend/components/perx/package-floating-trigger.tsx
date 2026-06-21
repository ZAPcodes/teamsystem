"use client";

import * as React from "react";
import { motion, AnimatePresence } from "@/lib/motion";
import { usePackageStore, selectDisplayTotal, selectLineCount } from "@/lib/store/package";
import { formatMoney } from "@/lib/utils";

interface PackageFloatingTriggerProps {
  onOpen: () => void;
}

/**
 * Floating pill at bottom-right — visible only when package has >=1 line.
 * Ink fill, white text, 100px radius, no shadow.
 * On first appearance: 4px rise + fade-in (240ms).
 * On count change: counter does a vertical roll (200ms).
 */
export function PackageFloatingTrigger({ onOpen }: PackageFloatingTriggerProps) {
  const count = usePackageStore(selectLineCount);
  const total = usePackageStore(selectDisplayTotal);

  const prefersReduced =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="floating-trigger"
          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: 4 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 50,
          }}
        >
          <button
            onClick={onOpen}
            aria-label={`Open package — ${count} item${count !== 1 ? "s" : ""}, ${formatMoney(total, "ALL")}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              borderRadius: "100px",
              backgroundColor: "#010110",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-inter), sans-serif",
              fontWeight: 500,
              fontSize: "15px",
              letterSpacing: "-0.02em",
              transition: prefersReduced ? "none" : "background-color 120ms ease",
            }}
            onMouseEnter={(e) => {
              if (!prefersReduced) e.currentTarget.style.backgroundColor = "#1a1a22";
            }}
            onMouseLeave={(e) => {
              if (!prefersReduced) e.currentTarget.style.backgroundColor = "#010110";
            }}
          >
            <span>Package</span>

            {/* Counter roll */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.15)",
                fontSize: "12px",
                fontWeight: 700,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={count}
                  initial={prefersReduced ? false : { y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={prefersReduced ? undefined : { y: -12, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  style={{ display: "block", lineHeight: 1 }}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </span>

            <span
              className="tabular-nums"
              style={{ opacity: 0.75, fontSize: "14px" }}
            >
              · {formatMoney(total, "ALL")}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
