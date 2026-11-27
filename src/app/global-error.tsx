"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0a0d0b", color: "#eef3ee", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1>Zed Music Online is having trouble</h1>
          <p style={{ color: "#95a399" }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: "#2bb24c", color: "#04190a", border: 0, borderRadius: 999, padding: "12px 22px", fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
