"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { OfferDTO } from "@/lib/api/contracts";

const KNOWN_CATEGORIES = ["wellness", "food", "travel", "learning", "lifestyle"];

const FIELD: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(1,1,16,0.15)",
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: "15px",
  color: "#010110",
  backgroundColor: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  fontSize: "12px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#73737c",
  marginBottom: "6px",
};

interface OfferFormSheetProps {
  open: boolean;
  offer: OfferDTO | null; // null = create mode
  currency: string;
  onClose: () => void;
  onSubmit: (data: OfferFormData) => Promise<void>;
}

export interface OfferFormData {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isLimited: boolean;
  expiresAt?: string;
}

export function OfferFormSheet({ open, offer, currency, onClose, onSubmit }: OfferFormSheetProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("wellness");
  const [price, setPrice] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [isLimited, setIsLimited] = React.useState(false);
  const [expiresAt, setExpiresAt] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Populate fields when editing
  React.useEffect(() => {
    if (offer) {
      setTitle(offer.title);
      setDescription(offer.description);
      setCategory(offer.category);
      setPrice(String(offer.price));
      setImageUrl(offer.imageUrl ?? "");
      setIsLimited(offer.isLimited);
      setExpiresAt(offer.expiresAt ? offer.expiresAt.slice(0, 10) : "");
    } else {
      setTitle(""); setDescription(""); setCategory("wellness"); setPrice("");
      setImageUrl(""); setIsLimited(false); setExpiresAt("");
    }
    setError(null);
  }, [offer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data: OfferFormData = {
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price),
        currency,
        imageUrl: imageUrl.trim() || undefined,
        isLimited,
        expiresAt: (isLimited && expiresAt) ? new Date(expiresAt).toISOString() : undefined,
      };
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(1,1,16,0.30)",
          zIndex: 50, transition: "opacity 200ms ease",
        }}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={offer ? "Edit offer" : "New offer"}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          backgroundColor: "#ffffff",
          zIndex: 51,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          padding: "32px 28px 48px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontVariationSettings: "'wght' 400, 'opsz' 32", fontSize: "28px", lineHeight: 1.1, letterSpacing: "-0.84px", color: "#010110", margin: 0 }}>
            {offer ? "Edit offer." : "New offer."}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#73737c", fontSize: "20px", lineHeight: 1 }}
          >
            &#x2715;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
          <div>
            <label style={LABEL}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Yoga Studio — 10 sessions" required style={FIELD}
              onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
              onBlur={(e) => (e.currentTarget.style.outline = "none")}
            />
          </div>
          <div>
            <label style={LABEL}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the benefit..." required rows={3}
              style={{ ...FIELD, resize: "vertical", lineHeight: 1.5 }}
              onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
              onBlur={(e) => (e.currentTarget.style.outline = "none")}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={LABEL}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...FIELD, cursor: "pointer" }}
                onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
              >
                {KNOWN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Price ({currency})</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" min={0} step="1" required style={FIELD}
                onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
              />
            </div>
          </div>
          <div>
            <label style={LABEL}>Image URL (optional)</label>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." style={FIELD}
              onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
              onBlur={(e) => (e.currentTarget.style.outline = "none")}
            />
          </div>

          {/* Limited toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              role="switch"
              aria-checked={isLimited}
              onClick={() => setIsLimited(!isLimited)}
              style={{
                width: "40px", height: "22px", borderRadius: "100px",
                backgroundColor: isLimited ? "#010110" : "rgba(1,1,16,0.20)",
                border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background-color 150ms ease",
              }}
            >
              <span style={{
                position: "absolute", top: "3px",
                left: isLimited ? "21px" : "3px",
                width: "16px", height: "16px", borderRadius: "50%",
                backgroundColor: "#ffffff",
                transition: "left 150ms ease",
              }} />
            </button>
            <label style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#010110", cursor: "pointer" }} onClick={() => setIsLimited(!isLimited)}>
              Limited availability
            </label>
          </div>

          {isLimited && (
            <div>
              <label style={LABEL}>Expires at</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={FIELD}
                onFocus={(e) => (e.currentTarget.style.outline = "2px solid #635bff")}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
              />
            </div>
          )}

          {error && (
            <p role="alert" style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", border: "1px solid rgba(1,1,16,0.20)", borderRadius: "8px", padding: "10px 14px", margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ marginTop: "auto", paddingTop: "16px" }}>
            <Button type="submit" variant="primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? (offer ? "Saving..." : "Creating...") : (offer ? "Save changes." : "Publish offer.")}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
