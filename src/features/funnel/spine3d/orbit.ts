// (C) W14-C §2: the spine's rotation as plain numbers. A drag turns it (yaw free, pitch clamped to about ±20°), a
// release keeps it turning and slowing (inertia), and when nobody holds it, it spins slowly. Every function returns
// a new orbit, so the viewer can hand the same values to a worker without sharing state.

export interface Orbit {
  readonly yaw: number;
  readonly pitch: number;
  /** Radians per millisecond. */
  readonly yawSpeed: number;
  readonly pitchSpeed: number;
  readonly held: boolean;
}

export interface Motion {
  /** The slow idle spin. Off under prefers-reduced-motion. */
  spin: boolean;
  /** Turning on after a release. Off under prefers-reduced-motion. */
  inertia: boolean;
}

export const PITCH_LIMIT = (20 * Math.PI) / 180;
/** Radians per second of idle spin: a full turn in about 42 s. */
export const SPIN_RATE = 0.15;
/** Radians turned per CSS pixel dragged. A 390 px wide swipe turns it about 180°. */
const RADIANS_PER_PX = Math.PI / 390;
/** How quickly a flung spine slows: its speed falls to 1/e in this many milliseconds. */
const INERTIA_MS = 450;
/** Below this speed (rad/ms) a flung spine has stopped. */
const STOP_SPEED = 0.00002;
const MIN_DT_MS = 1;

export const REST: Orbit = Object.freeze({ yaw: 0, pitch: 0, yawSpeed: 0, pitchSpeed: 0, held: false });

const clampPitch = (pitch: number): number => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

export const grab = (orbit: Orbit): Orbit => ({ ...orbit, held: true, yawSpeed: 0, pitchSpeed: 0 });

export function dragBy(orbit: Orbit, dxPx: number, dyPx: number, dtMs: number): Orbit {
  const dt = Math.max(dtMs, MIN_DT_MS);
  const yawTurn = dxPx * RADIANS_PER_PX;
  const pitch = clampPitch(orbit.pitch + dyPx * RADIANS_PER_PX);
  return { ...orbit, yaw: orbit.yaw + yawTurn, pitch, yawSpeed: yawTurn / dt, pitchSpeed: (pitch - orbit.pitch) / dt };
}

export function release(orbit: Orbit, { inertia }: Pick<Motion, "inertia">): Orbit {
  return inertia ? { ...orbit, held: false } : { ...orbit, held: false, yawSpeed: 0, pitchSpeed: 0 };
}

/** Moves the orbit on by dtMs. `moving` is false once nothing changes, so the viewer can stop drawing. */
export function step(orbit: Orbit, dtMs: number, motion: Motion): { orbit: Orbit; moving: boolean } {
  if (orbit.held) return { orbit, moving: false };
  const flung = motion.inertia && Math.abs(orbit.yawSpeed) + Math.abs(orbit.pitchSpeed) > STOP_SPEED;
  if (flung) {
    const decay = Math.exp(-dtMs / INERTIA_MS);
    const next: Orbit = {
      ...orbit,
      yaw: orbit.yaw + orbit.yawSpeed * dtMs,
      pitch: clampPitch(orbit.pitch + orbit.pitchSpeed * dtMs),
      yawSpeed: orbit.yawSpeed * decay,
      pitchSpeed: orbit.pitchSpeed * decay,
    };
    return { orbit: next, moving: true };
  }
  const settled: Orbit = orbit.yawSpeed || orbit.pitchSpeed ? { ...orbit, yawSpeed: 0, pitchSpeed: 0 } : orbit;
  if (!motion.spin) return { orbit: settled, moving: false };
  return { orbit: { ...settled, yaw: settled.yaw + (SPIN_RATE * dtMs) / 1000 }, moving: true };
}
