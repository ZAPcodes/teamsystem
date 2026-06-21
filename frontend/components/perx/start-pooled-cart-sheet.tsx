"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";
import { NG } from "@/lib/new-genre/tokens";
import type { Offer } from "@/lib/api/contracts";
import { createPooledCart } from "@/lib/hooks/use-pooled-cart";
import { useAllowance } from "@/lib/hooks/use-allowance";
import { BoxCardButton } from "@/components/perx/box-card-primitives";

interface StartPooledCartSheetProps {
  open: boolean;
  offer: Offer | null;
  onClose: () => void;
}

export function StartPooledCartSheet({ open, offer, onClose }: StartPooledCartSheetProps) {
  const router = useRouter();
  const { allowance } = useAllowance();
  const [amount, setAmount] = React.useState(2000);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && offer) {
      setAmount(Math.max(500, Math.ceil(offer.priceALL / 4)));
    }
  }, [open, offer]);

  if (!open || !offer) return null;

  const available = allowance?.available ?? 0;
  const suggested = Math.max(500, Math.ceil(offer.priceALL / 4));
  const seatsNeeded = Math.ceil(offer.priceALL / suggested);

  const handleStart = async () => {
    setLoading(true);
    try {
      const { cart } = await createPooledCart(offer.id, amount);
      toast.success("Team pool started", {
        description: "Share the invite link with colleagues to fill the pool.",
      });
      onClose();
      router.push(`/marketplace/pool/${cart.inviteCode}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="peer-advocacy-sheet__overlay" />
        <DialogPrimitive.Content className="employee-theme peer-advocacy-sheet">
          <div className="peer-advocacy-sheet__handle" aria-hidden="true" />
          <header className="peer-advocacy-sheet__header">
            <p className="peer-advocacy-sheet__eyebrow">N-way pooled redemption</p>
            <DialogPrimitive.Title className="peer-advocacy-sheet__title">
              Start a team pool
            </DialogPrimitive.Title>
            <p className="peer-advocacy-sheet__subtitle">
              Fund <strong>{offer.title}</strong> together. You commit first — teammates join via
              invite link until the pool hits {formatMoney(offer.priceALL, "ALL")}.
            </p>
          </header>

          <div className="pooled-cart-sheet__stats">
            <div>
              <span>Package price</span>
              <strong className="tabular-nums">{formatMoney(offer.priceALL, "ALL")}</strong>
            </div>
            <div>
              <span>Suggested seat</span>
              <strong className="tabular-nums">{formatMoney(suggested, "ALL")}</strong>
            </div>
            <div>
              <span>Seats at suggested</span>
              <strong>{seatsNeeded}</strong>
            </div>
            <div>
              <span>Your wallet</span>
              <strong className="tabular-nums">{formatMoney(available, "ALL")}</strong>
            </div>
          </div>

          <label className="pooled-cart-sheet__amount">
            Your commit (ALL)
            <input
              type="number"
              min={500}
              max={Math.min(available, offer.priceALL)}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>

          <footer className="peer-advocacy-sheet__footer">
            <BoxCardButton disabled={loading || amount <= 0 || amount > available} onClick={() => void handleStart()}>
              {loading ? "Starting…" : `Commit ${formatMoney(amount, "ALL")} & invite team`}
            </BoxCardButton>
            <button type="button" className="ng-pill-btn peer-advocacy-sheet__skip" onClick={onClose}>
              Cancel
            </button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function isPoolEligibleOffer(offer: Pick<Offer, "priceALL" | "title">) {
  return offer.priceALL >= 6000 || /escape room/i.test(offer.title);
}
