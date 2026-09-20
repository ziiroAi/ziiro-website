import { useEffect, useRef, useState, type CSSProperties } from "react";

import "./stateful-orb.css";

/**
 * StatefulOrb: the Ziiro orb, generalised.
 *
 * WHAT THIS IS AN EXTENSION OF, since that was the decision rather than a
 * preference. The hero orb at src/features/home/hero/IntelligenceOrb.tsx is
 * four layers: a CSS halo, a WebGL body from src/ogl/CoreOrb.tsx, a CSS poster
 * shaded with the same rig, and sharp HTML inside. Its own file describes the
 * poster as "not a placeholder", shaded so that "the handover from poster to
 * canvas is invisible". That poster is therefore already a faithful CSS
 * rendering of the canonical object, and it is what this component is built
 * from: the same radial shading, the same organic silhouette radii, the same
 * restrained halo.
 *
 * WHY NOT THE WEBGL CORE ITSELF. Three findings from reading it, not taste:
 *   1. `CoreOrbHandle` exposes `pulse(client)` and the program's uniforms are
 *      iTime, uHover, uRot, uPulse, uScroll, uGlow and uInk. That is a hover
 *      and impulse rig with no notion of state, so seven states would mean new
 *      uniforms and new branches in a 219-line shader that the brief forbids
 *      regressing.
 *   2. ogl is roughly 48K and each instance takes a WebGL context. The page map
 *      puts several orbs on Products plus one on Docs and one on Contact, on a
 *      site whose homepage already runs two canvases. Browsers cap live
 *      contexts in the low teens and start dropping the oldest.
 *   3. A 20px indicator cannot justify a shader, and the brief says so.
 * The visual identity is what has to be identical at every size, and building
 * on the poster rig is what delivers that at 20px and at 240px alike. The hero
 * orb is untouched by this file.
 *
 * REFERENCE, NOT APPEARANCE. libraries.dev informed the state vocabulary, the
 * timing feel and the accessibility shape. None of its visual treatment is
 * here.
 */

/** The seven public states. Deliberately small: weaving, solving and composing
 *  were dropped because three names for "the system is doing something" is a
 *  vocabulary nobody can hold in their head. */
export type OrbState =
  | "idle"
  | "listening"
  | "searching"
  | "connecting"
  | "reasoning"
  | "working"
  | "complete";

export type OrbSize = "sm" | "md" | "lg";
export type OrbIntensity = "subtle" | "normal";

/**
 * AMBIENT is the orb as brand object. It implies nothing about work in
 * progress, so it does not announce transitions and its word is a standing
 * label rather than a status.
 *
 * FUNCTIONAL is the orb as a real state indicator, and only it gets the live
 * region. Without this split every decorative orb on the site would be
 * quietly claiming that Ziiro is reasoning about something.
 */
export type OrbMode = "ambient" | "functional";

/** The word is canonical. The animation reinforces it; it never replaces it. */
const WORDS: Record<OrbState, string> = {
  idle: "Ready",
  listening: "Listening",
  searching: "Searching",
  connecting: "Connecting",
  reasoning: "Reasoning",
  working: "Working",
  complete: "Complete",
};

const PX: Record<OrbSize, number> = { sm: 20, md: 72, lg: 240 };

/** Below this the mark is simplified: five chords inside 20px is a smudge, and
 *  a smudge communicates less than a single clear gesture. The body is
 *  unchanged, so the object still reads as the same orb. */
const COMPACT_BELOW = 44;

export interface StatefulOrbProps {
  state?: OrbState;
  size?: OrbSize;
  intensity?: OrbIntensity;
  mode?: OrbMode;
  /** Adds a hover and focus response. Ambient orbs use this to lift slightly
   *  next to a call to action without changing what they claim. */
  interactive?: boolean;
  /** Overrides the visible and announced word. Ambient callers use it for a
   *  standing label such as "Ziiro Diagnostic, Ready". */
  label?: string;
  /** Hides the word visually. It stays in the accessible name. Use only where
   *  a word genuinely cannot fit; the word is the canonical carrier. */
  hideWord?: boolean;
  className?: string;
}

