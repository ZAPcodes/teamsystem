// Auth layout — no nav, no session guard. White canvas, centered column.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>{children}</div>
    </div>
  );
}

import React from "react";
