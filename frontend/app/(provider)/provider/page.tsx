"use client";

import * as React from "react";
import { useProviderCompany, useProviderOffers } from "@/lib/hooks/use-provider";
import { ProviderOfferCard } from "@/components/perx/provider-offer-card";
import { OfferFormSheet } from "@/components/perx/offer-form-sheet";
import { Button } from "@/components/ui/button";
import type { OfferDTO } from "@/lib/api/contracts";
import type { OfferFormData } from "@/components/perx/offer-form-sheet";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 24px 120px" }}>
        {children}
      </div>
    </main>
  );
}

function DeleteDialog({ offer, onConfirm, onCancel, loading }: { offer: OfferDTO; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(1,1,16,0.30)", zIndex: 50 }} />
      <div role="dialog" aria-modal="true" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 51, backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px", width: "min(400px, 90vw)", boxSizing: "border-box" }}>
        <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "22px", letterSpacing: "-0.66px", color: "#010110", margin: 0, marginBottom: "12px" }}>
          Delete this offer?
        </h2>
        <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", lineHeight: 1.5, color: "#73737c", margin: 0, marginBottom: "24px" }}>
          <strong style={{ color: "#010110" }}>{offer.title}</strong> will be removed from the marketplace. This can&apos;t be undone.
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm} disabled={loading}>{loading ? "Deleting..." : "Delete"}</Button>
        </div>
      </div>
    </>
  );
}

export default function ProviderPage() {
  const { data: companyData, loading: companyLoading } = useProviderCompany();
  const { offers, loading: offersLoading, error: offersError, createOffer, updateOffer, deleteOffer } = useProviderOffers();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingOffer, setEditingOffer] = React.useState<OfferDTO | null>(null);
  const [deletingOffer, setDeletingOffer] = React.useState<OfferDTO | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const currency = companyData?.company.currency ?? "ALL";

  const openCreate = () => { setEditingOffer(null); setSheetOpen(true); };
  const openEdit = (offer: OfferDTO) => { setEditingOffer(offer); setSheetOpen(true); };

  const handleSubmit = async (data: OfferFormData) => {
    if (editingOffer) {
      await updateOffer(editingOffer.id, data);
    } else {
      await createOffer(data);
    }
  };

  const handleDelete = async () => {
    if (!deletingOffer) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteOffer(deletingOffer.id);
      setDeletingOffer(null);
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <header style={{ marginBottom: "48px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
        <div>
          {companyLoading ? (
            <div style={{ height: "48px", width: "220px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
          ) : (
            <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 56", fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.07, letterSpacing: "-1.56px", color: "#010110", margin: 0, marginBottom: "8px" }}>
              {companyData?.provider.name ?? "Your offers."}
            </h1>
          )}
          {companyData?.provider.description && (
            <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0 }}>
              {companyData.provider.description}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={openCreate} style={{ flexShrink: 0 }}>
          + New offer
        </Button>
      </header>

      {/* Offer grid */}
      {offersLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "24px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: "260px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)", animation: "perx-shimmer 1.4s ease-in-out infinite" }} />
          ))}
        </div>
      ) : offersError ? (
        <p role="alert" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c" }}>
          Could not load offers: {offersError}
        </p>
      ) : !offers || offers.length === 0 ? (
        <div style={{ border: "1px solid rgba(1,1,16,0.12)", borderRadius: "8px", padding: "48px 32px", textAlign: "center", maxWidth: "480px" }}>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 26", fontSize: "26px", letterSpacing: "-0.78px", color: "#010110", margin: 0, marginBottom: "12px" }}>
            No offers yet.
          </h2>
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#73737c", margin: 0, marginBottom: "20px" }}>
            Create your first offer to appear on the Perx marketplace.
          </p>
          <Button variant="primary" onClick={openCreate}>Create offer</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "24px" }}>
          {offers.map((offer) => (
            <ProviderOfferCard key={offer.id} offer={offer} onEdit={openEdit} onDelete={(o) => { setDeletingOffer(o); setDeleteError(null); }} />
          ))}
        </div>
      )}

      {/* Create/edit sheet */}
      <OfferFormSheet
        open={sheetOpen}
        offer={editingOffer}
        currency={currency}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* Delete confirmation */}
      {deletingOffer && (
        <>
          <DeleteDialog
            offer={deletingOffer}
            onConfirm={handleDelete}
            onCancel={() => setDeletingOffer(null)}
            loading={deleteLoading}
          />
          {deleteError && (
            <div style={{ position: "fixed", bottom: "24px", left: "24px", zIndex: 60, backgroundColor: "#ffffff", border: "1px solid rgba(1,1,16,0.15)", borderRadius: "8px", padding: "12px 16px", fontFamily: "var(--font-inter), sans-serif", fontSize: "14px" }}>
              {deleteError}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
