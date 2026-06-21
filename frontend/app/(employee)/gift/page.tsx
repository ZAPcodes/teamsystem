"use client";

import * as React from "react";
import { useColleagues, sendGift } from "@/lib/hooks/use-engagement";
import { useAllowance } from "@/lib/hooks/use-allowance";
import { toast } from "sonner";
import { EmployeePageShell, EmployeeDisplayTitle } from "@/components/perx/employee-page-shell";
import { BoxCardButton } from "@/components/perx/box-card-primitives";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";

const GIFT_AMOUNTS = [500, 1000, 2000, 5000];

export default function GiftPage() {
  const colleagues = useColleagues();
  const { allowance } = useAllowance();
  const [toUserId, setToUserId] = React.useState("");
  const [amount, setAmount] = React.useState(1000);
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const currency = allowance?.currency ?? "ALL";
  const selectedColleague = colleagues.find((c) => c.id === toUserId);

  const handleSend = async () => {
    if (!toUserId || !allowance) return;
    setLoading(true);
    try {
      await sendGift({
        toUserId,
        amount,
        currency,
        message: message || "A perk from a colleague",
      });
      toast.success(`Gift sent to ${selectedColleague?.name ?? "your colleague"}!`);
      setMessage("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gift-page-shell">
      <EmployeePageShell>
        <EmployeeDisplayTitle gradientTail="colleague.">
          Send a perk to a
        </EmployeeDisplayTitle>
        <p
          style={{
            fontFamily: NG.fontBody,
            fontSize: "16px",
            lineHeight: 1.4,
            color: NG.slateVeil,
            margin: "0 0 40px",
            maxWidth: "520px",
          }}
        >
          Transfer allowance credit with a note — they can spend it on any marketplace perk.
        </p>

        <div className="gift-page-grid">
          {/* Preview card */}
          <aside className="ng-box-card ng-box-card--elevated gift-preview-card" aria-label="Gift preview">
            <div className="gift-preview-glow" aria-hidden="true" />
            <p
              style={{
                fontFamily: NG.fontBody,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
                margin: "0 0 8px",
              }}
            >
              Gift preview
            </p>
            <p
              className="tabular-nums"
              style={{
                fontFamily: NG.fontBody,
                fontSize: "42px",
                fontWeight: 570,
                lineHeight: 1,
                letterSpacing: "-1.2px",
                color: "#ffffff",
                margin: "0 0 12px",
              }}
            >
              {formatMoney(amount, currency)}
            </p>
            <p style={{ fontFamily: NG.fontBody, fontSize: "15px", color: "rgba(255,255,255,0.92)", margin: "0 0 20px", lineHeight: 1.4 }}>
              {message.trim() || "A perk from a colleague"}
            </p>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <p style={{ fontFamily: NG.fontBody, fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>
                To
              </p>
              <p style={{ fontFamily: NG.fontBody, fontSize: "16px", fontWeight: 570, color: "#fff", margin: 0 }}>
                {selectedColleague?.name ?? "Pick a colleague"}
              </p>
            </div>
          </aside>

          {/* Form */}
          <div className="ng-box-card ng-box-card--elevated gift-form-card">
            <h2 className="ng-section-title" style={{ fontSize: "22px", margin: "0 0 20px" }}>
              Compose gift
            </h2>

            <fieldset style={{ border: "none", margin: "0 0 24px", padding: 0 }}>
              <legend
                style={{
                  fontFamily: NG.fontBody,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: NG.slateVeil,
                  marginBottom: "12px",
                }}
              >
                Choose colleague
              </legend>
              <div className="gift-colleague-grid">
                {colleagues.map((c) => {
                  const active = toUserId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`gift-colleague-chip${active ? " gift-colleague-chip--active" : ""}`}
                      onClick={() => setToUserId(c.id)}
                    >
                      <span className="gift-colleague-avatar">{c.initials ?? c.name.slice(0, 2).toUpperCase()}</span>
                      <span style={{ fontFamily: NG.fontBody, fontSize: "14px", fontWeight: active ? 570 : 400 }}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset style={{ border: "none", margin: "0 0 24px", padding: 0 }}>
              <legend
                style={{
                  fontFamily: NG.fontBody,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: NG.slateVeil,
                  marginBottom: "12px",
                }}
              >
                Amount
              </legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {GIFT_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`gift-amount-chip${amount === value ? " gift-amount-chip--active" : ""}`}
                    onClick={() => setAmount(value)}
                  >
                    {formatMoney(value, currency)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label style={{ display: "block", marginBottom: "24px" }}>
              <span
                style={{
                  display: "block",
                  fontFamily: NG.fontBody,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: NG.slateVeil,
                  marginBottom: "8px",
                }}
              >
                Personal note
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Thanks for covering my shift — treat yourself to lunch."
                className="gift-textarea"
              />
            </label>

            <BoxCardButton disabled={loading || !toUserId} onClick={() => void handleSend()}>
              {loading ? "Sending…" : "Send gift"}
            </BoxCardButton>
          </div>
        </div>
      </EmployeePageShell>
    </main>
  );
}
