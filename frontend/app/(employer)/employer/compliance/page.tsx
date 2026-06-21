"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEmployerComplianceReviews } from "@/lib/hooks/use-employer";
import { formatMoney } from "@/lib/utils";

export default function EmployerCompliancePage() {
  const { reviews, loading, error, refetch, decide } = useEmployerComplianceReviews();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    setBusyId(id);
    try {
      await decide(id, decision);
      toast(decision === "approved" ? "Override approved — employee can claim again" : "Transaction rejected");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "64px 24px 120px" }}>
        <header style={{ marginBottom: "40px" }}>
          <p style={{ margin: "0 0 8px", color: "#e6320a", fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Enterprise shield
          </p>
          <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.07, color: "#010110", margin: 0 }}>
            Compliance red flags
          </h1>
          <p style={{ margin: "12px 0 0", color: "#73737c", fontSize: "15px", maxWidth: "640px" }}>
            AI-halted claims waiting for HR override — competitor conflicts and severe negative media sentiment.
          </p>
        </header>

        {loading ? (
          <p style={muted}>Loading compliance queue...</p>
        ) : error ? (
          <div role="alert" style={card}>
            <p style={{ margin: 0, marginBottom: "16px", color: "#010110" }}>{error}</p>
            <Button variant="ghost" onClick={refetch}>Try again</Button>
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div style={card}>
            <p style={{ ...muted, margin: 0 }}>No halted transactions right now.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {reviews.map((review) => (
              <article key={review.id} style={flagCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "24px", alignItems: "flex-start" }}>
                  <div>
                    <p style={flagEyebrow}>Transaction halted</p>
                    <h2 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "24px", lineHeight: 1.15, color: "#010110", margin: "0 0 8px" }}>
                      {review.employeeName} attempted {formatMoney(review.amount, review.currency)} at {review.providerName}
                    </h2>
                    <p style={{ margin: "0 0 12px", color: "#010110", fontSize: "15px", lineHeight: 1.5 }}>
                      <strong>{review.offerTitle}</strong> — {review.reason}
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {review.competitorFlag && <span style={chip}>Competitor flag</span>}
                      {review.sentimentFlag && <span style={chip}>Media sentiment flag</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <Button variant="ghost" disabled={busyId === review.id} onClick={() => void handleDecision(review.id, "rejected")}>
                      Reject
                    </Button>
                    <Button variant="primary" disabled={busyId === review.id} onClick={() => void handleDecision(review.id, "approved")}>
                      {busyId === review.id ? "Working..." : "Approve override"}
                    </Button>
                  </div>
                </div>

                {review.headlines.length > 0 && (
                  <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px solid rgba(230,50,10,0.15)" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#73737c" }}>
                      Headlines reviewed
                    </p>
                    <ul style={{ margin: 0, paddingLeft: "18px", color: "#010110", fontSize: "14px", lineHeight: 1.5 }}>
                      {review.headlines.map((headline) => (
                        <li key={headline}>{headline}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(1,1,16,0.12)",
  borderRadius: "8px",
  padding: "24px",
};

const flagCard: React.CSSProperties = {
  border: "2px solid #e6320a",
  borderRadius: "12px",
  padding: "24px",
  background: "rgba(230,50,10,0.04)",
  boxShadow: "0 0 0 1px rgba(230,50,10,0.08)",
};

const flagEyebrow: React.CSSProperties = {
  margin: "0 0 6px",
  color: "#e6320a",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  padding: "4px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(230,50,10,0.35)",
  background: "#fff",
  fontSize: "12px",
  fontWeight: 600,
  color: "#e6320a",
};

const muted: React.CSSProperties = {
  fontFamily: "var(--font-inter), sans-serif",
  fontSize: "14px",
  color: "#73737c",
};
