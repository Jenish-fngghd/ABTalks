"use client";

// A small rotating/pulsing mark, in the spirit of the swirling brand orbs
// Groq/Claude use for their "the model is working" indicator (21st.dev has
// several real ones -- Siri Orb, Thinking Orbs -- but the daily component
// retrieval quota was already spent today, so this is our own take on the
// same idea: a conic-gradient ring plus a pulsing core, CSS-only so it's
// cheap enough to run in a chat bubble, sitewide-consistent as the single
// brand mark instead of the assorted hand-drawn sparkle SVGs it replaces.
export function Orb({
  size = 16,
  thinking = false,
  className = "",
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className={`absolute inset-0 rounded-full ${thinking ? "orb-spin-fast" : "orb-spin-slow"}`}
        style={{
          background:
            "conic-gradient(from 0deg, var(--accent), transparent 45%, var(--accent) 100%)",
        }}
      />
      <span className="absolute inset-[16%] rounded-full bg-panel" />
      <span
        className={`absolute inset-[30%] rounded-full ${thinking ? "orb-pulse" : ""}`}
        style={{ background: "var(--accent)" }}
      />
    </span>
  );
}
