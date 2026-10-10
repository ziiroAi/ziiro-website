// (C) W14-F (c): which disc a tap or pointer lands on, measured on the box as it is on screen (clipped to the
// canvas; a disc behind the camera is never a target).
// - Phone (the locked scope): a disc is a target only while that box is 44 × 44 CSS px or more (§11.3), so discs
//   become tappable in close-up and never in the overview.
// - Desktop (§6.2 "Opening a disc"): the box is padded to at least 44 × 44 around its centre, so every department
//   disc opens in the overview too.
// The end discs belong to no department and are never targets (§6.7).
import type { DiscId } from "../../data/contract";
import type { DiscBox } from "../scene";
import type { Variant } from "./targets";

export const MIN_TARGET_PX = 44;
const END_DISCS: readonly DiscId[] = ["G00", "G08"];
const LOW_PERCENTILE = 0.02;
const HIGH_PERCENTILE = 0.98;
/** §6.7: the callout anchor sits on the box's right edge, this far down from its top. */
const ANCHOR_DOWN = 0.2;

/** CSS px, origin top left. */
export interface ScreenBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ScreenDisc {
  disc: DiscId;
  box: ScreenBox;          // as projected, before clipping
  inFront: boolean;        // its front band faces the camera
  behindCamera?: boolean;  // the projection put it behind the camera
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** A DiscBox as a ScreenBox. */
export const boxOfDisc = (box: DiscBox): ScreenBox => ({ x0: box.left, y0: box.top, x1: box.left + box.width, y1: box.top + box.height });

/** A DiscBox as this file reads it. A disc the API marks off screen is treated as behind the camera: never a target. */
export const screenDisc = (box: DiscBox): ScreenDisc => ({ disc: box.disc, box: boxOfDisc(box), inFront: true, behindCamera: !box.onScreen });

export const isHittable = (box: ScreenBox): boolean =>
  box.x1 - box.x0 >= MIN_TARGET_PX && box.y1 - box.y0 >= MIN_TARGET_PX;

/** The part of the box inside the canvas, or null when none of it is. */
export function clipBox(box: ScreenBox, view: Viewport): ScreenBox | null {
  const clipped = {
    x0: Math.max(0, box.x0),
    y0: Math.max(0, box.y0),
    x1: Math.min(view.width, box.x1),
    y1: Math.min(view.height, box.y1),
  };
  return clipped.x1 > clipped.x0 && clipped.y1 > clipped.y0 ? clipped : null;
}

/** The box grown to at least `min` × `min`, around its own centre. */
export function padToMin(box: ScreenBox, min: number): ScreenBox {
  const grow = (lo: number, hi: number): [number, number] => {
    const extra = Math.max(0, min - (hi - lo)) / 2;
    return [lo - extra, hi + extra];
  };
  const [x0, x1] = grow(box.x0, box.x1);
  const [y0, y1] = grow(box.y0, box.y1);
  return { x0, y0, x1, y1 };
}

/** Where a disc takes a tap or pointer right now, or null when it can't. */
export function hitArea(disc: ScreenDisc, variant: Variant, view: Viewport): ScreenBox | null {
  if (END_DISCS.includes(disc.disc) || disc.behindCamera) return null;
  const visible = clipBox(disc.box, view);
  if (!visible) return null;
  if (variant === "desktop") return padToMin(visible, MIN_TARGET_PX);
  return isHittable(visible) ? visible : null;
}

const holds = (box: ScreenBox, p: Point): boolean => p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1;
const distanceToCentre = (box: ScreenBox, p: Point): number =>
  Math.hypot((box.x0 + box.x1) / 2 - p.x, (box.y0 + box.y1) / 2 - p.y);

/** The department discs that can take a tap right now, in the order given. */
export const hittableDiscs = (discs: readonly ScreenDisc[], variant: Variant, view: Viewport): DiscId[] =>
  discs.filter((d) => hitArea(d, variant, view) !== null).map((d) => d.disc);

export function pickDisc(point: Point, discs: readonly ScreenDisc[], variant: Variant, view: Viewport): DiscId | null {
  const under = discs.flatMap((d) => {
    const area = hitArea(d, variant, view);
    return area && holds(area, point) ? [{ d, area }] : [];
  });
  if (under.length === 0) return null;
  const ranked = [...under].sort(
    (a, b) => Number(b.d.inFront) - Number(a.d.inFront) || distanceToCentre(a.area, point) - distanceToCentre(b.area, point),
  );
  return ranked[0].d.disc;
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

/** §6.7's callout anchor: the box's right edge, 20 % down from its top. */
export const anchorFromBox = (box: ScreenBox): Point => ({ x: box.x1, y: box.y0 + ANCHOR_DOWN * (box.y1 - box.y0) });
