"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { formatMoney } from "@/lib/utils";
import { offerDTOtoOffer, type Offer, type PosBundleResponse } from "@/lib/api/contracts";

interface PosBundlerModalProps {
  open: boolean;
  onClose: () => void;
  result: PosBundleResponse | null;
  baseOffer: Offer | null;
  onConfirm: (selectedComplements: Offer[]) => void;
}

export function PosBundlerModal({
  open,
  onClose,
  result,
  baseOffer,
  onConfirm,
}: PosBundlerModalProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) setSelectedIds(new Set());
  }, [open, result?.offerId]);

  if (!open || !result || !baseOffer) return null;

  const complements = result.complements.map((item) => ({
    ...item,
    offer: offerDTOtoOffer(item.offer),
  }));

  const selectedComplements = complements
    .filter((item) => selectedIds.has(item.offer.id))
    .map((item) => item.offer);

  const addOnTotal = selectedComplements.reduce((sum, o) => sum + o.priceALL, 0);
  const packageTotal = baseOffer.priceALL + addOnTotal;
  const walletAfter = result.walletBalance - packageTotal;

  const selectedAddOnTotal = (excludeId?: string) =>
    complements
      .filter((item) => selectedIds.has(item.offer.id) && item.offer.id !== excludeId)
      .reduce((sum, item) => sum + item.offer.priceALL, 0);

  const canSelect = (offerId: string, price: number) => {
    if (selectedIds.has(offerId)) return true;
    return selectedAddOnTotal() + price <= result.remainingAfterBase;
  };

  const toggleSelect = (offerId: string, price: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(offerId)) {
        next.delete(offerId);
        return next;
      }
      if (selectedAddOnTotal() + price > result.remainingAfterBase) return prev;
      next.add(offerId);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedComplements);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="pos-bundler-modal__overlay" />
        <DialogPrimitive.Content
          className="employee-theme pos-bundler-modal"
          aria-describedby="pos-bundler-desc"
        >
          <header className="pos-bundler-modal__header">
            <p className="pos-bundler-modal__eyebrow">Bora · Point-of-sale bundler</p>
            <DialogPrimitive.Title className="pos-bundler-modal__title">
              {result.headline}
            </DialogPrimitive.Title>
            <p id="pos-bundler-desc" className="pos-bundler-modal__subtitle">
              Customers often pair this perk with the add-ons below. Select any you want, then add
              everything to your package in one tap.
            </p>
          </header>

          <section className="pos-bundler-modal__section">
            <h3 className="pos-bundler-modal__section-label">Your pick</h3>
            <OfferPickRow
              offer={baseOffer}
              meta="Included with this claim"
              selected
              locked
              onToggle={() => undefined}
            />
          </section>

          <section className="pos-bundler-modal__section">
            <h3 className="pos-bundler-modal__section-label">Frequently paired with</h3>
            <div className="pos-bundler-modal__options">
              {complements.map((item) => {
                const isSelected = selectedIds.has(item.offer.id);
                const disabled = !canSelect(item.offer.id, item.offer.priceALL);
                return (
                  <OfferPickRow
                    key={item.offer.id}
                    offer={item.offer}
                    meta={`${item.shortLabel} · ${item.pitch}`}
                    selected={isSelected}
                    locked={false}
                    disabled={disabled}
                    onToggle={() => toggleSelect(item.offer.id, item.offer.priceALL)}
                  />
                );
              })}
            </div>
          </section>

          <div className="pos-bundler-modal__summary">
            <div className="pos-bundler-modal__summary-row">
              <span>Package total</span>
              <strong className="tabular-nums">{formatMoney(packageTotal, "ALL")}</strong>
            </div>
            <div className="pos-bundler-modal__summary-row pos-bundler-modal__summary-row--muted">
              <span>Wallet after</span>
              <strong className="tabular-nums">{formatMoney(Math.max(0, walletAfter), "ALL")}</strong>
            </div>
          </div>

          <footer className="pos-bundler-modal__footer">
            <button type="button" className="ng-box-btn" onClick={handleConfirm}>
              {selectedComplements.length > 0
                ? `Add to package · ${formatMoney(packageTotal, "ALL")}`
                : `Add ${baseOffer.title} to package`}
            </button>
            <button type="button" className="ng-pill-btn pos-bundler-modal__cancel" onClick={onClose}>
              Cancel
            </button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function OfferPickRow({
  offer,
  meta,
  selected,
  locked,
  disabled = false,
  onToggle,
}: {
  offer: Offer;
  meta: string;
  selected: boolean;
  locked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "pos-bundler-modal__option",
        selected ? "pos-bundler-modal__option--selected" : "",
        disabled ? "pos-bundler-modal__option--disabled" : "",
        locked ? "pos-bundler-modal__option--locked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={locked || disabled ? undefined : onToggle}
      disabled={locked || disabled}
      aria-pressed={selected}
    >
      <span className="pos-bundler-modal__check" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span className="pos-bundler-modal__thumb">
        {offer.imageUrl ? (
          <img src={offer.imageUrl} alt="" />
        ) : (
          <span>{offer.title.charAt(0)}</span>
        )}
      </span>
      <span className="pos-bundler-modal__option-body">
        <span className="pos-bundler-modal__option-title">{offer.title}</span>
        <span className="pos-bundler-modal__option-meta">{meta}</span>
        <span className="pos-bundler-modal__option-price tabular-nums">
          {formatMoney(offer.priceALL, "ALL")}
        </span>
      </span>
    </button>
  );
}
