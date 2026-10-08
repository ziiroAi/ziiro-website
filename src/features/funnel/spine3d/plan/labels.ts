// (C) W14-F (d): the pinned callouts. Each lit disc's anchor is projected from 3D every frame (§6.7: the right end
// of its visible front band, anchorFromBox in tap.ts); this places one label per anchor so none overlap and all stay
// on screen, at 390 px and at 1440.
// - A label sits right of its disc, or left when the right has no room; within a side the labels keep their discs'
//   order, so their leader lines never cross. If the two sides would collide, every label goes to one side.
// - A disc off the canvas or behind the camera gets no label: it comes back hidden.
// - A column taller than the canvas goes compact (heading only), then drops its lowest-priority labels (the end of
//   the input), and the layout says it overflowed.
import type { DiscId } from "../../data/contract";

export const LABEL_GAP_PX = 12;       // from the anchor to the label
export const LABEL_SPACING_PX = 6;    // between two labels in a column
export const LABEL_MARGIN_PX = 8;     // from the edge of the canvas

export interface LabelInput {
  disc: DiscId;
  anchor: { x: number; y: number };   // CSS px in the canvas
  width: number;                       // the label's measured size
  height: number;
  compactHeight?: number;              // its height with the heading only, when it has a compact form
  visible?: boolean;                   // false when the projection puts the disc behind the camera
}

export type Side = "left" | "right";
export type HiddenReason = "offscreen" | "overflow";

export interface PlacedLabel {
  disc: DiscId;
  x: number;
  y: number;
  width: number;
  height: number;
  side: Side;
  compact: boolean;
  hidden: boolean;
  hiddenReason?: HiddenReason;
  /** From the anchor (x1, y1) to the middle of the label's near edge (x2, y2). */
  leader: { x1: number; y1: number; x2: number; y2: number };
}

export interface LabelLayout {
  labels: PlacedLabel[];
  overflow: boolean;
}

interface Viewport {
  width: number;
  height: number;
}

interface Column {
  placed: PlacedLabel[];
  dropped: LabelInput[];
  overflow: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));
const rightRoom = (l: LabelInput, view: Viewport): number => view.width - LABEL_MARGIN_PX - (l.anchor.x + LABEL_GAP_PX);
const leftRoom = (l: LabelInput): number => l.anchor.x - LABEL_GAP_PX - LABEL_MARGIN_PX;

const onScreen = (l: LabelInput, view: Viewport): boolean =>
  l.visible !== false && l.anchor.x >= 0 && l.anchor.x <= view.width && l.anchor.y >= 0 && l.anchor.y <= view.height;

function sideFor(label: LabelInput, view: Viewport): Side {
  if (rightRoom(label, view) >= label.width) return "right";
  if (leftRoom(label) >= label.width) return "left";
  return rightRoom(label, view) >= leftRoom(label) ? "right" : "left";
}

function xFor(label: LabelInput, side: Side, view: Viewport): number {
  const wanted = side === "right" ? label.anchor.x + LABEL_GAP_PX : label.anchor.x - LABEL_GAP_PX - label.width;
  return clamp(wanted, LABEL_MARGIN_PX, view.width - LABEL_MARGIN_PX - label.width);
}

const stackHeight = (heights: readonly number[]): number =>
  heights.reduce((sum, h) => sum + h, 0) + LABEL_SPACING_PX * Math.max(0, heights.length - 1);

/** Tops in anchor order: centred on the anchor, pushed down past the one above, then pulled up from the bottom
 *  edge. Only called on a column that fits, so the spacing always holds. */
function stackTops(anchorsY: readonly number[], heights: readonly number[], view: Viewport): number[] {
  const tops: number[] = [];
  anchorsY.forEach((y, i) => {
    const floor = i === 0 ? LABEL_MARGIN_PX : tops[i - 1] + heights[i - 1] + LABEL_SPACING_PX;
    tops.push(Math.max(y - heights[i] / 2, floor));
  });
  let limit = view.height - LABEL_MARGIN_PX;
  for (let i = tops.length - 1; i >= 0; i -= 1) {
    tops[i] = Math.min(tops[i], limit - heights[i]);
    limit = tops[i] - LABEL_SPACING_PX;
  }
  return tops;
}

