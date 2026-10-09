// (C) W15-C4: the idle motion. The owner's model reads clean from its side and front (yaw -150° to +30°) and as lumps
// from behind (45°-135°: the processes face the camera and hide the discs; see the W15-C3 yaw map). So when idle it
// sweeps that window and back, eased to a stop at both ends, at the old spin's rate on average, and never turns its
// back. A drag can leave it anywhere; from there it eases into the window by the way that keeps off the back's
// middle (90°), then sweeps. Plain numbers, a new value every step, as orbit.ts.
import { SPIN_RATE } from "./orbit";

const DEG = Math.PI / 180;
const TURN = 2 * Math.PI;
/** The window's edges: +30° past the side view, and -150° round the front. */
export const SWEEP_HI = 30 * DEG;
export const SWEEP_LO = -150 * DEG;
/** The middle of the back: a yaw outside the window leaves by the edge on its own side of this. */
const BACK_MIDDLE = 90 * DEG;

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
    ({ from: yaw, to, lo, hi: lo + Math.PI, elapsedMs: 0, durationMs: legMs(yaw, to) });
  if (angle >= SWEEP_LO && angle <= SWEEP_HI) {
    const lo = base + SWEEP_LO;
    return leg(lo, angle - SWEEP_LO > SWEEP_HI - angle ? lo : base + SWEEP_HI);
  }
  if (angle > SWEEP_HI && angle <= BACK_MIDDLE) return leg(base + SWEEP_HI - Math.PI, base + SWEEP_HI);
  const lo = base + SWEEP_LO + (angle > 0 ? TURN : 0); // past the back's middle: on round to -150°
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
