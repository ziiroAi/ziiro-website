// (C) Where the camera looks. A framing is r17's Blender camera pose as plain numbers (worker-3's look.ts), so the
// main thread can fly between framings and send each frame's pose to the worker with the rotation (one message per
// frame). Scroll flights (W14-F) target a disc: the camera keeps r17's view direction, roll, lens and shift, aims at
// the gap and moves in until CLOSE_UP_HEIGHT of the model fills the frame's height.
import { DISCS, type DiscId } from "../data/contract";
import { GAPS } from "./gaps";
import { LOOK, type CameraLook, type Vec2, type Vec3 } from "./look";
import type { MeshSize } from "./rules";

export interface Framing {
  position: Vec3;
  target: Vec3;
  rollDeg: number;
  lensMm: number;
  shift: Vec2;
}

/** Everything one frame needs: the spine's rotation about its column and the camera's framing. */
export interface View {
  yaw: number;
  pitch: number;
  framing: Framing;
}

export type CameraTarget =
  | { kind: "overview" }
  | { kind: "disc"; disc: DiscId }
  | { kind: "framing"; framing: Framing };

/** Model height in frame for a disc close-up: the disc and half a vertebra each side. */
export const CLOSE_UP_HEIGHT = 0.2;
/** How long a flight takes. Under prefers-reduced-motion the camera cuts instead. */
export const FLIGHT_MS = 900;

export function baseFraming(size: MeshSize): Framing {
  const { position, target, rollDeg, lensMm, shift } = LOOK.camera[size];
  return { position, target, rollDeg, lensMm, shift };
}

/** tan of half the on-screen vertical angle: the lens over the sensor's long side, cut to the frame's shown rows. */
export function visibleTan(lens: CameraLook, lensMm = lens.lensMm): number {
  const [w, h] = lens.full;
  const tanLong = lens.sensorMm / 2 / lensMm;
  const tanFull = h >= w ? tanLong : (tanLong * h) / w;
  return (tanFull * lens.view[3]) / h;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const along = (from: Vec3, dir: Vec3, k: number): Vec3 => [from[0] + dir[0] * k, from[1] + dir[1] * k, from[2] + dir[2] * k];

export function framingFor(target: CameraTarget, size: MeshSize): Framing {
  const base = baseFraming(size);
  switch (target.kind) {
    case "overview":
      return base;
    case "framing":
      return target.framing;
    case "disc": {
      const centre = GAPS[DISCS.indexOf(target.disc)].centre;
      const back = sub(base.position, base.target);
      const distance = CLOSE_UP_HEIGHT / (2 * visibleTan(LOOK.camera[size], base.lensMm));
      return { ...base, target: centre, position: along(centre, back, distance / length(back)) };
    }
  }
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export function blendFraming(from: Framing, to: Framing, t: number): Framing {
  if (t <= 0) return from;
  if (t >= 1) return to;
  return {
    position: mix3(from.position, to.position, t),
    target: mix3(from.target, to.target, t),
    rollDeg: mix(from.rollDeg, to.rollDeg, t),
    lensMm: mix(from.lensMm, to.lensMm, t),
    shift: [mix(from.shift[0], to.shift[0], t), mix(from.shift[1], to.shift[1], t)],
  };
}

/** Cubic ease in and out. */
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
