import { ImageResponse } from "next/og";

export const alt = "Synthesis — autonomous multi-agent research engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0e0d0b",
          color: "#ece7dc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#9a9182",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: 99, background: "#e0a25e" }} />
          Autonomous research engine
        </div>
        <div style={{ fontSize: 128, fontWeight: 700, letterSpacing: 8, marginTop: 24 }}>
          SYNTHESIS
        </div>
        <div style={{ fontSize: 38, color: "#9a9182", marginTop: 16, maxWidth: 900 }}>
          Plan · search · cross-check · synthesize. A team of AI agents writes a fully cited,
          verified report — live.
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: 48, fontSize: 24, color: "#e0a25e" }}>
          <span>planner</span>
          <span style={{ color: "#6b6557" }}>/</span>
          <span>parallel researchers</span>
          <span style={{ color: "#6b6557" }}>/</span>
          <span>critic</span>
        </div>
      </div>
    ),
    size,
  );
}
