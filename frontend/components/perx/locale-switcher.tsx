"use client";

import * as React from "react";
import { useTranslation } from "@/lib/i18n/use-translation";

export function LocaleSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      className="ng-locale-switcher"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        width: "72px",
        flexShrink: 0,
        justifyContent: "flex-end",
      }}
      aria-label="Language"
    >
      {(["en", "sq"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => void setLocale(code)}
          aria-pressed={locale === code}
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            width: "32px",
            padding: "5px 0",
            borderRadius: "100px",
            border: "1px solid rgba(1,1,16,0.12)",
            backgroundColor: locale === code ? "#010110" : "transparent",
            color: locale === code ? "#ffffff" : "#73737c",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
