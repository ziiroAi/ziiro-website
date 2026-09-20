/**
 * A critically damped spring, integrated on rAF.
 *
 * WHY NOT A CSS TRANSITION. The Apple rules in force on this site say that
 * anything pointer-driven must animate from its CURRENT on-screen value so it
 * can be grabbed and reversed mid-flight. A CSS transition cannot do that: it
 * interpolates from wherever it was told to start toward a fixed end, and
 * changing the target restarts the curve, which reads as a stutter every time
 * the pointer moves. A spring carries position AND velocity forward, so a new
 * target is simply a new force on a mass that is already moving.
 *
 * WHY NOT framer-motion. It is a dependency of this project, but nothing in
 * the Products chunk imports it today (measured: zero `framer` references in
 * the built chunk), so reaching for `useSpring` would pull the library into a
 * page that currently does without it. The performance budget on this site is
 * tight enough that thirty lines of arithmetic is the better trade.
 *
 * THE MODEL. For a damping ratio of exactly 1 the system returns to rest in
 * the shortest time that involves no overshoot, which is what the brief asks
 * for: nothing on this page is a flick, so nothing should bounce.
 *
 *   omega = 2*pi / response
 *   a     = -omega^2 * (x - target) - 2 * omega * v
 *
 * `response` is the approximate settle time in seconds. The house value is
 * 0.35, inside the 0.3 to 0.4 the brief specifies.
 */

export const SPRING_RESPONSE = 0.35;

/** Longest step the integrator will take. A backgrounded tab hands back a
 *  multi-second delta, and feeding that to the integrator throws the spring
 *  across the screen. Clamping to two frames at 30fps keeps it stable. */
const MAX_STEP = 1 / 30;

export interface Spring {
  /** Current value, safe to read every frame. */
  value: number;
  /** Move the target. The spring continues from its current value and
   *  velocity, which is what makes it interruptible. */
  setTarget(next: number): void;
  /** Jump to a value with no motion. For first placement, resizes, and the
   *  reduced-motion path. */
  jumpTo(next: number): void;
  /** True while the spring still has somewhere to go. */
  readonly settled: boolean;
}

export function createSpring(initial: number, response = SPRING_RESPONSE): Spring {
  let value = initial;
  let target = initial;
  let velocity = 0;
  const omega = (2 * Math.PI) / response;

  return {
    get value() {
      return value;
    },
    get settled() {
      return Math.abs(value - target) < 0.01 && Math.abs(velocity) < 0.01;
    },
    setTarget(next: number) {
      target = next;
    },
    jumpTo(next: number) {
      value = target = next;
      velocity = 0;
    },
    /** Advance by `dt` seconds. Exposed through the interface below. */
    step(dt: number) {
      const h = Math.min(dt, MAX_STEP);
      velocity += (-omega * omega * (value - target) - 2 * omega * velocity) * h;
      value += velocity * h;
      // Snap when the remaining distance is under a pixel's worth of motion,
      // so the rAF loop can stop rather than integrating forever.
      if (Math.abs(value - target) < 0.01 && Math.abs(velocity) < 0.01) {
        value = target;
        velocity = 0;
      }
    },
  } as Spring & { step(dt: number): void };
}

export type SteppableSpring = Spring & { step(dt: number): void };
