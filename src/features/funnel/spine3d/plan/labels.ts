// (C) W14-F (d): the pinned callouts. Each lit disc's anchor is projected from 3D every frame (§6.7: the right end
// of its visible front band, anchorFromBox in tap.ts); this places one label per anchor so none overlap and all stay
// on screen, at 390 px and at 1440.
// - A label sits right of its disc, or left when the right has no room; within a side the labels keep their discs'
//   order, so their leader lines never cross. If the two sides would collide, every label goes to one side.
// - Given the disc's on-screen box (keepOut), a label never covers its own disc: the left side is measured from the
//   box's left edge, and when neither side fits it sits above the disc, or below, then the same in its compact form,
//   or is hidden (review L3, N1; phones keep callouts, owner's scope answer). The one-side fallback keeps to this too
//   (N2). A label that would still collide with a higher-priority one, or have a leader run through it, is hidden.
// - A side leader meets its label level with the anchor where it can (W14-M), so stacked leaders stay apart.
// - Given the spine's column (avoid), no label ever sits over it: a column label first slides outward clear of the
//   bands beside the height it was stacked at (W19-RING), and one still over it is hidden (W14-X). The right edge
//   can keep a wider margin than the others (marginRight: desktop keeps 24 px).
// - A disc off the canvas or behind the camera gets no label: it comes back hidden.
// - A column taller than the canvas goes compact (heading only), then drops its lowest-priority labels (the end of
//   the input), and the layout says it overflowed.
import type { DiscId } from "../../data/contract";
import type { ScreenBox } from "./tap";

export const LABEL_GAP_PX = 12;       // from the anchor to the label
export const LABEL_SPACING_PX = 6;    // between two labels in a column
export const LABEL_MARGIN_PX = 8;     // from the edge of the canvas
/** A side leader ends on the label's near edge at the anchor's own height, kept this far inside the label (W14-M). */
export const LEADER_INSET_PX = 6;

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
  /** From the right edge, where it differs from LABEL_MARGIN_PX (W14-X). */
  marginRight?: number;
  /** The spine's column on screen: no label may cover any of these boxes (W14-X). */
  avoid?: readonly ScreenBox[];
}

interface Column {
  placed: PlacedLabel[];
  dropped: LabelInput[];
  overflow: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));
/** The furthest right a label may reach. */
const rightLimit = (view: Viewport): number => view.width - (view.marginRight ?? LABEL_MARGIN_PX);
const rightRoom = (l: LabelInput, view: Viewport): number => rightLimit(view) - (l.anchor.x + LABEL_GAP_PX);
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
  return clamp(wanted, LABEL_MARGIN_PX, rightLimit(view) - label.width);
}

/** At most this many slides past the spine's bands: each one clears one more band, and a column has a handful. */
const MAX_SLIDES = 8;

/**
 * A column label slid outward, away from the spine, until it clears every band beside the height it was finally
 * stacked at (W19-RING): pushed down its column, a label can land beside lower vertebrae that reach further out than
 * its own disc, where the spine curves, and onSpine would hide it. Clamped to the canvas, so a label no slide can
 * clear still sits over the spine and is hidden as before.
 */
function slideClear(x: number, y: number, width: number, height: number, side: ColumnSide, view: Viewport): number {
  const beside = (view.avoid ?? []).filter((b) => y < b.y1 && y + height > b.y0);
  let at = x;
  for (let i = 0; i < MAX_SLIDES; i += 1) {
    const hit = beside.find((b) => at < b.x1 && at + width > b.x0);
    if (!hit) break;
    at = side === "right" ? hit.x1 + LABEL_GAP_PX : hit.x0 - LABEL_GAP_PX - width;
  }
  return clamp(at, LABEL_MARGIN_PX, rightLimit(view) - width);
}

const stackHeight = (heights: readonly number[]): number =>
  heights.reduce((sum, h) => sum + h, 0) + LABEL_SPACING_PX * Math.max(0, heights.length - 1);

/** Where a side leader meets its label: level with the anchor, unless the label was pushed off it (W14-M). */
const leaderEnd = (anchorY: number, top: number, height: number): number =>
  Math.min(Math.max(anchorY, top + LEADER_INSET_PX), top + height - LEADER_INSET_PX);

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

/** Does one label's leader run through another label in the column (a label pushed onto the next disc's anchor)? */
const tangled = (placed: readonly PlacedLabel[]): boolean =>
  placed.some((p) => placed.some((q) => q !== p && runsThrough(q.leader, p)));

