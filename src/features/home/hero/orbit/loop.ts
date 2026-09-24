/**
 * The departments' path: a closed, uneven loop round the brain, and where each
 * department is on it.
 *
 * The loop is a circle about the brain whose radius wanders with four slow
 * harmonics, fitted to the owner's r8 mockup (brain/spline/r8-target.png): at
 * the start the eight departments sit where the mockup puts them, just
 * outside the brain's silhouette, at irregular angles and radii, and the loop
 * keeps close over the top and under the bottom, as the mockup's departments
 * do. It is smooth all the way round, no corners. CSS scales it (`--loop-a`,
 * index.css) and sizes it from EXTENT, so the labels always fit.
 *
 * The departments orbit it continuously, one lap per turn of the brain,
 * dragged with it; the mockup's layout is the frame they start from.
 *
 * Angles are maths convention: 0 is right, anticlockwise positive, y up.
 * Screen y runs down, so a point's screen offset is (r cos θ, −r sin θ).
 */

/** [harmonic, amplitude, phase], for `a sin(kθ + phase)`. */
const LUMPS = [
  [1, 0.0359, -0.4247],
  [2, 0.1373, 2.0549],
  [3, 0.0394, -0.0424],
  [4, 0.0174, -2.5423],
] as const;

/** Each department drifts in and out along its radius by up to this much,
 *  each on its own slow period, so the ring never moves as one rigid thing. */
const DRIFT = 0.03;
const DRIFT_RATES = [0.31, 0.47, 0.38, 0.55, 0.34, 0.42, 0.5, 0.36] as const;
const DRIFT_PHASES = [0.2, 2.4, 4.1, 1.3, 5.2, 3.3, 0.9, 2.8] as const;

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** The loop's radius at `theta`, as a multiple of the base radius. */
export function loopRadius(theta: number): number {
  let r = 1;
  for (const [k, a, ph] of LUMPS) r += a * Math.sin(k * theta + ph);
  return r;
}

/**
 * How far the departments reach from the brain as they go round, in base
 * radii, drift included: to the right, left, up and down. Measured off the
 * loop itself, so it follows any change above. HeroStage publishes it for the
 * CSS.
 */
export const EXTENT = (() => {
  let right = 0;
  let left = 0;
  let up = 0;
  let down = 0;
  for (let k = 0; k < 1440; k++) {
    const t = (k / 1440) * TAU;
    const r = loopRadius(t) * (1 + DRIFT);
    right = Math.max(right, r * Math.cos(t));
    left = Math.max(left, -r * Math.cos(t));
    up = Math.max(up, r * Math.sin(t));
    down = Math.max(down, -r * Math.sin(t));
  }
  return { right, left, up, down };
})();

/**
 * Each department's angle at the start, 01 to 08, as the mockup has them:
 * Strategy low right, Product right, Marketing top right, Sales top,
 * Operations upper left, GTM low left, Finance bottom left, Technology bottom
 * right.
 */
const START_DEG = [341.2, 15.9, 46.5, 131.5, 150, 209, 235.8, 300] as const;
export function startAngle(i: number): number {
  return START_DEG[i % START_DEG.length] * DEG;
}

/** One lap of the departments, in seconds, and one full turn of the brain
 *  (HeroBrain), so the two stay together. */
export const LAP_S = 40;

/** Where the "active" department sits, for the phone caption: nine o'clock,
 *  facing the copy. */
export const FOCUS = Math.PI;

/** How far the words sit beside the dot, px: past the ring and a little air.
 *  `.zo-words` in index.css places them from --gx / --gy. */
const BESIDE = 19;

export interface NodePlace {
  /** Offset from the brain's centre, in base radii (screen axes). */
  ox: number;
  oy: number;
  /** The words' anchor, px from the dot. */
  gx: number;
  gy: number;
  /** Which way the words hang off the anchor, -1 to 1: left or right of it,
   *  above or below it. */
  ax: number;
  ay: number;
  /** The department's angle now. */
  theta: number;
  /** 0 to 1: how near the department is to FOCUS (the phone caption). */
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
 * Which side of its dot a department's words go, as the mockup sets them:
 * right of the dot round most of the loop, left of it on the copy's side
 * (from just past Sales, round to just past Finance), sliding across in the
 * two short stretches between.
 */
function sideOf(theta: number): number {
  const d = (((theta / DEG) % 360) + 360) % 360;
  if (d <= 138 || d >= 285) return 1;
  if (d < 144) return 1 - 2 * smooth((d - 138) / 6);
  if (d <= 255) return -1;
  return -1 + 2 * smooth((d - 255) / 30);
}

/**
 * Where department `i` of `n` is, `turn` radians of the brain after the
 * start, `t` seconds into the drift (0 holds it still). One radian of turn
 * moves every department one radian round, anticlockwise.
 *
 * `act` weighs each department against the one on the far side of the focus
 * from it, over the step between the two: fully lit within a quarter of that
 * step, dark beyond three quarters. The smoothstep is symmetric, so the pair
 * always weighs exactly one between them, and the phone always shows one
 * caption.
 */
export function placeAt(i: number, n: number, turn: number, t: number): NodePlace {
  const theta = startAngle(i) + turn;
  const d = signedApart(theta, FOCUS);
  const other = (i + (d < 0 ? 1 : n - 1)) % n;
  const step = Math.abs(signedApart(startAngle(other), startAngle(i)));
  const drift = t ? DRIFT * Math.sin(t * DRIFT_RATES[i % 8] + DRIFT_PHASES[i % 8]) : 0;
  const r = loopRadius(theta) * (1 + drift);
  const side = sideOf(theta);
  const ay = Math.max(-1, Math.min(1, -2.5 * Math.sin(theta)));
  return {
    ox: r * Math.cos(theta),
    oy: -r * Math.sin(theta),
    gx: BESIDE * side,
    gy: 2 * ay,
    ax: side,
    ay,
    theta,
    act: 1 - smooth((Math.abs(d) - step / 4) / (step / 2)),
  };
}
