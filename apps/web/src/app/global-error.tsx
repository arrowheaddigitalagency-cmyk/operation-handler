"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0b1016", color: "#e7eef3", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 480, margin: "20vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Cars Compound</h1>
          <p style={{ opacity: 0.7, marginBottom: 24 }}>A critical error occurred.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#d9652c",
              color: "white",
              border: 0,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          <p style={{ marginTop: 16, fontSize: 12, opacity: 0.4 }}>{error.digest}</p>
        </main>
      </body>
    </html>
  );
}
