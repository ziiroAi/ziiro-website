import { describe, expect, it } from "vitest";
import type { DiscId } from "../../data/contract";
import { LABEL_GAP_PX, LABEL_MARGIN_PX, LABEL_SPACING_PX, layoutLabels, type LabelInput, type PlacedLabel } from "./labels";

/** §6.7's callout anchors, as fractions of the r17 frame (x across, y down). */
const ANCHORS: Partial<Record<DiscId, [number, number]>> = {
  G07: [0.777, 0.097], G06: [0.766, 0.189], G05: [0.759, 0.287], G04: [0.756, 0.392],
  G03: [0.759, 0.502], G02: [0.769, 0.618], G01: [0.784, 0.744],
};
const SEVEN: DiscId[] = ["G07", "G06", "G05", "G04", "G03", "G02", "G01"];

const inputs = (discs: DiscId[], w: number, h: number, size: [number, number]): LabelInput[] =>
  discs.map((disc) => {
    const [fx, fy] = ANCHORS[disc]!;
    return { disc, anchor: { x: fx * w, y: fy * h }, width: size[0], height: size[1] };
  });

const shown = (placed: readonly PlacedLabel[]) => placed.filter((p) => !p.hidden);

function expectClean(placed: readonly PlacedLabel[], width: number, height: number): void {
  const visible = shown(placed);
  for (const a of visible) {
    expect(a.x).toBeGreaterThanOrEqual(LABEL_MARGIN_PX - 1e-9);
    expect(a.y).toBeGreaterThanOrEqual(LABEL_MARGIN_PX - 1e-9);
    expect(a.x + a.width).toBeLessThanOrEqual(width - LABEL_MARGIN_PX + 1e-9);
    expect(a.y + a.height).toBeLessThanOrEqual(height - LABEL_MARGIN_PX + 1e-9);
  }
  for (const a of visible) {
    for (const b of visible) {
      if (a === b) continue;
      const apart =
        a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height + LABEL_SPACING_PX <= b.y + 1e-9 ||
        b.y + b.height + LABEL_SPACING_PX <= a.y + 1e-9;
      expect(apart, `${a.disc} overlaps ${b.disc}`).toBe(true);
    }
  }
}

/** Within a side, labels keep their discs' top-to-bottom order, so leader lines never cross. */
function expectOrdered(placed: readonly PlacedLabel[]): void {
  for (const side of ["left", "right"] as const) {
    const column = shown(placed).filter((p) => p.side === side).sort((a, b) => a.leader.y1 - b.leader.y1);
    column.forEach((p, i) => {
      if (i > 0) expect(p.y).toBeGreaterThan(column[i - 1].y);
    });
  }
}

describe("layoutLabels on 1440 desktop", () => {
  const W = 1440;
  const H = 810;
  const lit: DiscId[] = ["G04", "G05", "G06", "G01"]; // Ananya
  const { labels: placed, overflow } = layoutLabels(inputs(lit, W, H, [220, 44]), { width: W, height: H });

  it("keeps the input order and one label per disc, none hidden", () => {
    expect(placed.map((p) => p.disc)).toEqual(lit);
    expect(placed.every((p) => !p.hidden && !p.compact)).toBe(true);
    expect(overflow).toBe(false);
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
    const { labels: all } = layoutLabels(inputs(SEVEN, W, H, [220, 44]), { width: W, height: H });
    expectClean(all, W, H);
    expectOrdered(all);
  });
});

describe("layoutLabels on the sticky desktop canvas beside the words (review T4)", () => {
  // The locked layout puts the canvas beside the text, so about half of 1440, with real multi-line callouts.
  const W = 720;
  const H = 810;

  it("fits Ananya's 4 callouts of a heading and up to 3 names (90 px), with no overlap", () => {
    const { labels } = layoutLabels(inputs(["G04", "G05", "G06", "G01"], W, H, [230, 90]), { width: W, height: H });
    expectClean(labels, W, H);
    expectOrdered(labels);
    expect(shown(labels)).toHaveLength(4);
  });
});

