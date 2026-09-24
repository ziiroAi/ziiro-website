/**
 * The departments' path: a closed, slightly lumpy loop round the brain, and
 * where each department sits on it.
 *
 * The loop is a unit circle whose radius wanders by a few percent with a few
 * slow harmonics, so it is smooth all the way round (no corners) but uneven,
 * the way a drawn line would be. CSS scales it, `--loop-a` across and
 * `--loop-b` down (index.css), and sizes those from EXTENT so the labels round
 * it always fit.
 *
 * Angles are maths convention: 0 is right, anticlockwise positive, y up.
 * Screen y runs down, so a point's screen offset is (r cos θ, −r sin θ).
 */

/** [harmonic, amplitude, phase]. The second harmonic pulls the loop in a
 *  little at three and nine o'clock and lets it out at the top and bottom:
 *  the labels beside the loop need the width, and the height is free. The
 *  others make it uneven, the way a hand-drawn loop is: no two sides alike,
 *  and never a corner. */
const LUMPS = [
  [2, 0.045, 1.5 * Math.PI],
  [3, 0.03, (5 * Math.PI) / 6 + 0.9],
  [4, 0.012, 5.1],
  [5, 0.012, 2.0],
] as const;

/** Each department drifts in and out along its radius by up to this much,
 *  each on its own slow period, so the ring never moves as one rigid thing. */
const DRIFT = 0.025;
const DRIFT_RATES = [0.31, 0.47, 0.38, 0.55, 0.34, 0.42, 0.5, 0.36] as const;
const DRIFT_PHASES = [0.2, 2.4, 4.1, 1.3, 5.2, 3.3, 0.9, 2.8] as const;

const TAU = Math.PI * 2;

/** The loop's radius at `theta`, as a multiple of the base radius. */
export function loopRadius(theta: number): number {
  let r = 1;
  for (const [k, a, ph] of LUMPS) r += a * Math.sin(k * theta + ph);
  return r;
}

/**
 * How far the departments reach, in base radii, drift included: `x` is the
 * furthest any comes from the centre sideways, `y` up or down, and `min` the
 * nearest it comes in any direction. Measured off the loop itself, so it
 * follows any change to LUMPS or DRIFT. HeroStage publishes it for the CSS.
 */
export const EXTENT = (() => {
  let x = 0;
  let y = 0;
  let min = Infinity;
  for (let i = 0; i < 1440; i++) {
    const t = (i / 1440) * TAU;
    const r = loopRadius(t);
    x = Math.max(x, r * Math.abs(Math.cos(t)));
    y = Math.max(y, r * Math.abs(Math.sin(t)));
    min = Math.min(min, r);
  }
  return { x: x * (1 + DRIFT), y: y * (1 + DRIFT), min: min * (1 - DRIFT) };
})();

/** The loop's height over its width, before the lumps: a touch taller than
 *  round, where the hero has the room. */
export const LOOP_ASPECT = 1.05;

/** How far out the brain's fibres may show, in base radii: just inside the
 *  nearest any department ever comes (EXTENT.min), so no fibre reaches a
 *  department, let alone its label, which sits further out still. The brain
 *  box (index.css) reaches this far each side of the centre, and its fade ends
 *  at its edge. */
export const FIBRE_REACH = Math.floor((EXTENT.min - 0.02) * 100) / 100;

/** One lap of the departments, in seconds: the old orbit's 40s cycle, and one
 *  full turn of the brain (HeroBrain), so the two stay together. */
export const LAP_S = 40;

/** Where the active department sits: nine o'clock, facing the copy, as the
 *  old orbit's focus marker did. */
export const FOCUS = Math.PI;

/** The loop as an SVG path, in unit coordinates: 1 is the base radius. */
export function loopPath(samples = 240): string {
  let d = "";
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * TAU;
    const r = loopRadius(t);
    const x = r * Math.cos(t);
    const y = -r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(4)} ${y.toFixed(4)}`;
  }
  return `${d}Z`;
}

/**
 * Each department's angle at the start. Evenly spaced, 45° apart, then nudged
 * by a few degrees each so the ring reads as grown rather than ruled. 04
 * starts on the focus, as the old orbit's rest frame had it, so there is an
 * active department before anything moves.
 */
const NUDGE_DEG = [3, -4, 2, 0, -3, 4, -2, 3] as const;
export function startAngle(i: number, n: number): number {
  const base = FOCUS - (3 * TAU) / n + (i * TAU) / n;
  return base + ((NUDGE_DEG[i % NUDGE_DEG.length] * Math.PI) / 180);
}

export interface NodePlace {
  /** Offset from the loop's centre, in base radii (screen axes). */
  ox: number;
  oy: number;
  /** The way out from the loop at this point (screen axes), for the label. */
  nx: number;
  ny: number;
  /** 0 to 1: how active the department is, by how near it is to FOCUS. */
  act: number;
}

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** `a - b`, wrapped to -π..π. */
const signedApart = (a: number, b: number) => {
  const d = (((a - b) % TAU) + TAU) % TAU;
  return d > Math.PI ? d - TAU : d;
};

/**
 * Where department `i` of `n` is, `turn` radians after the start, `t` seconds
 * into the drift (0 holds it still). One radian of turn moves every department
 * one radian round, anticlockwise: top, then the copy's side, then the bottom.
 * The active one is the one at the focus. Each department is weighed against
 * the one on the far side of the focus from it, over the step between the two
 * (nudges included): fully lit within a quarter of that step, dark beyond
 * three quarters. The smoothstep is symmetric, so the pair always weighs
 * exactly one between them: as one leaves the next arrives, and there is
 * always one lit, and one caption on a phone.
 */
export function placeAt(i: number, n: number, turn: number, t: number): NodePlace {
  const theta = startAngle(i, n) + turn;
  // Before the focus (still arriving) the department ahead is the one leaving;
  // past it, the one behind is arriving.
  const d = signedApart(theta, FOCUS);
  const other = (i + (d < 0 ? 1 : n - 1)) % n;
  const step = Math.abs(signedApart(startAngle(other, n), startAngle(i, n)));
  const drift = t ? DRIFT * Math.sin(t * DRIFT_RATES[i % 8] + DRIFT_PHASES[i % 8]) : 0;
  const r = loopRadius(theta) * (1 + drift);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    ox: r * c,
    oy: -r * s,
    nx: c,
    ny: -s,
    act: 1 - smooth((Math.abs(d) - step / 4) / (step / 2)),
  };
}
