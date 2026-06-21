"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "@/lib/motion";
import { redeemVoucher } from "@/lib/hooks/use-engagement";
import { toast } from "sonner";

export default function ProviderScanPage() {
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<string | null>(null);
  const [lastAward, setLastAward] = React.useState<string | null>(null);

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setLastResult(null);
    setLastAward(null);
    try {
      const result = await redeemVoucher(trimmed);
      setLastResult(`Redeemed ${result.voucher.code}`);
      if (result.gamification) {
        const g = result.gamification;
        const parts = [
          `+${g.xpAwarded} XP for ${g.employeeName}`,
          g.streakCount > 1 ? `${g.streakCount}-day streak` : null,
          g.leveledUp ? `Level ${g.level}!` : null,
          g.bonusUnlocked ? "Bonus wallet unlocked" : null,
        ].filter(Boolean);
        setLastAward(parts.join(" · "));
        toast.success(parts[0] ?? "Benefit confirmed");
      } else {
        toast.success("Benefit confirmed");
      }
      setCode("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "38px", marginBottom: "8px", color: "#010110" }}>
        Scan to redeem
      </h1>
      <p style={{ fontFamily: "var(--font-inter)", fontSize: "14px", color: "#73737c", marginBottom: "32px" }}>
        Enter the code from the employee&apos;s QR stub. Verified scans award XP and keep streaks alive.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="PERX-XXXXXXXX"
        style={{
          width: "100%",
          padding: "16px",
          fontSize: "18px",
          fontFamily: "monospace",
          border: "1px solid rgba(1,1,16,0.15)",
          borderRadius: "8px",
          marginBottom: "16px",
        }}
      />
      <Button variant="primary" disabled={loading || !code.trim()} onClick={() => void handleRedeem()} style={{ width: "100%" }}>
        {loading ? "Confirming..." : "Confirm redemption"}
      </Button>
      {lastResult && (
        <p style={{ marginTop: "24px", fontFamily: "var(--font-inter)", color: "#010110", fontWeight: 500 }}>
          {lastResult}
        </p>
      )}
      {lastAward && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            marginTop: "12px",
            fontFamily: "var(--font-inter)",
            fontSize: "14px",
            color: "#635bff",
            padding: "12px 14px",
            borderRadius: "8px",
            backgroundColor: "rgba(99,91,255,0.08)",
            border: "1px solid rgba(99,91,255,0.15)",
          }}
        >
          {lastAward}
        </motion.div>
      )}
    </main>
  );
}
