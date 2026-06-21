"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { formatMoney } from "@/lib/utils";
import { dismissPeerAdvocacy, sendPeerAdvocacy } from "@/lib/hooks/use-engagement";
import type { PeerAdvocacyPromptDTO } from "@/lib/api/contracts";
import { toast } from "sonner";

interface PeerAdvocacySheetProps {
  open: boolean;
  advocacy: PeerAdvocacyPromptDTO | null;
  onClose: () => void;
}

export function PeerAdvocacySheet({ open, advocacy, onClose }: PeerAdvocacySheetProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open && advocacy) {
      setSelectedId(advocacy.colleagues[0]?.id ?? null);
    }
  }, [open, advocacy?.id, advocacy]);

  if (!open || !advocacy) return null;

  const handleSend = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      const result = await sendPeerAdvocacy(advocacy.id, selectedId);
      toast.success(`Recommendation sent to ${result.recipientName}`, {
        description: result.message,
      });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissPeerAdvocacy(advocacy.id);
    } catch {
      // demo slice
    }
    onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && void handleDismiss()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="peer-advocacy-sheet__overlay" />
        <DialogPrimitive.Content className="employee-theme peer-advocacy-sheet" aria-describedby="peer-advocacy-desc">
          <div className="peer-advocacy-sheet__handle" aria-hidden="true" />

          <header className="peer-advocacy-sheet__header">
            <p className="peer-advocacy-sheet__eyebrow">Post-redemption flywheel</p>
            <DialogPrimitive.Title className="peer-advocacy-sheet__title">
              Hope you enjoyed {advocacy.vendorName}!
            </DialogPrimitive.Title>
            <p id="peer-advocacy-desc" className="peer-advocacy-sheet__subtitle">
              Worth telling a teammate? Pick someone who&apos;d actually use{" "}
              <strong>{advocacy.offerTitle}</strong> — we only suggest people in your graph, not a
              company-wide feed.
            </p>
          </header>

          <section className="peer-advocacy-sheet__section">
            <h3 className="peer-advocacy-sheet__section-label">Suggested colleagues</h3>
            <div className="peer-advocacy-sheet__colleagues">
              {advocacy.colleagues.map((colleague) => {
                const active = selectedId === colleague.id;
                return (
                  <button
                    key={colleague.id}
                    type="button"
                    className={[
                      "peer-advocacy-sheet__colleague",
                      active ? "peer-advocacy-sheet__colleague--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedId(colleague.id)}
                    aria-pressed={active}
                  >
                    <span className="peer-advocacy-sheet__avatar">
                      {colleague.avatarUrl ? (
                        <img src={colleague.avatarUrl} alt="" />
                      ) : (
                        colleague.initials
                      )}
                    </span>
                    <span className="peer-advocacy-sheet__colleague-body">
                      <span className="peer-advocacy-sheet__colleague-name">{colleague.name}</span>
                      <span className="peer-advocacy-sheet__colleague-reason">{colleague.reason}</span>
                      <span className="peer-advocacy-sheet__colleague-wallet tabular-nums">
                        {formatMoney(colleague.walletAvailable, "ALL")} available
                      </span>
                    </span>
                    <span className="peer-advocacy-sheet__radio" aria-hidden="true">
                      {active ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedId && (
            <div className="peer-advocacy-sheet__preview">
              <p className="peer-advocacy-sheet__preview-label">They&apos;ll receive</p>
              <p className="peer-advocacy-sheet__preview-copy">
                &ldquo;Just recommended {advocacy.offerTitle} at {advocacy.vendorName}. You have
                enough in your {advocacy.categoryWalletLabel} to try it.&rdquo;
              </p>
            </div>
          )}

          <footer className="peer-advocacy-sheet__footer">
            <button
              type="button"
              className="ng-box-btn"
              disabled={!selectedId || sending}
              onClick={() => void handleSend()}
            >
              {sending ? "Sending…" : "Send recommendation"}
            </button>
            <button type="button" className="ng-pill-btn peer-advocacy-sheet__skip" onClick={() => void handleDismiss()}>
              Not now
            </button>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
