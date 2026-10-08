// (C) W14-F (d): the pinned callouts. Each lit disc's anchor is projected from 3D every frame (§6.7: the right end
// of its visible front band); this places one label per anchor so none overlap and all stay on screen, at 390 px
// and at 1440. A label sits right of its disc, or left when the right has no room; within a side the labels keep
// their discs' order, so their leader lines never cross.
import type { DiscId } from "../../data/contract";

export const LABEL_GAP_PX = 12;       // from the anchor to the label
export const LABEL_SPACING_PX = 6;    // between two labels in a column
export const LABEL_MARGIN_PX = 8;     // from the edge of the canvas

export interface LabelInput {
  disc: DiscId;
  anchor: { x: number; y: number };   // CSS px in the canvas
  width: number;                       // the label's measured size
  height: number;
}

export type Side = "left" | "right";

export interface PlacedLabel {
  disc: DiscId;
  x: number;
  y: number;
  width: number;
  height: number;
  side: Side;
  /** From the anchor (x1, y1) to the middle of the label's near edge (x2, y2). */
  leader: { x1: number; y1: number; x2: number; y2: number };
}

interface Viewport {
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

function sideFor(label: LabelInput, view: Viewport): Side {
  const rightRoom = view.width - LABEL_MARGIN_PX - (label.anchor.x + LABEL_GAP_PX);
  const leftRoom = label.anchor.x - LABEL_GAP_PX - LABEL_MARGIN_PX;
  if (rightRoom >= label.width) return "right";
  if (leftRoom >= label.width) return "left";
  return rightRoom >= leftRoom ? "right" : "left";
}

function xFor(label: LabelInput, side: Side, view: Viewport): number {
  const wanted = side === "right" ? label.anchor.x + LABEL_GAP_PX : label.anchor.x - LABEL_GAP_PX - label.width;
  return clamp(wanted, LABEL_MARGIN_PX, view.width - LABEL_MARGIN_PX - label.width);
}

/** Tops for one side's column, in anchor order: centred on the anchor, pushed down past the one above, then pulled
 *  up from the bottom edge if the column ran off it. */
function columnTops(column: readonly LabelInput[], view: Viewport): number[] {
  const tops: number[] = [];
  column.forEach((label, i) => {
    const wanted = label.anchor.y - label.height / 2;
    const floor = i === 0 ? LABEL_MARGIN_PX : tops[i - 1] + column[i - 1].height + LABEL_SPACING_PX;
    tops.push(Math.max(wanted, floor));
  });
  let limit = view.height - LABEL_MARGIN_PX;
  for (let i = column.length - 1; i >= 0; i -= 1) {
    tops[i] = Math.max(LABEL_MARGIN_PX, Math.min(tops[i], limit - column[i].height));
    limit = tops[i] - LABEL_SPACING_PX;
  }
  return tops;
}

export function layoutLabels(labels: readonly LabelInput[], view: Viewport): PlacedLabel[] {
  const sides = labels.map((label) => sideFor(label, view));
  const placed = new Map<LabelInput, PlacedLabel>();
  for (const side of ["left", "right"] as const) {
    const column = labels.filter((_, i) => sides[i] === side).sort((a, b) => a.anchor.y - b.anchor.y);
    const tops = columnTops(column, view);
    column.forEach((label, i) => {
      const x = xFor(label, side, view);
      const y = tops[i];
      placed.set(label, {
        disc: label.disc,
        x,
        y,
        width: label.width,
        height: label.height,
        side,
        leader: {
          x1: label.anchor.x,
          y1: label.anchor.y,
          x2: side === "right" ? x : x + label.width,
          y2: y + label.height / 2,
        },
      });
    });
  }
  return labels.map((label) => placed.get(label)!);
}
