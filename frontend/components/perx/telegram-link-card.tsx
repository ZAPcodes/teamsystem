"use client";

import * as React from "react";
import { useTelegramLink } from "@/lib/hooks/use-engagement";
import { NG } from "@/lib/new-genre/tokens";

export function TelegramLinkCard() {
  const { status, loading, generating, error, generateCode, refresh } = useTelegramLink();
  const [code, setCode] = React.useState<{ value: string; expiresAt: string } | null>(null);

  const handleGenerate = async () => {
    const result = await generateCode();
    if (result) {
      setCode({ value: result.code, expiresAt: result.expiresAt });
    }
  };

  const botHandle = status?.botUsername ? `@${status.botUsername.replace(/^@/, "")}` : "@PerxBenefitsBot";
  const expiresLabel = code
    ? new Date(code.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section
      style={{
        border: "1px solid rgba(1,1,16,0.12)",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "24px",
        backgroundColor: "#ffffff"
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#635bff",
          margin: "0 0 8px"
        }}
      >
        Headless Telegram
      </p>
      <h3
        style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: "22px",
          margin: "0 0 8px",
          color: "#010110"
        }}
      >
        Chat with Perx on Telegram
      </h3>
      <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: "0 0 16px" }}>
        Check balances and grab lunch passes from messenger. Link once with a one-time code, then ask naturally.
      </p>

      {loading ? (
        <p style={{ fontSize: "14px", color: "#73737c", margin: 0 }}>Checking link status…</p>
      ) : status?.linked ? (
        <div
          style={{
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "rgba(99,91,255,0.08)",
            border: "1px solid rgba(99,91,255,0.2)"
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "#010110", fontWeight: 600 }}>
            Linked to {botHandle}
          </p>
          {status.linkedAt ? (
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#73737c" }}>
              Connected {new Date(status.linkedAt).toLocaleString()}
            </p>
          ) : null}
          <button
            type="button"
            className="ng-pill-btn"
            style={{ marginTop: "12px" }}
            onClick={() => void refresh()}
          >
            Refresh status
          </button>
        </div>
      ) : (
        <>
          <ol
            style={{
              margin: "0 0 16px",
              paddingLeft: "18px",
              fontFamily: NG.fontBody,
              fontSize: "14px",
              color: "#010110",
              lineHeight: 1.5
            }}
          >
            <li>
              Open {botHandle} in Telegram and send <strong>/start</strong>
            </li>
            <li>Generate a code below and send the 6 digits to the bot</li>
            <li>Try &quot;What&apos;s my balance?&quot; or &quot;I&apos;m at Artigiano, grab me a 1,500 ALL lunch pass.&quot;</li>
          </ol>

          {code ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px dashed rgba(99,91,255,0.45)",
                backgroundColor: "rgba(99,91,255,0.05)",
                marginBottom: "12px"
              }}
            >
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "28px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  color: "#635bff"
                }}
              >
                {code.value}
              </span>
              <span style={{ fontSize: "13px", color: "#73737c" }}>Expires {expiresLabel}</span>
            </div>
          ) : null}

          {error ? (
            <p style={{ color: "#b42318", fontSize: "13px", margin: "0 0 12px" }}>{error}</p>
          ) : null}

          <button
            type="button"
            className="ng-box-btn"
            disabled={generating}
            onClick={() => void handleGenerate()}
          >
            {generating ? "Generating…" : code ? "Generate new code" : "Generate link code"}
          </button>
        </>
      )}
    </section>
  );
}