/** One side's labels: full height if they fit, else compact, else without the lowest-priority ones. */
function placeColumn(labels: readonly LabelInput[], side: Side, priority: (l: LabelInput) => number, view: Viewport): Column {
  const room = view.height - 2 * LABEL_MARGIN_PX;
  const full = labels.map((l) => l.height);
  const overflow = stackHeight(full) > room;
  const compact = overflow;
  const heightOf = (l: LabelInput): number => (compact ? Math.min(l.height, l.compactHeight ?? l.height) : l.height);
  const kept = [...labels];
  const dropped: LabelInput[] = [];
  while (kept.length > 0 && stackHeight(kept.map(heightOf)) > room) {
    const lowest = kept.reduce((a, b) => (priority(b) > priority(a) ? b : a));
    kept.splice(kept.indexOf(lowest), 1);
    dropped.push(lowest);
  }
  const ordered = [...kept].sort((a, b) => a.anchor.y - b.anchor.y);
  const heights = ordered.map(heightOf);
  const tops = stackTops(ordered.map((l) => l.anchor.y), heights, view);
  const placed = ordered.map((label, i): PlacedLabel => {
    const x = xFor(label, side, view);
    return {
      disc: label.disc, x, y: tops[i], width: label.width, height: heights[i], side, compact, hidden: false,
      leader: { x1: label.anchor.x, y1: label.anchor.y, x2: side === "right" ? x : x + label.width, y2: tops[i] + heights[i] / 2 },
    };
  });
  return { placed, dropped, overflow };
}

function placeAll(labels: readonly LabelInput[], sides: readonly Side[], priority: (l: LabelInput) => number, view: Viewport): Column {
  const columns = (["left", "right"] as const).map((side) =>
    placeColumn(labels.filter((_, i) => sides[i] === side), side, priority, view));
  return {
    placed: columns.flatMap((c) => c.placed),
    dropped: columns.flatMap((c) => c.dropped),
    overflow: columns.some((c) => c.overflow),
  };
}

const collide = (a: PlacedLabel, b: PlacedLabel): boolean =>
  !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height + LABEL_SPACING_PX <= b.y ||
    b.y + b.height + LABEL_SPACING_PX <= a.y);

const sidesCollide = (placed: readonly PlacedLabel[]): boolean =>
  placed.some((a) => a.side === "left" && placed.some((b) => b.side === "right" && collide(a, b)));

function hiddenLabel(label: LabelInput, reason: HiddenReason): PlacedLabel {
  const { x, y } = label.anchor;
  return {
    disc: label.disc, x, y, width: label.width, height: label.height, side: "right", compact: false, hidden: true,
    hiddenReason: reason, leader: { x1: x, y1: y, x2: x, y2: y },
  };
}

export function layoutLabels(labels: readonly LabelInput[], view: Viewport): LabelLayout {
  const shown = labels.filter((l) => onScreen(l, view));
  const priority = (l: LabelInput): number => labels.indexOf(l);
  let result = placeAll(shown, shown.map((l) => sideFor(l, view)), priority, view);
  if (sidesCollide(result.placed)) {
    const right = shown.reduce((sum, l) => sum + rightRoom(l, view), 0);
    const left = shown.reduce((sum, l) => sum + leftRoom(l), 0);
    const one: Side = right >= left ? "right" : "left";
    result = placeAll(shown, shown.map(() => one), priority, view);
  }
  const byDisc = new Map(result.placed.map((p) => [p.disc, p]));
  const out = labels.map((label) => {
    if (!onScreen(label, view)) return hiddenLabel(label, "offscreen");
    return byDisc.get(label.disc) ?? hiddenLabel(label, "overflow");
  });
  return { labels: out, overflow: result.overflow };
}
