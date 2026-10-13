/**
 * The departments' path: one ring round the brain, and where each department
 * is on it.
 *
 * The ring is a circle of the loop's base radius, which is twice the brain's
 * half-width (BRAIN_HALF, brainFrame.ts), as in the owner's mockup. At the
 * start the eight departments sit where the mockup puts them, and they orbit
 * the ring continuously, one lap per turn of the brain, dragged with it; the
 * mockup's layout is the frame they start from. CSS scales the ring
 * (`--loop-a`, index.css) and sizes it from REACH, so the labels always fit.
 *
 * Angles are maths convention: 0 is right, anticlockwise positive, y up.
 * Screen y runs down, so a point's screen offset is (r cos θ, −r sin θ).
 */

/** Each department drifts in and out along its radius by up to this much,
 *  each on its own slow period, so the ring never moves as one rigid thing. */
const DRIFT = 0.03;
const DRIFT_RATES = [0.31, 0.47, 0.38, 0.55, 0.34, 0.42, 0.5, 0.36] as const;
const DRIFT_PHASES = [0.2, 2.4, 4.1, 1.3, 5.2, 3.3, 0.9, 2.8] as const;

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** How far the departments reach from the brain as they go round, in base
 *  radii, drift included, every way round. HeroStage publishes it for the
 *  CSS. */
export const REACH = 1 + DRIFT;

/**
 * Each department's angle at the start, 01 to 08, as the mockup has them.
 * Clockwise from the top: Sales at half past eleven, Marketing at one, Product
 * at half past two, Strategy at four, Technology at half past five, Finance at
 * half past seven, GTM at a quarter to nine, Operations at half past ten.
 */
const START_DEG = [330, 15, 60, 105, 135, 187.5, 225, 285] as const;
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
/** Beside the dot, the line nearest it sits level with it, as the mockup
 *  sets them: the role above the dot, the number below. Half a line, px. */
const LEVEL = 9;
/** Passing over or under the dot, the words clear its ring (9.5px), px. */
const CLEAR = 14;

/** Where the words cross from one side of the dot to the other, degrees:
 *  between Sales and Operations over the top, and between Finance and
 *  Technology under the bottom. Each crossing takes SLIDE. */
const CROSS_TOP = 120;
const CROSS_BOTTOM = 264;
const SLIDE = 6;

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
 * right of the dot round most of the ring, left of it on the copy's side
 * (Operations, GTM, Finance), sliding across in the two short crossings.
 */
function sideOf(theta: number): number {
  const d = (((theta / DEG) % 360) + 360) % 360;
  const half = SLIDE / 2;
  if (d < CROSS_TOP - half || d > CROSS_BOTTOM + half) return 1;
  if (d < CROSS_TOP + half) return 1 - 2 * smooth((d - CROSS_TOP + half) / SLIDE);
  if (d < CROSS_BOTTOM - half) return -1;
  return -1 + 2 * smooth((d - CROSS_BOTTOM + half) / SLIDE);
}

/**
 * Where department `i` of `n` is, `turn` radians of the brain after the
 * start, `t` seconds into the drift (0 holds it still). One radian of turn
 * moves every department one radian round, anticlockwise.
 *
 * The words hang above the dot on the upper half of the ring and below it on
 * the lower, beside it with their nearest line level with it, and drop clear
 * of it while they slide across.
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
  const r = t ? 1 + DRIFT * Math.sin(t * DRIFT_RATES[i % 8] + DRIFT_PHASES[i % 8]) : 1;
  const side = sideOf(theta);
  const beside = Math.abs(side);
  const ay = Math.max(-1, Math.min(1, -2.5 * Math.sin(theta)));
  return {
    ox: r * Math.cos(theta),
    oy: -r * Math.sin(theta),
    gx: BESIDE * side,
    gy: ay * (CLEAR * (1 - beside) - LEVEL * beside),
    ax: side,
    ay,
    theta,
    act: 1 - smooth((Math.abs(d) - step / 4) / (step / 2)),
  };
}
