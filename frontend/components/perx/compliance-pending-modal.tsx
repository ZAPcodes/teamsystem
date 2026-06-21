"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ClaimComplianceResponse } from "@/lib/api/contracts";

interface CompliancePendingModalProps {
  open: boolean;
  result: ClaimComplianceResponse | null;
  offerTitle: string;
  onClose: () => void;
}

export function CompliancePendingModal({
  open,
  result,
  offerTitle,
  onClose,
}: CompliancePendingModalProps) {
  if (!open || !result) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="peer-advocacy-sheet__overlay" />
        <DialogPrimitive.Content className="employee-theme peer-advocacy-sheet compliance-pending-modal">
          <div className="peer-advocacy-sheet__handle" aria-hidden="true" />
          <header className="peer-advocacy-sheet__header">
            <p className="peer-advocacy-sheet__eyebrow">Enterprise shield</p>
            <DialogPrimitive.Title className="peer-advocacy-sheet__title">
              Pending company verification
            </DialogPrimitive.Title>
            <p className="peer-advocacy-sheet__subtitle">
              We paused <strong>{offerTitle}</strong> before it entered your package. HR is running a
              quick brand-safety and competitor check — you&apos;ll be notified once it clears.
            </p>
          </header>

          {result.reason && (
            <div className="compliance-pending-modal__reason">
              <p className="compliance-pending-modal__reason-label">Why it paused</p>
              <p>{result.reason}</p>
            </div>
          )}

          <footer className="peer-advocacy-sheet__footer">
            <button type="button" className="ng-box-btn" onClick={onClose}>
              Got it
            </button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
