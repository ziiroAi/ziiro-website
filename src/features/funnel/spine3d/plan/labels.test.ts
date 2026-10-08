import { describe, expect, it } from "vitest";
import type { DiscId } from "../../data/contract";
import { LABEL_GAP_PX, LABEL_MARGIN_PX, LABEL_SPACING_PX, layoutLabels, type LabelInput, type PlacedLabel } from "./labels";

/** §6.7's callout anchors, as fractions of the r17 frame (x across, y down). */
const ANCHORS: Partial<Record<DiscId, [number, number]>> = {
  G07: [0.777, 0.097], G06: [0.766, 0.189], G05: [0.759, 0.287], G04: [0.756, 0.392],
  G03: [0.759, 0.502], G02: [0.769, 0.618], G01: [0.784, 0.744],
};

const inputs = (discs: DiscId[], w: number, h: number, size: [number, number]): LabelInput[] =>
  discs.map((disc) => {
    const [fx, fy] = ANCHORS[disc]!;
    return { disc, anchor: { x: fx * w, y: fy * h }, width: size[0], height: size[1] };
  });

function expectClean(placed: PlacedLabel[], width: number, height: number): void {
  for (const a of placed) {
    expect(a.x).toBeGreaterThanOrEqual(LABEL_MARGIN_PX - 1e-9);
    expect(a.y).toBeGreaterThanOrEqual(LABEL_MARGIN_PX - 1e-9);
    expect(a.x + a.width).toBeLessThanOrEqual(width - LABEL_MARGIN_PX + 1e-9);
    expect(a.y + a.height).toBeLessThanOrEqual(height - LABEL_MARGIN_PX + 1e-9);
  }
  for (const a of placed) {
    for (const b of placed) {
      if (a === b) continue;
      const apart =
        a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height + LABEL_SPACING_PX <= b.y + 1e-9 ||
        b.y + b.height + LABEL_SPACING_PX <= a.y + 1e-9;
      expect(apart, `${a.disc} overlaps ${b.disc}`).toBe(true);
    }
  }
}

/** Within a side, labels keep their discs' top-to-bottom order, so leader lines never cross. */
function expectOrdered(placed: PlacedLabel[]): void {
  for (const side of ["left", "right"] as const) {
    const column = placed.filter((p) => p.side === side).sort((a, b) => a.leader.y1 - b.leader.y1);
    column.forEach((p, i) => {
      if (i > 0) expect(p.y).toBeGreaterThan(column[i - 1].y);
    });
  }
}

describe("layoutLabels on 1440 desktop", () => {
  const W = 1440;
  const H = 810;
  const lit: DiscId[] = ["G04", "G05", "G06", "G01"]; // Ananya
  const placed = layoutLabels(inputs(lit, W, H, [220, 44]), { width: W, height: H });

  it("keeps the input order and one label per disc", () => {
    expect(placed.map((p) => p.disc)).toEqual(lit);
  });

  it("puts each label right of its disc, centred on the anchor when there is room", () => {
    for (const p of placed) {
      expect(p.side).toBe("right");
      expect(p.x).toBeCloseTo(p.leader.x1 + LABEL_GAP_PX, 9);
      expect(p.y + p.height / 2).toBeCloseTo(p.leader.y1, 9);
    }
  });

  it("draws each leader from the anchor to the label's near edge", () => {
    for (const p of placed) {
      const [fx, fy] = ANCHORS[p.disc]!;
      expect([p.leader.x1, p.leader.y1]).toEqual([fx * W, fy * H]);
      expect(p.leader.x2).toBe(p.x);
      expect(p.leader.y2).toBe(p.y + p.height / 2);
    }
  });

  it("doesn't overlap, even with all 7 department discs lit", () => {
    expectClean(placed, W, H);
    const all = layoutLabels(inputs(["G07", "G06", "G05", "G04", "G03", "G02", "G01"], W, H, [220, 44]), { width: W, height: H });
    expectClean(all, W, H);
    expectOrdered(all);
  });
});

describe("layoutLabels on a 390 px phone band", () => {
  const W = 390;
  const H = 410;

  it("flips to the left of the disc when the right side has no room", () => {
    const placed = layoutLabels(inputs(["G06", "G05"], W, H, [150, 36]), { width: W, height: H });
    for (const p of placed) {
      expect(p.side).toBe("left");
      expect(p.leader.x2).toBe(p.x + p.width);
    }
    expectClean(placed, W, H);
  });

  it("stacks four discs 25 px apart without overlap, in order", () => {
    const four: LabelInput[] = [60, 85, 110, 135].map((y, i) => ({
      disc: (["G06", "G05", "G04", "G03"] as DiscId[])[i], anchor: { x: 300, y }, width: 150, height: 36,
    }));
    const placed = layoutLabels(four, { width: W, height: H });
    expectClean(placed, W, H);
    expectOrdered(placed);
  });

  it("pushes a crowded column up from the bottom edge and still fits it", () => {
    const seven: LabelInput[] = Array.from({ length: 7 }, (_, i) => ({
      disc: (["G07", "G06", "G05", "G04", "G03", "G02", "G01"] as DiscId[])[i],
      anchor: { x: 300, y: 250 + i * 20 },
      width: 140,
      height: 40,
    }));
    const placed = layoutLabels(seven, { width: W, height: H });
    expectClean(placed, W, H);
    expectOrdered(placed);
  });

  it("keeps a label wider than either side inside the screen", () => {
    const [p] = layoutLabels([{ disc: "G04", anchor: { x: 195, y: 200 }, width: 300, height: 36 }], { width: W, height: H });
    expectClean([p], W, H);
  });

  it("lays out nothing for no labels", () => {
    expect(layoutLabels([], { width: W, height: H })).toEqual([]);
  });
});