describe("layoutLabels on a 390 px phone band", () => {
  const W = 390;
  const H = 410;

  it("flips to the left of the disc when the right side has no room", () => {
    const { labels } = layoutLabels(inputs(["G06", "G05"], W, H, [150, 36]), { width: W, height: H });
    for (const p of labels) {
      expect(p.side).toBe("left");
      expect(p.leader.x2).toBe(p.x + p.width);
    }
    expectClean(labels, W, H);
  });

  it("stacks four discs 25 px apart without overlap, in order", () => {
    const four: LabelInput[] = [60, 85, 110, 135].map((y, i) => ({
      disc: (["G06", "G05", "G04", "G03"] as DiscId[])[i], anchor: { x: 300, y }, width: 150, height: 36,
    }));
    const { labels } = layoutLabels(four, { width: W, height: H });
    expectClean(labels, W, H);
    expectOrdered(labels);
  });

  it("pushes a crowded column up from the bottom edge and still fits it", () => {
    const seven: LabelInput[] = SEVEN.map((disc, i) => ({ disc, anchor: { x: 300, y: 250 + i * 20 }, width: 140, height: 40 }));
    const { labels } = layoutLabels(seven, { width: W, height: H });
    expectClean(labels, W, H);
    expectOrdered(labels);
  });

  it("keeps a label wider than either side inside the screen", () => {
    const { labels } = layoutLabels([{ disc: "G04", anchor: { x: 195, y: 200 }, width: 300, height: 36 }], { width: W, height: H });
    expectClean(labels, W, H);
  });

  it("lays out nothing for no labels", () => {
    expect(layoutLabels([], { width: W, height: H })).toEqual({ labels: [], overflow: false });
  });
});

describe("review M2: labels on the two sides never overlap each other", () => {
  // Probe: anchors (190, 120) and (210, 140), labels 220 × 40. G05 went right but was clamped onto G04 on the left.
  const probe: LabelInput[] = [
    { disc: "G05", anchor: { x: 210, y: 120 }, width: 220, height: 40 },
    { disc: "G04", anchor: { x: 190, y: 140 }, width: 220, height: 40 },
  ];

  it.each([
    [390, 410],
    [1440, 810],
  ])("at %s × %s", (w, h) => {
    const { labels } = layoutLabels(probe, { width: w, height: h });
    expectClean(labels, w, h);
    expect(shown(labels)).toHaveLength(2);
  });
});

describe("review M3: a label whose disc is off the canvas or behind the camera is hidden", () => {
  it("hides anchors above and below a 410 px band, and places the one on it as before", () => {
    const close: LabelInput[] = [
      { disc: "G06", anchor: { x: 300, y: -180 }, width: 150, height: 36 },
      { disc: "G05", anchor: { x: 313, y: 180 }, width: 150, height: 36 },
      { disc: "G04", anchor: { x: 300, y: 470 }, width: 150, height: 36 },
    ];
    const { labels } = layoutLabels(close, { width: 390, height: 410 });
    expect(labels.map((p) => [p.disc, p.hidden, p.hiddenReason])).toEqual([
      ["G06", true, "offscreen"],
      ["G05", false, undefined],
      ["G04", true, "offscreen"],
    ]);
    expect(labels[1].y + labels[1].height / 2).toBeCloseTo(180, 9);
  });

  it("hides an anchor the projection marks not visible", () => {
    const { labels } = layoutLabels([{ disc: "G04", anchor: { x: 200, y: 200 }, width: 150, height: 36, visible: false }], {
      width: 390, height: 410,
    });
    expect(labels[0].hidden).toBe(true);
  });
});

describe("review M4: a column taller than the canvas never overlaps silently", () => {
  // Probe: 4 callouts of 90 px in a 300 px band overlapped (tops 8 and 10).
  const tall = (compactHeight?: number): LabelInput[] =>
    (["G06", "G05", "G04", "G01"] as DiscId[]).map((disc, i) => ({
      disc, anchor: { x: 300, y: 60 + i * 60 }, width: 150, height: 90, compactHeight,
    }));

  it("falls back to compact callouts when they fit, and says so", () => {
    const { labels, overflow } = layoutLabels(tall(36), { width: 390, height: 300 });
    expect(overflow).toBe(true);
    expect(labels.every((p) => p.compact && !p.hidden && p.height === 36)).toBe(true);
    expectClean(labels, 390, 300);
  });

  it("drops the lowest-priority labels when even compact ones don't fit, and says so", () => {
    const { labels, overflow } = layoutLabels(tall(), { width: 390, height: 300 });
    expect(overflow).toBe(true);
    expectClean(labels, 390, 300);
    const visible = shown(labels).map((p) => p.disc);
    expect(visible.length).toBeLessThan(4);
    expect(visible).toEqual((["G06", "G05", "G04", "G01"] as DiscId[]).slice(0, visible.length));
    expect(labels.filter((p) => p.hidden).every((p) => p.hiddenReason === "overflow")).toBe(true);
  });
});
