"use client";

import * as React from "react";
import { toast } from "sonner";
import { triggerDemoPeerAdvocacy } from "@/lib/hooks/use-engagement";
import { NG } from "@/lib/new-genre/tokens";

export function PeerAdvocacyDemoTrigger() {
  const [loading, setLoading] = React.useState(false);

  const handleDemo = async () => {
    setLoading(true);
    try {
      const result = await triggerDemoPeerAdvocacy();
      if (!result.advocacy) {
        toast.error("No colleagues available for advocacy demo");
        return;
      }
      toast.success("Vendor checkout complete", {
        description: "Peer advocacy sheet opens in 5 seconds…",
      });
      window.dispatchEvent(new CustomEvent("perx:peer-advocacy-pending"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="ng-box-card"
      style={{
        maxWidth: "520px",
        marginBottom: "32px",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <p style={{ fontFamily: NG.fontBody, fontSize: "13px", fontWeight: 700, color: "#635bff", margin: "0 0 4px" }}>
          Demo · Post-redemption flywheel
        </p>
        <p style={{ fontFamily: NG.fontBody, fontSize: "14px", color: NG.slateVeil, margin: 0 }}>
          Simulate a completed vendor checkout — Bora asks you to recommend the perk to a teammate.
        </p>
      </div>
      <button type="button" className="ng-pill-btn" disabled={loading} onClick={() => void handleDemo()}>
        {loading ? "Simulating…" : "Simulate checkout"}
      </button>
    </div>
  );
}
