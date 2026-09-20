import { createRoot } from "react-dom/client";

import StatefulOrb, { type OrbState } from "@/shared/ui/StatefulOrb";
import "@/index.css";

/**
 * Dev-only story for StatefulOrb. Not routed, not imported by the app, and not
 * built: vite.config.ts configures no extra HTML input, so `npm run build`
 * emits index.html alone and none of this ships.
 *
 * It exists for one reason: a recent bug on this site passed every numeric
 * check while being visually useless, and was only caught by looking at a
 * screenshot. Seven states that all read as a pulsing dot would fail the same
 * way, so they have to be seen together.
 */

const STATES: OrbState[] = [
  "idle",
  "listening",
  "searching",
  "connecting",
  "reasoning",
  "working",
  "complete",
];

export function Row({ dark }: { dark: boolean }) {
  return (
    <section
      style={{
        // The orb reads its ink and ground from these two, so a dark variant is
        // a scope change rather than a different component.
        ["--orb-ink" as string]: dark ? "#F2F2F2" : "#0A0A0A",
        ["--orb-bg" as string]: dark ? "#0A0A0A" : "#FFFFFF",
        background: dark ? "#0A0A0A" : "#FFFFFF",
        color: dark ? "#F2F2F2" : "#0A0A0A",
        padding: "36px 28px",
      }}
    >
      <p
        style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          opacity: 0.6,
          margin: "0 0 28px",
        }}
      >
        {dark ? "[ dark ]" : "[ light ]"}
      </p>

      <div style={{ display: "flex", gap: 34, alignItems: "flex-start", flexWrap: "wrap" }}>
        {STATES.map((s) => (
          <div key={s} style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
            <StatefulOrb state={s} size="lg" mode="functional" />
            <StatefulOrb state={s} size="sm" mode="functional" />
          </div>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById("orb-story")!).render(
  <main style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
    <Row dark={false} />
    <Row dark />
  </main>,
);
