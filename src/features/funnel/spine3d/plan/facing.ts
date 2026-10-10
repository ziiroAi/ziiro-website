// (C) W18-D: which way each disc's glowing front faces, and the turn that points it at a department's text. The
// owner: "i want the light part to be facing the text corresponding to it. the spine should rotate accordingly".
// The ring's glow brightens toward the camera, and the vertebra's arch and processes hide its back, so what reads as
// the lit part is the disc's front (anterior) side. Turning that front toward the text turns the glow toward it.
import { baseFraming } from "../camera";
import { LOOK } from "../look";
import type { MeshSize } from "../rules";
import { add, dot, normalize, scale, sub, type Vec3 } from "./vec";

/**
 * Each gap's front, bottom first (disc k is gap k), in the model's own space: the unit vector in the disc's plane
 * pointing away from the mean of the vertices beyond 1.3x the disc's radius within 0.06 of its plane (the arch and
 * processes). W19: measured on public/spine/3d/m5/spine-desktop.glb (the owner's coil, placed) by worker-3 with W18-D's
 * rule (w19 anterior.mjs); W19-RING: gaps 0, 2 and 3 measured again on m5b at their new centres. A new mesh with new
 * geometry, or a gap moved, needs it measured again.
 */
export const ANTERIOR: readonly Vec3[] = [
  [0.9946, -0.0157, 0.103],
  [0.9857, 0.1038, 0.1326],
  [0.9813, 0.1550, 0.1142],
  [0.9944, 0.1011, 0.0312],
  [0.9910, 0.0533, 0.1225],
  [0.9966, -0.0638, 0.0514],
  [0.9948, -0.0917, 0.0453],
  [0.9922, -0.0844, 0.0915],
  [0.9960, -0.0832, 0.0319],
];

const DEG = Math.PI / 180;
/** Where the front points at a stop, from straight at the camera (0) toward the text's side of the screen: far enough
 *  round to point at the text, not so far that the glowing arc turns edge-on. */
export const FACE_ANGLE = 60 * DEG;

const AXIS = normalize(LOOK.model.axis);
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** v turned by `turn` radians about the column's axis (scene.ts's yaw, right-handed). */
function aboutAxis(v: Vec3, turn: number): Vec3 {
  const c = Math.cos(turn);
  return add(add(scale(v, c), scale(cross(AXIS, v), Math.sin(turn))), scale(AXIS, dot(AXIS, v) * (1 - c)));
}

/** A model-space point where the turn carries it: the model spins about LOOK.model.axis through LOOK.model.pivot. */
export const turnedCentre = (point: Vec3, turn: number): Vec3 =>
  add(LOOK.model.pivot, aboutAxis(sub(point, LOOK.model.pivot), turn));

/** Radians from straight at the camera to where gap k's front points on screen, positive toward the right. */
export function screenAngle(k: number, turn: number, size: MeshSize): number {
  const { position, target } = baseFraming(size);
  const toCamera = normalize(sub(position, target));
  const right = normalize(cross(scale(toCamera, -1), [0, 1, 0]));
  const front = aboutAxis(ANTERIOR[k], turn);
  return Math.atan2(dot(front, right), dot(front, toCamera));
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const COARSE_STEPS = 360;
const NEWTON_STEPS = 8;
const NEWTON_H = 1e-5;

/** The turn, in (-pi, pi], that points gap k's front FACE_ANGLE toward a stop's text: right of a left stop, left of a
 *  right stop. A whole-degree search, then Newton on the angle's error. */
export function faceTurn(k: number, side: "left" | "right", size: MeshSize): number {
  const want = side === "left" ? FACE_ANGLE : -FACE_ANGLE;
  const error = (turn: number) => wrap(screenAngle(k, turn, size) - want);
  let best = 0;
  for (let i = 0; i < COARSE_STEPS; i += 1) {
    const turn = -Math.PI + ((i + 1) * 2 * Math.PI) / COARSE_STEPS;
    if (Math.abs(error(turn)) < Math.abs(error(best))) best = turn;
  }
  for (let i = 0; i < NEWTON_STEPS; i += 1) {
    const slope = (error(best + NEWTON_H) - error(best - NEWTON_H)) / (2 * NEWTON_H);
    if (slope === 0) break;
    best -= error(best) / slope;
  }
  return wrap(best);
}

/** turn moved by whole turns to lie within half a turn of `previous`, so blending from one to the other goes the short
 *  way round. */
export const nearestTurn = (turn: number, previous: number): number => previous + wrap(turn - previous);
