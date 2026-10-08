// (C) W14-F (d): the pinned callouts. Each lit disc's anchor is projected from 3D every frame (§6.7: the right end
// of its visible front band, anchorFromBox in tap.ts); this places one label per anchor so none overlap and all stay
// on screen, at 390 px and at 1440.
// - A label sits right of its disc, or left when the right has no room; within a side the labels keep their discs'
//   order, so their leader lines never cross. If the two sides would collide, every label goes to one side.
// - Given the disc's on-screen box (keepOut), a label never covers its own disc: the left side is measured from the
//   box's left edge, and when neither side fits it sits above the disc, or below, then the same in its compact form,
//   or is hidden (review L3, N1; phones keep callouts, owner's scope answer). The one-side fallback keeps to this too
//   (N2). A label that would still collide with a higher-priority one is hidden.
// - A disc off the canvas or behind the camera gets no label: it comes back hidden.
// - A column taller than the canvas goes compact (heading only), then drops its lowest-priority labels (the end of
//   the input), and the layout says it overflowed.
import type { DiscId } from "../../data/contract";
import type { ScreenBox } from "./tap";

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
  keepOut?: ScreenBox;                 // the disc's on-screen box, which its label must not cover
}

export type Side = "left" | "right" | "above" | "below";
type ColumnSide = "left" | "right";
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
/** Where a left-side label is measured from: the disc's left edge when its box is known, else the anchor. */
const leftEdge = (l: LabelInput): number => l.keepOut?.x0 ?? l.anchor.x;
const leftRoom = (l: LabelInput): number => leftEdge(l) - LABEL_GAP_PX - LABEL_MARGIN_PX;

const onScreen = (l: LabelInput, view: Viewport): boolean =>
  l.visible !== false && l.anchor.x >= 0 && l.anchor.x <= view.width && l.anchor.y >= 0 && l.anchor.y <= view.height;

interface VerticalFit {
  side: "above" | "below";
  compact: boolean;
}
type Choice = ColumnSide | VerticalFit | null;

/** Above or below the disc's box: full height above, then below, then compact above, then below; null if none fits. */
function verticalFit(label: LabelInput, box: ScreenBox, view: Viewport): VerticalFit | null {
  const above = box.y0 - LABEL_GAP_PX - LABEL_MARGIN_PX;
  const below = view.height - LABEL_MARGIN_PX - (box.y1 + LABEL_GAP_PX);
  const compactHeight = label.compactHeight ?? label.height;
  const tries: [number, VerticalFit][] = [
    [label.height, { side: "above", compact: false }],
    [label.height, { side: "below", compact: false }],
    [compactHeight, { side: "above", compact: true }],
    [compactHeight, { side: "below", compact: true }],
  ];
  const fit = tries.find(([height, { side }]) => (side === "above" ? above : below) >= height);
  return fit ? fit[1] : null;
}

/** The label's side; null when its disc's box leaves no room anywhere that doesn't cover the disc. */
function sideFor(label: LabelInput, view: Viewport): Choice {
  if (rightRoom(label, view) >= label.width) return "right";
  if (leftRoom(label) >= label.width) return "left";
  const box = label.keepOut;
  if (!box) return rightRoom(label, view) >= leftRoom(label) ? "right" : "left";
  return verticalFit(label, box, view);
}

/** The fallback's choice: the one side, unless it would put the label over its own disc (N2). */
function forcedSide(label: LabelInput, one: ColumnSide, view: Viewport): Choice {
  const room = one === "right" ? rightRoom(label, view) : leftRoom(label);
  if (!label.keepOut || room >= label.width) return one;
  return verticalFit(label, label.keepOut, view);
}

function xFor(label: LabelInput, side: ColumnSide, view: Viewport): number {
  const wanted = side === "right" ? label.anchor.x + LABEL_GAP_PX : leftEdge(label) - LABEL_GAP_PX - label.width;
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
function placeColumn(labels: readonly LabelInput[], side: ColumnSide, priority: (l: LabelInput) => number, view: Viewport): Column {
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
      leader: {
        x1: side === "right" ? label.anchor.x : leftEdge(label), y1: label.anchor.y,
        x2: side === "right" ? x : x + label.width, y2: tops[i] + heights[i] / 2,
      },
    };
  });
  return { placed, dropped, overflow };
}

function placeAll(labels: readonly LabelInput[], sides: readonly ColumnSide[], priority: (l: LabelInput) => number, view: Viewport): Column {
  const columns = (["left", "right"] as const).map((side) =>
    placeColumn(labels.filter((_, i) => sides[i] === side), side, priority, view));
  return {
    placed: columns.flatMap((c) => c.placed),
    dropped: columns.flatMap((c) => c.dropped),
    overflow: columns.some((c) => c.overflow),
  };
}

