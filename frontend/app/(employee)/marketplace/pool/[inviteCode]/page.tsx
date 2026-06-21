"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PackageStub } from "@/components/perx/package-stub";
import { EmployeePageShell, EmployeeDisplayTitle } from "@/components/perx/employee-page-shell";
import { useAllowance } from "@/lib/hooks/use-allowance";
import {
  cancelPooledCart,
  commitToPooledCart,
  getPooledCartByInvite,
} from "@/lib/hooks/use-pooled-cart";
import type { PooledCartDTO } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import { BoxCardButton } from "@/components/perx/box-card-primitives";

export default function PooledCartPage() {
  const params = useParams<{ inviteCode: string }>();
  const inviteCode = params.inviteCode;
  const { allowance } = useAllowance();
  const [cart, setCart] = React.useState<PooledCartDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [committing, setCommitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      const data = await getPooledCartByInvite(inviteCode);
      setCart(data.cart);
    } catch (e) {
      toast.error((e as Error).message);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [inviteCode]);

  React.useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 6000);
    return () => clearInterval(interval);
  }, [refresh]);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${cart?.invitePath ?? `/marketplace/pool/${inviteCode}`}`
      : cart?.invitePath ?? "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCommit = async () => {
    if (!cart) return;
    setCommitting(true);
    try {
      const amount = cart.suggestedContribution;
      const data = await commitToPooledCart(cart.inviteCode, amount);
      setCart(data.cart);
      if (data.cart.status === "locked") {
        toast.success("Pool locked — group QR is ready for everyone!");
      } else {
        toast.success(`Committed ${formatMoney(amount, cart.currency)}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCommitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cart) return;
    try {
      const data = await cancelPooledCart(cart.id);
      setCart(data.cart);
      toast.success("Team pool cancelled — holds released");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const available = allowance?.available ?? 0;
  const canCommit =
    cart?.status === "pending" &&
    !cart.hasCommitted &&
    cart.suggestedContribution <= available &&
    cart.suggestedContribution <= cart.remainingAmount;

  return (
    <main style={{ backgroundColor: NG.parchment, minHeight: "100vh" }}>
      <EmployeePageShell>
        <EmployeeDisplayTitle gradientTail="pool.">Team pool</EmployeeDisplayTitle>

        {loading && !cart ? (
          <div className="shimmer" style={{ height: 240, borderRadius: 16, maxWidth: 640 }} />
        ) : !cart ? (
          <p style={{ fontFamily: NG.fontBody, color: NG.slateVeil }}>Team pool not found.</p>
        ) : (
          <div className="pooled-cart-page" style={{ maxWidth: 640 }}>
            <div className="pooled-cart-page__hero ng-box-card ng-box-card--elevated">
              <p className="pooled-cart-page__eyebrow">{cart.providerName}</p>
              <h2 className="pooled-cart-page__title">{cart.offerTitle}</h2>
              <p className="pooled-cart-page__meta">
                Target {formatMoney(cart.targetPrice, cart.currency)} · Started by {cart.initiatorName}
              </p>

              <div className="pooled-cart-page__progress-wrap">
                <div className="pooled-cart-page__progress-bar">
                  <div
                    className="pooled-cart-page__progress-fill"
                    style={{ width: `${cart.progressPercent}%` }}
                  />
                </div>
                <div className="pooled-cart-page__progress-labels">
                  <span className="tabular-nums">
                    {formatMoney(cart.committedTotal, cart.currency)} committed
                  </span>
                  <span className="tabular-nums">
                    {cart.status === "locked"
                      ? "Locked"
                      : `${formatMoney(cart.remainingAmount, cart.currency)} to go`}
                  </span>
                </div>
              </div>

              <span className={`pooled-cart-page__status pooled-cart-page__status--${cart.status}`}>
                {cart.status}
              </span>
            </div>

            <section className="pooled-cart-page__section">
              <h3>Contributors</h3>
              <div className="pooled-cart-page__contributors">
                {cart.contributions.map((c) => (
                  <div key={`${c.userId}-${c.committedAt}`} className="pooled-cart-page__contributor">
                    <span className="pooled-cart-page__avatar">{c.userInitials}</span>
                    <span className="pooled-cart-page__contributor-name">{c.userName}</span>
                    <span className="pooled-cart-page__contributor-amount tabular-nums">
                      {formatMoney(c.amount, cart.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {cart.status === "pending" && (
              <section className="pooled-cart-page__section">
                <h3>Invite teammates</h3>
                <p className="pooled-cart-page__invite-copy">
                  Share this internal link — each colleague commits{" "}
                  {formatMoney(cart.suggestedContribution, cart.currency)} from their own wallet.
                </p>
                <div className="pooled-cart-page__invite-row">
                  <code className="pooled-cart-page__invite-url">{inviteUrl}</code>
                  <button type="button" className="ng-pill-btn" onClick={() => void handleCopy()}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>

                {!cart.hasCommitted ? (
                  <BoxCardButton
                    disabled={!canCommit || committing}
                    onClick={() => void handleCommit()}
                    style={{ marginTop: 16 }}
                  >
                    {committing
                      ? "Committing…"
                      : `Commit ${formatMoney(cart.suggestedContribution, cart.currency)}`}
                  </BoxCardButton>
                ) : (
                  <p className="pooled-cart-page__you-in" style={{ fontFamily: NG.fontBody, marginTop: 16 }}>
                    You&apos;re in for {formatMoney(cart.currentUserContribution ?? 0, cart.currency)}.
                    Waiting for teammates…
                  </p>
                )}

                {cart.isInitiator && (
                  <button
                    type="button"
                    className="ng-pill-btn pooled-cart-page__cancel"
                    onClick={() => void handleCancel()}
                  >
                    Cancel pool
                  </button>
                )}
              </section>
            )}

            {cart.status === "locked" && cart.voucher && (
              <section className="pooled-cart-page__section">
                <h3>Group redemption code</h3>
                <p className="pooled-cart-page__invite-copy">
                  One QR for the whole team — every contributor can use this at the vendor.
                </p>
                <PackageStub
                  variant="voucher"
                  title={cart.offerTitle}
                  providerName={cart.providerName}
                  price={cart.targetPrice}
                  code={cart.voucher.code}
                  qrPayload={cart.voucher.qrPayload}
                  status="settled"
                />
              </section>
            )}
          </div>
        )}
      </EmployeePageShell>
    </main>
  );
}
