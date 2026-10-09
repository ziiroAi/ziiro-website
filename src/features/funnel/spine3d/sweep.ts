// (C) W15-C4, narrowed by W16-A: the idle motion. The owner wants the hero's spine held near r17's three-quarter view
// (wave16.md W16-A), so when idle it sways ±25° about it and back, eased to a stop at both ends, at the old spin's
// rate on average. A drag can leave it anywhere; from there it eases into the window the short way round, then
// sways. Plain numbers, a new value every step, as orbit.ts.
import { SPIN_RATE } from "./orbit";

const DEG = Math.PI / 180;
const TURN = 2 * Math.PI;
/** The window's edges, either side of r17's view (yaw 0). */
export const SWEEP_HI = 25 * DEG;
export const SWEEP_LO = -25 * DEG;
const WIDTH = SWEEP_HI - SWEEP_LO;
/** Opposite the window's middle: a yaw outside the window leaves by the edge on its own side of this. */
const BACK_MIDDLE = (SWEEP_HI + SWEEP_LO) / 2 + Math.PI;

export interface Sweep {
  readonly from: number;
  readonly to: number;
  /** The window in absolute yaw, keeping the whole turns a drag added. */
  readonly lo: number;
  readonly hi: number;
  readonly elapsedMs: number;
  readonly durationMs: number;
}

/** Yaw wrapped to [-180°, 180°). */
const wrap = (yaw: number): number => yaw - TURN * Math.floor((yaw + Math.PI) / TURN);
/** A leg takes as long as the old spin took over the same angle. */
const legMs = (from: number, to: number): number => (Math.abs(to - from) / SPIN_RATE) * 1000;
/** Sine ease: still at both ends, at most π/2 times the mean speed in the middle. */
const ease = (t: number): number => (1 - Math.cos(Math.PI * t)) / 2;

/** The first leg from where the model is now: inside the window, to its farther edge; outside it, to the near edge. */
export function enterSweep(yaw: number): Sweep {
  const angle = wrap(yaw);
  const base = yaw - angle;
  const leg = (lo: number, to: number): Sweep =>
    ({ from: yaw, to, lo, hi: lo + WIDTH, elapsedMs: 0, durationMs: legMs(yaw, to) });
  if (angle >= SWEEP_LO && angle <= SWEEP_HI) {
    const lo = base + SWEEP_LO;
    return leg(lo, angle - SWEEP_LO > SWEEP_HI - angle ? lo : base + SWEEP_HI);
  }
  if (angle > SWEEP_HI && angle <= BACK_MIDDLE) return leg(base + SWEEP_LO, base + SWEEP_HI);
  const lo = base + SWEEP_LO + (angle > BACK_MIDDLE ? TURN : 0); // past the back's middle: on round to the low edge
  return leg(lo, lo);
}

/** Moves the sweep on by dtMs; at an edge it turns and heads for the other. */
export function stepSweep(sweep: Sweep, dtMs: number): { sweep: Sweep; yaw: number } {
  let next: Sweep = { ...sweep, elapsedMs: sweep.elapsedMs + dtMs };
  while (next.elapsedMs >= next.durationMs) {
    const to = next.to === next.lo ? next.hi : next.lo;
    next = { ...next, from: next.to, to, elapsedMs: next.elapsedMs - next.durationMs, durationMs: legMs(next.to, to) };
  }
  return { sweep: next, yaw: next.from + (next.to - next.from) * ease(next.elapsedMs / next.durationMs) };
}
