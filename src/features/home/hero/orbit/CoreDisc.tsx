/**
 * The core: a white disc with a soft orange edge, a frosted band of radial
 * ticks to r 62, and a dashed white ring over the brain beyond that.
 * "CORE / BRAIN" is set in the disc.
 *
 * It is its own layer, ABOVE the stage and NOT clipped by it: the disc runs
 * 16 px past the stage's right rule on the reference, and inside the clip it
 * would be sliced flat. The parent is a square box
 * centred on C, 124 su × s; the drawing is in su about C, and the dashed ring
 * and halo spill past the box on purpose.
 *
 * Static by design. The orbit's per-step ring (drawn under this disc) is what
 * makes the core react, so this layer needs no pause logic.
 */

import { useRef, type CSSProperties } from "react";

import { INK, orangeTint } from "./palette";
import { stageScaleCss, useStageScale } from "./useStageScale";

interface CoreDiscProps {
  className?: string;
}

const TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);
const RAD = Math.PI / 180;

/** The words' tracking at full size, fitted to the reference ink. */
const TRACK_EM = 0.11;
/** When the words are held at the floor the disc keeps shrinking around them,
 *  so the tracking closes up: at s ≈ 0.51 (a 360 phone) "BRAIN" at 0.11em
 *  touched the hairline; at 0.03em it clears it. */
const TRACK_EM_FLOORED = 0.03;
/** Baselines about C (su inside the scaled group). The reference sets them
 *  at −4.4 / +14; held at the floor the pair also closes up and centres on C,
 *  which takes "BRAIN"'s corners from 0.5px to ~2px inside the hairline at
 *  360. */
const BASELINES = { core: -4.4, brain: 14 } as const;
const BASELINES_FLOORED = { core: -4.1, brain: 12.1 } as const;
const FONT = 11;
/** Trailing letter-spacing shifts a middle-anchored word left by half a
 *  space; this puts the ink back on C. */
const centreFix = (track: number) => (track * FONT) / 2;

/**
 * Halo stops at r 40 / 60 su, fading to nothing at r 84. A middle stop of 0.08 was tried; taking it
 * to 0 measured closer to the reference's radial profile over r 62–78 (total
 * luma error 65 vs 84) at the same core SSIM (.700 vs .702), so the halo now
 * ends with the frosted band.
 */
const HALO_STOPS = [0.35, 0] as const;


/** The box's width in su, and the smallest size the words may render at. */
const BOX_SU = 124;
const FLOOR_PX = 10;

/**
 * The words' scale and floor state are CSS variables on the root, derived from
 * `--zc-s` (CSS px per su, from the stage's `--s`; see useStageScale): `--zc-k`
 * is the counter-scale and `--zc-f` is 1 while the words are held at the
 * floor, else 0. The words read them, so the floored tracking and baselines
 * follow the scale in CSS alone, before and without JavaScript.
 */
const CORE_CSS =
  stageScaleCss(".zc-root", "zc-s") +
  `.zc-root{--zc-k:max(1, calc(${FLOOR_PX} / ${FONT} / var(--zc-s, 1)));` +
  `--zc-f:clamp(0, (var(--zc-k) - 1) * 100000, 1)}`;

const r3 = (n: number) => Math.round(n * 1000) / 1000;
/** `full` at full size, `floored` at the floor, switched by `--zc-f`. */
const byFloor = (full: number, floored: number, unit: string) =>
  `calc(${full}${unit} + ${r3(floored - full)}${unit} * var(--zc-f, 0))`;

const WORDS_GROUP: CSSProperties = {
  transform: "scale(var(--zc-k, 1))",
  transformOrigin: "0 0",
};
/** Drawn at the full-size design; the floored tracking and the shift that
 *  keeps it centred on its baseline come from `--zc-f`. */
const wordStyle = (line: keyof typeof BASELINES): CSSProperties => ({
  letterSpacing: byFloor(TRACK_EM, TRACK_EM_FLOORED, "em"),
  transform: `translate(${byFloor(0, centreFix(TRACK_EM_FLOORED) - centreFix(TRACK_EM), "px")}, ${byFloor(0, BASELINES_FLOORED[line] - BASELINES[line], "px")})`,
});

