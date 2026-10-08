// (C) W14-F (c): which disc a tap or pointer lands on. A disc is a target only while its box on screen is
// 44 × 44 CSS px or more (§11.3), so on a phone discs become tappable in close-up and never in the overview.
// The end discs belong to no department and are never targets (§6.7).
import type { DiscId } from "../../data/contract";

export const MIN_TARGET_PX = 44;
const END_DISCS: readonly DiscId[] = ["G00", "G08"];
const LOW_PERCENTILE = 0.02;
const HIGH_PERCENTILE = 0.98;

/** CSS px, origin top left. */
export interface ScreenBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ScreenDisc {
  disc: DiscId;
  box: ScreenBox;
  inFront: boolean;        // its front band faces the camera
}

export interface Point {
  x: number;
  y: number;
}

export const isHittable = (box: ScreenBox): boolean =>
  box.x1 - box.x0 >= MIN_TARGET_PX && box.y1 - box.y0 >= MIN_TARGET_PX;

const isTarget = (d: ScreenDisc): boolean => !END_DISCS.includes(d.disc) && isHittable(d.box);
const holds = (box: ScreenBox, p: Point): boolean => p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1;
const distanceToCentre = (box: ScreenBox, p: Point): number =>
  Math.hypot((box.x0 + box.x1) / 2 - p.x, (box.y0 + box.y1) / 2 - p.y);

/** The department discs that can take a tap right now, in the order given. */
export const hittableDiscs = (discs: readonly ScreenDisc[]): DiscId[] => discs.filter(isTarget).map((d) => d.disc);

export function pickDisc(point: Point, discs: readonly ScreenDisc[]): DiscId | null {
  const under = discs.filter((d) => isTarget(d) && holds(d.box, point));
  if (under.length === 0) return null;
  const ranked = [...under].sort(
    (a, b) => Number(b.inFront) - Number(a.inFront) || distanceToCentre(a.box, point) - distanceToCentre(b.box, point),
  );
  return ranked[0].disc;
}

function percentile(sorted: readonly number[], share: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(share * (sorted.length - 1)))];
}

/** §6.7's rule for a disc's box: the 2nd to 98th percentile of its projected vertices. */
export function boxFromPoints(points: readonly Point[]): ScreenBox {
  if (points.length === 0) throw new Error("boxFromPoints: no points");
  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  const ys = points.map((p) => p.y).sort((a, b) => a - b);
  return {
    x0: percentile(xs, LOW_PERCENTILE),
    y0: percentile(ys, LOW_PERCENTILE),
    x1: percentile(xs, HIGH_PERCENTILE),
    y1: percentile(ys, HIGH_PERCENTILE),
  };
}