export default function StatefulOrb({
  state = "idle",
  size = "md",
  intensity = "normal",
  mode = "functional",
  interactive = false,
  label,
  hideWord = false,
  className,
}: StatefulOrbProps) {
  const px = PX[size];
  const compact = px < COMPACT_BELOW;
  const word = label ?? WORDS[state];

  const hostRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [engaged, setEngaged] = useState(false);
  /** What the live region currently holds. Lags `state` on purpose. */
  const [announced, setAnnounced] = useState(word);

  // Stop rendering off screen or on a hidden tab, the way CoreOrb already does.
  // Paused animations are the browser doing no work at all, which is the point:
  // a page of orbs must cost nothing while the reader is elsewhere.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let onScreen = false;
    const sync = () => setRunning(onScreen && !document.hidden);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: "64px" },
    );
    io.observe(host);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  // Announce only meaningful changes. Two guards:
  //   - ambient orbs never announce, because nothing is actually happening;
  //   - a change is held briefly before it is published, so a sequence like
  //     searching then connecting then reasoning announces the state it
  //     settled on rather than narrating every step.
  // The live region's text is derived from `state` and nothing else, so an
  // animation looping can never re-announce: a screen reader is not told
  // "searching" a second time because the sweep came round again.
  useEffect(() => {
    if (mode !== "functional") return;
    const id = window.setTimeout(() => setAnnounced(word), 450);
    return () => window.clearTimeout(id);
  }, [word, mode]);

  const ink = "var(--orb-ink, var(--text-primary))";
  const bg = "var(--orb-bg, var(--background))";
  /** color-mix rather than a Tailwind alpha modifier: this site's colours are
   *  CSS variables, and `text-[var(--x)]/70` silently emits no rule at all. */
  const tint = (pct: number) => `color-mix(in srgb, ${ink} ${pct}%, transparent)`;

  const strong = intensity === "normal";
  const markOpacity = strong ? 0.9 : 0.55;
  const haloOpacity = strong ? 1 : 0.5;

  const body: CSSProperties = {
    width: px,
    height: px,
    borderRadius: "52% 48% 47% 53% / 49% 51% 49% 51%",
    // The hero poster's shading: a light centre falling to a defined limb, so
    // the object reads as a sphere lit from within rather than as a disc.
    // The limb carries the light, as it does on the hero: a clear centre
    // falling to a defined edge. The first pass of these stops was lifted
    // straight from the poster and read as an almost invisible white disc once
    // the WebGL body was not behind it, so the outer stops are heavier here.
    background: `radial-gradient(circle at 50% 50%, ${bg} 0%, ${bg} 54%, ${tint(6)} 78%, ${tint(14)} 92%, ${tint(24)} 100%)`,
    boxShadow: `inset 0 0 ${px * 0.09}px ${tint(16)}, 0 0 ${px * 0.04}px ${tint(6)}`,
    animation: "orb-breathe 7.3s ease-in-out infinite, orb-morph 11.7s ease-in-out infinite",
    transform: engaged ? "scale(0.94)" : undefined,
    transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  return (
    <div
      ref={hostRef}
      data-orb-running={running ? "true" : "false"}
      data-orb-state={state}
      className={`stateful-orb inline-flex items-center ${compact ? "gap-2" : "flex-col gap-3"} ${className ?? ""}`}
      onPointerEnter={interactive ? () => setEngaged(true) : undefined}
      onPointerLeave={interactive ? () => setEngaged(false) : undefined}
      onFocus={interactive ? () => setEngaged(true) : undefined}
      onBlur={interactive ? () => setEngaged(false) : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="relative shrink-0" style={{ width: px, height: px }}>
        {/* The halo. Extremely restrained: felt rather than seen, and dropped
            entirely at sm where a blur that size is only cost. */}
        {!compact && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              borderRadius: "50%",
              background: `radial-gradient(circle at 50% 54%, ${tint(11)} 0%, ${tint(5)} 45%, transparent 72%)`,
              filter: `blur(${px * 0.07}px)`,
              transform: "scale(1.5)",
              opacity: haloOpacity,
              animation: "orb-halo 9.1s ease-in-out infinite",
            }}
          />
        )}

        <div aria-hidden="true" className="absolute inset-0" style={body} />

        {/* The state mark. One SVG, sized to the body, carrying only the
            gesture that distinguishes this state from the other six. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="absolute inset-0"
          style={{ width: "100%", height: "100%", opacity: markOpacity, overflow: "visible" }}
        >
          <Mark state={state} ink={ink} compact={compact} />
        </svg>
      </div>

      {!hideWord && (
        <span
          className={`font-mono uppercase tracking-[0.25em] ${compact ? "text-[10px]" : "text-[11px]"}`}
          style={{ color: `color-mix(in srgb, ${ink} 62%, transparent)` }}
        >
          {word}
        </span>
      )}

      {/* Functional orbs only. An ambient orb is a brand object and has nothing
          to report, so giving it a status role would make every decorative orb
          on the site announce work that is not happening. */}
      {mode === "functional" && (
        <span role="status" aria-live="polite" className="sr-only">
          {announced}
        </span>
      )}
      {/* The accessible name, always present and always current, so the orb is
          readable even between live-region updates. */}
      <span className="sr-only">{`Ziiro orb: ${word}`}</span>
    </div>
  );
}

/**
 * The seven marks. Each is a different STRUCTURE rather than the same circle at
 * a different speed, because seven states that all read as a pulsing dot is the
 * failure this component exists to avoid: rings arriving, a sweep, a network, a
 * convergence, a rim pass, and a closed ring.
 */