const EPSILON = 1e-9;
const collide = (a: PlacedLabel, b: PlacedLabel): boolean =>
  !(a.x + a.width <= b.x + EPSILON || b.x + b.width <= a.x + EPSILON ||
    a.y + a.height + LABEL_SPACING_PX <= b.y + EPSILON || b.y + b.height + LABEL_SPACING_PX <= a.y + EPSILON);

/** A label above or below its disc's box (sideFor has checked it fits), centred on the box across. */
function placeVertical(label: LabelInput, { side, compact }: VerticalFit, box: ScreenBox, view: Viewport): PlacedLabel {
  const height = compact ? Math.min(label.height, label.compactHeight ?? label.height) : label.height;
  const x = clamp((box.x0 + box.x1) / 2 - label.width / 2, LABEL_MARGIN_PX, view.width - LABEL_MARGIN_PX - label.width);
  const y = side === "above" ? box.y0 - LABEL_GAP_PX - height : box.y1 + LABEL_GAP_PX;
  return {
    disc: label.disc, x, y, width: label.width, height, side, compact, hidden: false,
    leader: { x1: label.anchor.x, y1: label.anchor.y, x2: x + label.width / 2, y2: side === "above" ? y + height : y },
  };
}

/** Keeps labels in priority order, dropping any that collide with one already kept. */
function dropCollisions(placed: readonly PlacedLabel[], priority: (disc: DiscId) => number): PlacedLabel[] {
  const kept: PlacedLabel[] = [];
  [...placed].sort((a, b) => priority(a.disc) - priority(b.disc)).forEach((p) => {
    if (!kept.some((k) => collide(k, p))) kept.push(p);
  });
  return kept;
}

const sidesCollide = (placed: readonly PlacedLabel[]): boolean =>
  placed.some((a) => a.side === "left" && placed.some((b) => b.side === "right" && collide(a, b)));

function hiddenLabel(label: LabelInput, reason: HiddenReason): PlacedLabel {
  const { x, y } = label.anchor;
  return {
    disc: label.disc, x, y, width: label.width, height: label.height, side: "right", compact: false, hidden: true,
    hiddenReason: reason, leader: { x1: x, y1: y, x2: x, y2: y },
  };
}

const isColumn = (choice: Choice | undefined): choice is ColumnSide => choice === "left" || choice === "right";

function placeChoices(shown: readonly LabelInput[], choices: Map<LabelInput, Choice>, priority: (l: LabelInput) => number,
  view: Viewport): Column {
  const inColumns = shown.filter((l) => isColumn(choices.get(l)));
  const columns = placeAll(inColumns, inColumns.map((l) => choices.get(l) as ColumnSide), priority, view);
  const vertical = shown.flatMap((l) => {
    const choice = choices.get(l);
    return l.keepOut && choice && !isColumn(choice) ? [placeVertical(l, choice, l.keepOut, view)] : [];
  });
  return { placed: [...columns.placed, ...vertical], dropped: columns.dropped, overflow: columns.overflow };
}

export function layoutLabels(labels: readonly LabelInput[], view: Viewport): LabelLayout {
  const shown = labels.filter((l) => onScreen(l, view));
  const priority = (l: LabelInput): number => labels.indexOf(l);
  let result = placeChoices(shown, new Map(shown.map((l) => [l, sideFor(l, view)])), priority, view);
  if (sidesCollide(result.placed)) {
    const right = shown.reduce((sum, l) => sum + rightRoom(l, view), 0);
    const left = shown.reduce((sum, l) => sum + leftRoom(l), 0);
    const one: ColumnSide = right >= left ? "right" : "left";
    const choices = new Map(shown.map((l): [LabelInput, Choice] => {
      const own = sideFor(l, view);
      return [l, isColumn(own) ? forcedSide(l, one, view) : own];
    }));
    result = placeChoices(shown, choices, priority, view);
  }
  const discPriority = (disc: DiscId): number => labels.findIndex((l) => l.disc === disc);
  const kept = dropCollisions(result.placed, discPriority);
  const byDisc = new Map(kept.map((p) => [p.disc, p]));
  const out = labels.map((label) => {
    if (!onScreen(label, view)) return hiddenLabel(label, "offscreen");
    return byDisc.get(label.disc) ?? hiddenLabel(label, "overflow");
  });
  const lost = out.some((p) => p.hiddenReason === "overflow");
  return { labels: out, overflow: result.overflow || lost };
}
