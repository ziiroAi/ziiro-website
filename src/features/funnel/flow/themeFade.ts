/**
 * (C) W18-B: the light/dark crossfade's clock, shared by the page (tokens.css) and the 3D (scene.ts, in the worker).
 * The page's colours ease over THEME_FADE_MS with CSS ease-in-out; the 3D fades its last old-look frame out on the
 * same curve from the same start, so neither switches before the other. Pure: no DOM, no three.js.
 */

/** The crossfade's length. tokens.css's 450ms must match it. */
export const THEME_FADE_MS = 450;

/** A crossfade under way: `start` in epoch ms (performance.timeOrigin + performance.now()), so the page and the
 *  worker, whose performance.now() clocks start apart, read the same moment. */
export interface ThemeFade {
  start: number;
  ms: number;
}

/** Epoch ms, comparable across the page and its workers. */
export const fadeClock = (): number => performance.timeOrigin + performance.now();

// cubic-bezier(0.42, 0, 0.58, 1): x(t) and y(t) for the curve's parameter t.
const X1 = 0.42;
const X2 = 0.58;
const bezier = (t: number, p1: number, p2: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
const bezierSlope = (t: number, p1: number, p2: number) =>
  3 * (1 - t) * (1 - t) * p1 + 6 * (1 - t) * t * (p2 - p1) + 3 * t * t * (1 - p2);
const NEWTON_STEPS = 8;
const BISECT_STEPS = 30;
const EPSILON = 1e-7;

/** The parameter t where the curve's x is `x`: Newton's method, with bisection where the slope is too flat. */
function solveT(x: number): number {
  let t = x;
  for (let i = 0; i < NEWTON_STEPS; i++) {
    const error = bezier(t, X1, X2) - x;
    if (Math.abs(error) < EPSILON) return t;
    const slope = bezierSlope(t, X1, X2);
    if (Math.abs(slope) < 1e-6) break;
    t -= error / slope;
  }
  let low = 0;
  let high = 1;
  t = x;
  for (let i = 0; i < BISECT_STEPS; i++) {
    if (bezier(t, X1, X2) < x) low = t;
    else high = t;
    t = (low + high) / 2;
  }
  return t;
}

/** CSS ease-in-out: progress 0-1 in, eased progress 0-1 out. */
export function cssEaseInOut(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return bezier(solveT(x), 0, 1);
}

/** How much of the old look's snapshot still shows at `now`: 1 until the fade starts, 0 once it ends, else eased. */
export function fadeAlpha(now: number, fade: ThemeFade | null): number {
  if (!fade || fade.ms <= 0) return 0;
  return 1 - cssEaseInOut((now - fade.start) / fade.ms);
}

/** The visitor's clock switches the theme at these hours (boot.ts's LIGHT_FROM_HOUR and DARK_FROM_HOUR). */
const SWITCH_HOURS = [6, 18] as const;

/** Ms from `now` to the next 06:00 or 18:00 local time; at the switch itself, the one after. */
export function msToNextClockSwitch(now: Date): number {
  const next = SWITCH_HOURS.map((hour) => {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
    return at.getTime() - now.getTime();
  });
  return Math.min(...next);
}
