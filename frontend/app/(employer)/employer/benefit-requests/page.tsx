"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useEmployerBenefitRequests } from "@/lib/hooks/use-employer";
import { useTranslation } from "@/lib/i18n/use-translation";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "var(--font-inter), sans-serif" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 24px 120px" }}>{children}</div>
    </main>
  );
}

export default function EmployerBenefitRequestsPage() {
  const { t } = useTranslation();
  const { requests, loading, error, decide } = useEmployerBenefitRequests();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleDecide = async (id: string, status: "approved" | "declined") => {
    setBusyId(id);
    try {
      await decide(id, status);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div style={{ height: "120px", borderRadius: "8px", backgroundColor: "rgba(1,1,16,0.05)" }} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "40px", margin: "0 0 8px", color: "#010110" }}>
          {t("employer.benefitRequests")}
        </h1>
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c", margin: 0 }}>
          {t("employer.noLift")}
        </p>
      </header>

      {error && <p role="alert" style={{ color: "#73737c" }}>{error}</p>}

      {requests.length === 0 ? (
        <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c" }}>
          {t("employer.pending")} — none right now.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {requests.map((request) => (
            <article
              key={request.id}
              style={{
                border: "1px solid rgba(1,1,16,0.12)",
                borderRadius: "8px",
                padding: "20px",
                backgroundColor: request.status === "pending" ? "#ffffff" : "rgba(1,1,16,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "15px", margin: "0 0 4px", color: "#010110" }}>
                    {request.employeeName}
                  </p>
                  <p style={{ fontFamily: "var(--font-inter)", fontSize: "13px", color: "#73737c", margin: 0 }}>
                    {request.employeeEmail}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "5px 10px",
                    borderRadius: "100px",
                    border: "1px solid rgba(1,1,16,0.12)",
                    color: request.status === "pending" ? "#635bff" : "#73737c",
                  }}
                >
                  {request.status}
                </span>
              </div>

              <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#010110", margin: "0 0 14px", fontStyle: "italic" }}>
                “{request.originalMessage}”
              </p>

              <div style={{ display: "grid", gap: "10px", marginBottom: request.status === "pending" ? "16px" : 0 }}>
                {request.items.map((item, idx) => (
                  <div key={idx} style={{ padding: "12px", borderRadius: "8px", backgroundColor: "rgba(99,91,255,0.04)", border: "1px solid rgba(99,91,255,0.12)" }}>
                    <p style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "14px", margin: "0 0 4px" }}>{item.name}</p>
                    <p style={{ fontFamily: "var(--font-inter)", fontSize: "13px", color: "#73737c", margin: "0 0 6px" }}>{item.description}</p>
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontFamily: "var(--font-inter)", fontSize: "12px" }}>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer" style={{ color: "#635bff" }}>
                          {item.link}
                        </a>
                      )}
                      {item.phone && <span>{item.phone}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {request.status === "pending" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button variant="primary" disabled={busyId === request.id} onClick={() => void handleDecide(request.id, "approved")}>
                    {t("employer.approve")}
                  </Button>
                  <Button variant="ghost" disabled={busyId === request.id} onClick={() => void handleDecide(request.id, "declined")}>
                    {t("employer.decline")}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
