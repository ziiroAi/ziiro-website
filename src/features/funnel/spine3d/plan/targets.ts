// (C) W14-F (a): each department stop (§5.5) as a camera pose aimed at that department's disc (§6.7).
// Pure: the viewer passes look.ts's gaps and r17 camera in, and maps a pose onto its own camera.
import type { DiscId } from "../../data/contract";
import { add, dot, normalize, scale, sub, type Vec3 } from "./vec";

/** One disc as look.ts's gaps give it, glTF model space. */
export interface DiscGeometry {
  centre: Vec3;
  normal: Vec3;            // unit, up the column
  grooveRadius: number;
}

/** The parts of look.ts's CameraLook this module reads. */
export interface CameraLook {
  position: Vec3;
  target: Vec3;
  rollDeg: number;
  lensMm: number;
  sensorMm: number;        // across the frame's longer side
  full: readonly [number, number];
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  rollDeg: number;
  fovDeg: number;          // vertical
}

export type Variant = "desktop" | "phone";

/** The close-up's lens and how much of the frame's smaller side the disc's width fills. The phone band is small,
 *  so its disc fills more: that is also what lets it pass the 44 px tap rule (tap.ts). Owner judges by eye. */
export const CLOSE_UP: Readonly<Record<Variant, { fovDeg: number; fill: number }>> = {
  desktop: { fovDeg: 30, fill: 0.42 },
  phone: { fovDeg: 30, fill: 0.6 },
};

/** How far above the disc's own plane the close-up sits, as a share of the way along: about 14 degrees. */
const ELEVATION = 0.25;
const END_DISCS: readonly DiscId[] = ["G00", "G08"];

export const discIndex = (disc: DiscId): number => Number(disc.slice(1));

const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** r17's own camera, the plan's first beat: every department disc in frame. */
export function overviewPose(look: CameraLook): CameraPose {
  const [w, h] = look.full;
  const sensorHeight = w >= h ? (look.sensorMm * h) / w : look.sensorMm;
  return {
    position: look.position,
    target: look.target,
    rollDeg: look.rollDeg,
    fovDeg: toDeg(2 * Math.atan(sensorHeight / 2 / look.lensMm)),
  };
}

/** A close-up on one disc, from the hero camera's side of the column, a little above the disc's plane. */
export function closeUpPose(disc: DiscGeometry, hero: CameraLook, variant: Variant, aspect: number): CameraPose {
  const { fovDeg, fill } = CLOSE_UP[variant];
  const normal = normalize(disc.normal);
  const toHero = sub(hero.position, disc.centre);
  const sideways = normalize(sub(toHero, scale(normal, dot(toHero, normal))));
  const direction = normalize(add(sideways, scale(normal, ELEVATION)));
  const halfExtent = Math.tan(toRad(fovDeg) / 2) * Math.min(1, aspect);
  const distance = disc.grooveRadius / (fill * halfExtent);
  return { position: add(disc.centre, scale(direction, distance)), target: disc.centre, rollDeg: 0, fovDeg };
}

/** The overview, then one close-up per stop, in the plan's scroll order. */
export function stopPoses(
  stops: readonly { disc: DiscId }[],
  discs: readonly DiscGeometry[],
  hero: CameraLook,
  variant: Variant,
  aspect: number,
): CameraPose[] {
  const closeUps = stops.map(({ disc }) => {
    if (END_DISCS.includes(disc)) throw new Error(`${disc} is an end disc and belongs to no department`);
    const geometry = discs[discIndex(disc)];
    if (!geometry) throw new Error(`no geometry for ${disc}`);
    return closeUpPose(geometry, hero, variant, aspect);
  });
  return [overviewPose(hero), ...closeUps];
}
