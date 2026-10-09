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
 * processes). Measured on public/spine/3d/m4/spine-desktop.glb (m3's geometry) by worker-4's W18-D script
 * (scratchpad anterior.mjs); a new mesh with new geometry needs it measured again.
 */
export const ANTERIOR: readonly Vec3[] = [
  [0.9489, 0.315, 0.0173],
  [0.9584, 0.2805, 0.0523],
  [0.9776, 0.2036, 0.0527],
  [0.9837, 0.1337, 0.1207],
  [0.9901, 0.0381, 0.1353],
  [0.9863, -0.0515, 0.1569],
  [0.9773, -0.1208, 0.1739],
  [0.9732, -0.1613, 0.1637],
  [0.9792, -0.1717, 0.1079],
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