function Mark({ state, ink, compact }: { state: OrbState; ink: string; compact: boolean }) {
  const line = compact ? 5 : 2.6;
  const common = { fill: "none", stroke: ink, strokeLinecap: "round" as const };

  if (state === "idle") return null;

  if (state === "listening") {
    // Rings arriving from outside and being taken in.
    const rings = compact ? [0] : [0, 1, 2];
    return (
      <g>
        {rings.map((i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r="40"
            {...common}
            strokeWidth={line}
            style={{
              transformOrigin: "50% 50%",
              animation: `orb-intake 2.9s ease-out ${i * 0.95}s infinite`,
            }}
          />
        ))}
      </g>
    );
  }

  if (state === "searching") {
    // A sweep around the limb: one bright arc with a faint trail behind it.
    return (
      <g style={{ transformOrigin: "50% 50%", animation: "orb-sweep 2.35s linear infinite" }}>
        <circle
          cx="50"
          cy="50"
          r="41"
          {...common}
          strokeWidth={line}
          strokeDasharray="34 224"
        />
        {!compact && (
          <circle
            cx="50"
            cy="50"
            r="41"
            {...common}
            strokeWidth={line}
            strokeDasharray="70 188"
            strokeDashoffset="-34"
            opacity="0.22"
          />
        )}
      </g>
    );
  }

  if (state === "connecting") {
    // Nodes on the rim with chords drawing between them.
    const pts = (compact ? [90, 210, 330] : [90, 150, 210, 270, 330, 30]).map((deg) => {
      const r = (deg * Math.PI) / 180;
      return [50 + 40 * Math.cos(r), 50 + 40 * Math.sin(r)] as const;
    });
    // Neighbours, not diameters. Chording across the middle drew a hard
    // angular star over the silhouette that read as a scribble rather than as
    // a network, and it fought the circular language of the object. Links
    // between adjacent nodes assemble around the rim instead.
    const chords = compact
      ? [[0, 1] as const]
      : ([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] as const);
    return (
      <g>
        {chords.map(([a, b], i) => (
          <line
            key={`c${i}`}
            x1={pts[a][0]}
            y1={pts[a][1]}
            x2={pts[b][0]}
            y2={pts[b][1]}
            {...common}
            strokeWidth={line * 0.8}
            strokeDasharray="130"
            style={{ animation: `orb-draw 3.1s ease-in-out ${i * 0.42}s infinite` }}
          />
        ))}
        {pts.map(([cx, cy], i) => (
          <circle
            key={`n${i}`}
            cx={cx}
            cy={cy}
            r={compact ? 7 : 3}
            fill={ink}
            stroke="none"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: `orb-node 2.6s ease-in-out ${i * 0.31}s infinite`,
            }}
          />
        ))}
      </g>
    );
  }

  if (state === "reasoning") {
    // Satellites drawing in toward an answer and releasing again.
    const sats = compact ? [0, 120, 240] : [0, 60, 120, 180, 240, 300];
    return (
      <g>
        {sats.map((deg, i) => {
          const r = (deg * Math.PI) / 180;
          return (
            <circle
              key={i}
              cx={50 + 38 * Math.cos(r)}
              cy={50 + 38 * Math.sin(r)}
              r={compact ? 7 : 3.4}
              fill={ink}
              stroke="none"
              style={{
                transformOrigin: "50% 50%",
                animation: `orb-converge 3.4s cubic-bezier(0.45,0,0.2,1) ${i * 0.13}s infinite`,
              }}
            />
          );
        })}
      </g>
    );
  }

  if (state === "working") {
    // A steady mechanical pass. Longer arc and constant speed, so it reads as
    // throughput rather than as the searching sweep's scan.
    return (
      <g style={{ transformOrigin: "50% 50%", animation: "orb-work 1.5s linear infinite" }}>
        <circle
          cx="50"
          cy="50"
          r="41"
          {...common}
          strokeWidth={line * 1.3}
          strokeDasharray="150 108"
        />
      </g>
    );
  }

  // complete: a closed ring that holds. Nothing loops, because a loop would
  // read as still working.
  //
  // The ring is STATIC rather than drawn on, and that is a correctness fix
  // rather than a simplification. It was a one-shot dash-offset animation, and
  // the off-screen pause froze it part-drawn: a completed orb scrolled out of
  // view came back showing a partial arc, which is exactly what `working`
  // looks like. An indicator that renders the wrong state when paused is worse
  // than one that never animates, so the resting appearance is now the closed
  // ring itself and only the settling pulse is animated.
  return (
    <g>
      <circle cx="50" cy="50" r="41" {...common} strokeWidth={line} />
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="none"
        stroke={ink}
        strokeWidth={line}
        style={{ transformOrigin: "50% 50%", animation: "orb-settle 1.1s ease-out both" }}
      />
    </g>
  );
}
