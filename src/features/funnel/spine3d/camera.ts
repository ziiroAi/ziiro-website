// (C) Where the camera looks. A framing is plain numbers, so the main thread can fly between framings and send each
// frame's framing to the worker with the rotation (one message per frame). Scroll flights (W14-F) target a disc.
import { DISCS, type DiscId } from "../data/contract";
import { GAPS } from "./gaps";

export interface Framing {
  fovDeg: number;
  /** Model height that fills the box, at the column. */
  visibleHeight: number;
  /** Model Y the box is centred on. */
  centreY: number;
  /** Where the column sits across the box, 0 left to 1 right. */
  columnX: number;
}

/** Everything one frame needs: the spine's rotation and the camera's framing. */
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

export function framingFor(target: CameraTarget, base: Framing): Framing {
  switch (target.kind) {
    case "overview":
      return base;
    case "framing":
      return target.framing;
    case "disc":
      return { ...base, centreY: GAPS[DISCS.indexOf(target.disc)].centre[1], visibleHeight: CLOSE_UP_HEIGHT };
  }
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export function blendFraming(from: Framing, to: Framing, t: number): Framing {
  if (t <= 0) return from;
  if (t >= 1) return to;
  return {
    fovDeg: mix(from.fovDeg, to.fovDeg, t),
    visibleHeight: mix(from.visibleHeight, to.visibleHeight, t),
    centreY: mix(from.centreY, to.centreY, t),
    columnX: mix(from.columnX, to.columnX, t),
  };
}

/** Cubic ease in and out. */
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