export default function CoreDisc({ className }: CoreDiscProps) {
  const ref = useRef<HTMLDivElement>(null);
  // The words hold the mono floor, 10px, however small the stage gets, and
  // no more: at 11px "BRAIN" crosses the disc's hairline on a 360 phone
  // (s ≈ 0.53, disc ≈ 44px across); at 10px it clears it by ~3px a side.
  // Nothing until measured, so the server and the first client render agree;
  // CORE_CSS already has the same value from the stage's `--s`.
  const s = useStageScale(ref, BOX_SU);
  const measured = s === null ? undefined : ({ "--zc-s": s } as CSSProperties);

  return (
    <div
      ref={ref}
      data-hero="core"
      className={`zc-root relative h-full w-full ${className ?? ""}`}
      style={measured}
    >
      <style dangerouslySetInnerHTML={{ __html: CORE_CSS }} />
      <svg
        className="block h-full w-full overflow-visible font-hero-mono"
        viewBox="-62 -62 124 124"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="zc-halo" cx="0" cy="0" r="84" gradientUnits="userSpaceOnUse">
            <stop offset="0.48" stopColor={orangeTint(0.2)} stopOpacity={HALO_STOPS[0]} />
            <stop offset="0.72" stopColor={orangeTint(0.1)} stopOpacity={HALO_STOPS[1]} />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="zc-disc" cx="0" cy="0" r="41" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.8" stopColor={orangeTint(0.03)} />
            <stop offset="1" stopColor={orangeTint(0.06)} />
          </radialGradient>
        </defs>

        {/* Halo and frosted band. Both are kept thin: in the reference the
            dense fibres meeting the core show through just outside the band
            (r 64–71 reads 161 → 139 luma), so a bright halo there washes the
            join out. Values fitted to the reference's radial luma profile. */}
        <circle r={84} fill="url(#zc-halo)" />
        <circle r={62} fill={orangeTint(0.25)} fillOpacity={0.3} />
        <circle r={62} fill="#FFFFFF" fillOpacity={0.2} />
        <circle r={62} fill="none" stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth={1.2} />
        <circle r={56.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={0.8} />
        <circle
          r={73}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeDasharray="2.5 3.5"
          strokeOpacity={0.45}
        />

        {/* Radial ticks through the band, every 7.5°; every other one runs the
            full band and the rest stop short, which reads as panels. */}
        {TICKS.map((deg, i) => {
          const r0 = 44;
          const r1 = i % 2 === 0 ? 61 : 52;
          const c = Math.cos(deg * RAD);
          const s = Math.sin(deg * RAD);
          return (
            <line
              key={deg}
              x1={r0 * c}
              y1={r0 * s}
              x2={r1 * c}
              y2={r1 * s}
              stroke={i % 2 === 0 ? orangeTint(0.45) : "#FFFFFF"}
              strokeOpacity={0.8}
              strokeWidth={0.6}
            />
          );
        })}

        {/* The disc, with one soft edge. The reference's edge peaks at r 43
            as a pale tint (this one matches its luminance), not a saturated
            hairline at r 41, and there is no second ring outside it. */}
        <circle r={41.75} fill="url(#zc-disc)" stroke={orangeTint(0.75)} strokeWidth={1.5} />

        <g style={WORDS_GROUP}>
          <text
            x={centreFix(TRACK_EM)}
            y={BASELINES.core}
            textAnchor="middle"
            fontSize={FONT}
            fontWeight={500}
            fill={INK}
            style={wordStyle("core")}
          >
            CORE
          </text>
          <text
            x={centreFix(TRACK_EM)}
            y={BASELINES.brain}
            textAnchor="middle"
            fontSize={FONT}
            fontWeight={500}
            fill={INK}
            style={wordStyle("brain")}
          >
            BRAIN
          </text>
        </g>
      </svg>
    </div>
  );
}