/** One side's labels at full or compact height, dropping the lowest-priority ones until the column fits. */
function stackColumn(labels: readonly LabelInput[], side: ColumnSide, priority: (l: LabelInput) => number, view: Viewport,
  compact: boolean): { placed: PlacedLabel[]; dropped: LabelInput[] } {
  const room = view.height - 2 * LABEL_MARGIN_PX;
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
    const x = slideClear(xFor(label, side, view), tops[i], label.width, heights[i], side, view);
    return {
      disc: label.disc, x, y: tops[i], width: label.width, height: heights[i], side, compact, hidden: false,
      leader: {
        x1: side === "right" ? label.anchor.x : leftEdge(label), y1: label.anchor.y,
        x2: side === "right" ? x : x + label.width, y2: leaderEnd(label.anchor.y, tops[i], heights[i]),
      },
    };
  });
  return { placed, dropped };
}

/**
 * One side's labels: full height if they fit, else compact, else without the lowest-priority ones. A full-height
 * column whose leaders tangle (a label pushed down onto the next disc's anchor) goes compact too (W14-M).
 */
function placeColumn(labels: readonly LabelInput[], side: ColumnSide, priority: (l: LabelInput) => number, view: Viewport): Column {
  const overflow = stackHeight(labels.map((l) => l.height)) > view.height - 2 * LABEL_MARGIN_PX;
  const full = stackColumn(labels, side, priority, view, overflow);
  const crowded = !overflow && tangled(full.placed);
  return { ...(crowded ? stackColumn(labels, side, priority, view, true) : full), overflow };
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
  const x = clamp((box.x0 + box.x1) / 2 - label.width / 2, LABEL_MARGIN_PX, rightLimit(view) - label.width);
  const y = side === "above" ? box.y0 - LABEL_GAP_PX - height : box.y1 + LABEL_GAP_PX;
  return {
    disc: label.disc, x, y, width: label.width, height, side, compact, hidden: false,
    leader: { x1: label.anchor.x, y1: label.anchor.y, x2: x + label.width / 2, y2: side === "above" ? y + height : y },
  };
}

/** Does the leader run through the label's inside? Touching its edge doesn't count (Liang-Barsky clipping). */
function runsThrough(leader: PlacedLabel["leader"], label: PlacedLabel): boolean {
  const inset = 0.5;
  const dx = leader.x2 - leader.x1;
  const dy = leader.y2 - leader.y1;
  const edges: [number, number][] = [
    [-dx, leader.x1 - (label.x + inset)],
    [dx, label.x + label.width - inset - leader.x1],
    [-dy, leader.y1 - (label.y + inset)],
    [dy, label.y + label.height - inset - leader.y1],
  ];
  let enter = 0;
  let leave = 1;
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
    if (enter > leave) return false;
  }
  return true;
}

const clash = (a: PlacedLabel, b: PlacedLabel): boolean =>
  collide(a, b) || runsThrough(a.leader, b) || runsThrough(b.leader, a);

/** Keeps labels in priority order, dropping any that overlap one already kept or cross it with a leader (W14-M). */
function dropCollisions(placed: readonly PlacedLabel[], priority: (disc: DiscId) => number): PlacedLabel[] {
  const kept: PlacedLabel[] = [];
  [...placed].sort((a, b) => priority(a.disc) - priority(b.disc)).forEach((p) => {
    if (!kept.some((k) => clash(k, p))) kept.push(p);
  });
  return kept;
}

/** Does the label cover any part of the spine's column (W14-X)? */
const onSpine = (p: PlacedLabel, view: Viewport): boolean =>
  (view.avoid ?? []).some((b) => p.x < b.x1 && p.x + p.width > b.x0 && p.y < b.y1 && p.y + p.height > b.y0);

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
  const kept = dropCollisions(result.placed.filter((p) => !onSpine(p, view)), discPriority);
  const byDisc = new Map(kept.map((p) => [p.disc, p]));
  const out = labels.map((label) => {
    if (!onScreen(label, view)) return hiddenLabel(label, "offscreen");
    return byDisc.get(label.disc) ?? hiddenLabel(label, "overflow");
  });
  const lost = out.some((p) => p.hiddenReason === "overflow");
  return { labels: out, overflow: result.overflow || lost };
}
