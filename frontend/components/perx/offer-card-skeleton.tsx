/**
 * Hairline shimmer placeholder — shaped like OfferCard.
 * No spinner. Uses the .shimmer CSS animation from globals.css.
 */
export function OfferCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid rgba(1, 1, 16, 0.12)",
        overflow: "hidden",
      }}
    >
      {/* Image placeholder — 16:10 */}
      <div
        className="shimmer"
        style={{
          aspectRatio: "16 / 10",
          width: "100%",
        }}
      />

      {/* Body */}
      <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Provider label */}
        <div
          className="shimmer"
          style={{ height: "10px", width: "35%", borderRadius: "8px" }}
        />
        {/* Title */}
        <div
          className="shimmer"
          style={{ height: "20px", width: "75%", borderRadius: "8px" }}
        />
        {/* Description */}
        <div
          className="shimmer"
          style={{ height: "14px", width: "90%", borderRadius: "8px" }}
        />
        <div
          className="shimmer"
          style={{ height: "14px", width: "60%", borderRadius: "8px" }}
        />

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <div className="shimmer" style={{ height: "16px", width: "30%", borderRadius: "8px" }} />
          <div className="shimmer" style={{ height: "36px", width: "60px", borderRadius: "100px" }} />
        </div>
      </div>
    </div>
  );
}
