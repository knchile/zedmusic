import { ImageResponse } from "next/og";

export const alt = "Zed Music Online — the home of Zambian music";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const bars = [
    { h: 140, c: "#ffffff" },
    { h: 210, c: "#ffffff" },
    { h: 170, c: "#de2010" },
    { h: 240, c: "#000000" },
    { h: 120, c: "#ef7d00" },
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 15% 0%, #1f6b12 0%, #0a0d0b 60%)",
          color: "#eef3ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 250 }}>
          {bars.map((b, i) => (
            <div key={i} style={{ width: 44, height: b.h, background: b.c, borderRadius: 22, border: b.c === "#000000" ? "2px solid #2bb24c" : "none" }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3 }}>Zed Music Online</div>
          <div style={{ fontSize: 36, color: "#95a399" }}>Stream Zambian music · Official Top 10 charts</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, display: "flex" }}>
          <div style={{ flex: 7, background: "#198a00" }} />
          <div style={{ flex: 1, background: "#de2010" }} />
          <div style={{ flex: 1, background: "#000000" }} />
          <div style={{ flex: 1, background: "#ef7d00" }} />
        </div>
      </div>
    ),
    size,
  );
}
