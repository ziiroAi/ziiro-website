import { describe, expect, it } from "vitest";
import type { DiscId } from "../../data/contract";
import { anchorFromBox } from "./tap";
import { LABEL_GAP_PX, LABEL_MARGIN_PX, LABEL_SPACING_PX, LEADER_INSET_PX, layoutLabels, type LabelInput, type PlacedLabel } from "./labels";

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

describe("review L3: a phone close-up label never covers its own disc", () => {
  // 390 close-up (proj.py): the disc fills 0.6 of the band, 236 px wide, its anchor (the band's right end) near x 313.
  // That leaves 57 px right of the anchor and 57 px left of the disc, so a 150 px label fits on neither side.
  const W = 390;
  const H = 410;
  const disc = { x0: 77, y0: 150, x1: 313, y1: 250 };
  const focused: LabelInput = { disc: "G04", anchor: { x: 313, y: 170 }, width: 150, height: 36, keepOut: disc };
  const covers = (p: PlacedLabel, box: typeof disc) =>
    !(p.x + p.width <= box.x0 || box.x1 <= p.x || p.y + p.height <= box.y0 || box.y1 <= p.y);

  it("puts the label above the disc, clear of it, with the leader to the label's bottom edge", () => {
    const { labels } = layoutLabels([focused], { width: W, height: H });
    const [p] = labels;
    expect(p.hidden).toBe(false);
    expect(covers(p, disc)).toBe(false);
    expect(p.side).toBe("above");
    expect(p.y + p.height).toBeLessThanOrEqual(disc.y0 - LABEL_GAP_PX + 1e-9);
    expect([p.leader.x1, p.leader.y1]).toEqual([313, 170]);
    expect(p.leader.y2).toBe(p.y + p.height);
    expectClean(labels, W, H);
  });

  it("goes below when there's no room above", () => {
    const high = { x0: 77, y0: 20, x1: 313, y1: 120 };
    const { labels } = layoutLabels([{ ...focused, anchor: { x: 313, y: 40 }, keepOut: high }], { width: W, height: H });
    const [p] = labels;
    expect(p.side).toBe("below");
    expect(covers(p, high)).toBe(false);
    expect(p.y).toBeGreaterThanOrEqual(high.y1 + LABEL_GAP_PX - 1e-9);
    expect(p.leader.y2).toBe(p.y);
    expectClean(labels, W, H);
  });

  it("keeps a left-side label clear of its disc too, measuring from the disc's left edge", () => {
    const narrow = { x0: 220, y0: 150, x1: 313, y1: 250 };
    const { labels } = layoutLabels([{ ...focused, keepOut: narrow }], { width: W, height: H });
    const [p] = labels;
    expect(p.side).toBe("left");
    expect(covers(p, narrow)).toBe(false);
    expect(p.leader.x1).toBe(narrow.x0);
  });

  it("hides it rather than cover the disc when neither above nor below fits", () => {
    const tall = { x0: 77, y0: 30, x1: 313, y1: 380 };
    const { labels, overflow } = layoutLabels([{ ...focused, keepOut: tall }], { width: W, height: H });
    expect(labels[0]).toMatchObject({ hidden: true, hiddenReason: "overflow" });
    expect(overflow).toBe(true);
  });

  it("drops the lower-priority label when a column label would collide with an above label", () => {
    const neighbour: LabelInput = { disc: "G05", anchor: { x: 300, y: 100 }, width: 150, height: 36 };
    const { labels } = layoutLabels([focused, neighbour], { width: W, height: H });
    expectClean(labels, W, H);
    expect(labels[0].hidden).toBe(false);
    expect(covers(labels[0], disc)).toBe(false);
  });
});

describe("re-check N1: an above/below callout goes compact before it is hidden", () => {
  it("keeps the named 150 × 90 callout on a 390 × 260 band, compact above its disc", () => {
    // Probe: box 116–274 × 104–165; 84 px above and 75 px below, so 90 px fits neither way, but 28 px does.
    const box = { x0: 116, y0: 104, x1: 274, y1: 165 };
    const { labels } = layoutLabels(
      [{ disc: "G05", anchor: anchorFromBox(box), width: 150, height: 90, compactHeight: 28, keepOut: box }],
      { width: 390, height: 260 },
    );
    const [p] = labels;
    expect(p).toMatchObject({ hidden: false, compact: true, height: 28, side: "above" });
    expect(p.y + p.height).toBeLessThanOrEqual(box.y0 - LABEL_GAP_PX + 1e-9);
    expect(p.leader.y2).toBe(p.y + p.height);
    expectClean(labels, 390, 260);
  });
});

describe("re-check N2: the one-side fallback respects keepOut", () => {
  it("doesn't clamp G04's label onto its own disc when both labels are forced right", () => {
    // Probe: two discs side by side at 390, G05 box 20–100 and G04 box 280–330; the old fallback put G04 at x 232.
    const g05 = { x0: 20, y0: 150, x1: 100, y1: 250 };
    const g04 = { x0: 280, y0: 150, x1: 330, y1: 250 };
    const { labels } = layoutLabels(
      [
        { disc: "G05", anchor: anchorFromBox(g05), width: 150, height: 36, keepOut: g05 },
        { disc: "G04", anchor: anchorFromBox(g04), width: 150, height: 36, keepOut: g04 },
      ],
      { width: 390, height: 410 },
    );
    expectClean(labels, 390, 410);
    for (const [p, box] of [[labels[0], g05], [labels[1], g04]] as const) {
      if (p.hidden) continue;
      const covers = !(p.x + p.width <= box.x0 || box.x1 <= p.x || p.y + p.height <= box.y0 || box.y1 <= p.y);
      expect(covers, `${p.disc} covers its disc`).toBe(false);
    }
    expect(labels[1].hidden).toBe(false);
  });
});

describe("W14-M: leader lines land straight and never run through another callout", () => {
  /** Does the segment pass through the box's inside (touching its edge doesn't count)? Liang-Barsky. */
  function crosses(l: PlacedLabel["leader"], b: PlacedLabel): boolean {
    const inset = 0.5;
    const [x0, y0, x1, y1] = [b.x + inset, b.y + inset, b.x + b.width - inset, b.y + b.height - inset];
    const dx = l.x2 - l.x1;
    const dy = l.y2 - l.y1;
    let t0 = 0;
    let t1 = 1;
    for (const [p, q] of [[-dx, l.x1 - x0], [dx, x1 - l.x1], [-dy, l.y1 - y0], [dy, y1 - l.y1]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
    return true;
  }
  const expectNoCrossing = (labels: readonly PlacedLabel[]) => {
    const visible = shown(labels);
    for (const a of visible) for (const b of visible) {
      if (a !== b) expect(crosses(a.leader, b), `${a.disc}'s leader runs through ${b.disc}`).toBe(false);
    }
  };

  it("drops a callout rather than run a leader through it (worker-2's desktop light d2, 648 × 816 column)", () => {
    // Disc boxes from tour-report.json, stage-relative; anchors on each box's right edge, 20 % down (§6.7).
    const box = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 });
    const g05 = box(190, 272, 517, 449);
    const g06 = box(237, 54, 495, 262);
    const g04 = box(145, 654, 559, 703);
    const at = (b: typeof g05) => ({ x: b.x1, y: b.y0 + 0.2 * (b.y1 - b.y0) });
    const { labels } = layoutLabels([
      { disc: "G04", anchor: at(g04), width: 230, height: 96, keepOut: g04 },
      { disc: "G05", anchor: at(g05), width: 230, height: 56, keepOut: g05 },
      { disc: "G06", anchor: at(g06), width: 230, height: 56, keepOut: g06 },
    ], { width: 648, height: 816 });
    expectClean(labels, 648, 816);
    expectNoCrossing(labels);
    expect(labels[1].hidden).toBe(false); // the stop in focus keeps its callout
  });

  it("ends a side leader at the anchor's own height when the label was pushed off it, not at the label's middle", () => {
    const three: LabelInput[] = (["G06", "G05", "G04"] as DiscId[]).map((disc) => ({
      disc, anchor: { x: 600, y: 300 }, width: 200, height: 60,
    }));
    const { labels } = layoutLabels(three, { width: 1440, height: 810 });
    for (const p of labels) {
      expect(p.leader.y2).toBeGreaterThanOrEqual(p.y + LEADER_INSET_PX - 1e-9);
      expect(p.leader.y2).toBeLessThanOrEqual(p.y + p.height - LEADER_INSET_PX + 1e-9);
      const nearest = Math.min(Math.max(300, p.y + LEADER_INSET_PX), p.y + p.height - LEADER_INSET_PX);
      expect(p.leader.y2).toBeCloseTo(nearest, 9);
    }
    expectNoCrossing(labels);
  });
});

describe("W14-M: a full-height column that tangles its leaders goes compact", () => {
  it("names all four of Ananya's lit parts in the phone overview band (real boxes from the 390 shot)", () => {
    // Disc boxes from the band (stage-relative), anchors on each right edge 20 % down; 354 px above the legend strip.
    // Full height, Deals (84 px) is pushed down onto Back Office's anchor, whose leader then ran through it.
    const disc = (id: DiscId, [x, y, w, h]: number[], height: number): LabelInput => ({
      disc: id, anchor: { x: x + w, y: y + 0.2 * h }, width: 150, height, compactHeight: 30,
      keepOut: { x0: x - 10, y0: y - 10, x1: x + w + 10, y1: y + h + 10 },
    });
    const view = { width: 390, height: 354 };
    const { labels } = layoutLabels([
      disc("G04", [153, 164, 42, 19], 84), disc("G05", [156, 131, 40, 20], 48),
      disc("G06", [162, 99, 37, 20], 48), disc("G01", [161, 265, 45, 17], 48),
    ], view);
    expect(shown(labels).map((p) => p.disc)).toEqual(["G04", "G05", "G06", "G01"]);
    expectClean(labels, view.width, view.height);
    expect(labels.every((p) => p.compact)).toBe(true);
  });

  it("keeps full callouts when they don't tangle", () => {
    const { labels } = layoutLabels(inputs(["G04", "G05", "G06", "G01"], 720, 810, [230, 90]), { width: 720, height: 810 });
    expect(labels.every((p) => !p.compact && !p.hidden)).toBe(true);
  });
});

describe("W14-X: callouts never sit over the spine, and keep their right margin", () => {
  const VIEW = { width: 648, height: 816 };
  const label = (disc: DiscId, x: number, y: number, keepOut: LabelInput["keepOut"]): LabelInput =>
    ({ disc, anchor: { x, y }, width: 210, height: 80, compactHeight: 30, keepOut });
  const overlaps = (p: PlacedLabel, b: { x0: number; y0: number; x1: number; y1: number }) =>
    p.x < b.x1 && p.x + p.width > b.x0 && p.y < b.y1 && p.y + p.height > b.y0;

  it("hides a callout whose only room is above or below its disc, on the column, rather than cover the spine", () => {
    // Stop 3's Deals box: no room either side, so the fallback centred it above its disc, on the vertebrae.
    const column = { x0: 150, y0: 100, x1: 420, y1: 700 };
    const deals = label("G04", 420, 400, { x0: 150, y0: 380, x1: 420, y1: 420 });
    const before = layoutLabels([deals], VIEW).labels[0];
    expect(before.hidden).toBe(false);
    expect(overlaps(before, column)).toBe(true);
    const after = layoutLabels([deals], { ...VIEW, avoid: [column] }).labels[0];
    expect(after.hidden).toBe(true);
  });

  it("drops a stacked callout that the column would run under, keeping the higher-priority one", () => {
    // The column bends right below the first disc: the second label, pushed down the stack, would land on it.
    const upper = { x0: 300, y0: 100, x1: 410, y1: 340 };
    const bend = { x0: 300, y0: 360, x1: 640, y1: 500 };
    const out = layoutLabels(
      [label("G05", 410, 300, { x0: 300, y0: 290, x1: 410, y1: 310 }), label("G04", 410, 330, { x0: 300, y0: 320, x1: 410, y1: 340 })],
      { ...VIEW, avoid: [upper, bend] },
    ).labels;
    expect(out[0].hidden).toBe(false);
    expect(out[1].hidden).toBe(true);
    shown(out).forEach((p) => [upper, bend].forEach((b) => expect(overlaps(p, b)).toBe(false)));
  });

  it("keeps a desktop callout 24 px from the right edge when asked", () => {
    const tight = label("G06", 404, 300, { x0: 300, y0: 290, x1: 404, y1: 310 });
    const loose = layoutLabels([tight], VIEW).labels[0];
    expect(loose.side).toBe("right");
    expect(loose.x + loose.width).toBeGreaterThan(VIEW.width - 24);
    const kept = layoutLabels([tight], { ...VIEW, marginRight: 24 }).labels[0];
    if (!kept.hidden) expect(kept.x + kept.width).toBeLessThanOrEqual(VIEW.width - 24);
    expect(kept.side).not.toBe("right");
  });
});

// W19-RING: m5's gaps re-centred inside their rims moved the phone hero's discs by a few px, and the Deals callout
// (G04) vanished: the right column pushed its taller label down beside lower vertebrae, whose band reaches further
// right than G04's own anchor (the spine curves right lower down), so onSpine hid it. Inputs captured from the live
// phone hero (390 px, m5b, gaps 0/2/3 re-centred).
describe("W19-RING: a label pushed down its column clears the spine beside its new height", () => {
  const view = {
    width: 390, height: 410, marginRight: 8,
    avoid: [
      { x0: 136, y0: 56, x1: 212, y1: 100 }, { x0: 125, y0: 83, x1: 209, y1: 131 }, { x0: 112, y0: 116, x1: 206, y1: 167 },
      { x0: 99, y0: 150, x1: 204, y1: 206 }, { x0: 93, y0: 185, x1: 204, y1: 248 }, { x0: 109, y0: 225, x1: 209, y1: 294 },
      { x0: 97, y0: 270, x1: 218, y1: 334 }, { x0: 107, y0: 306, x1: 216, y1: 372 },
    ],
  };
  const hero: LabelInput[] = [
    { disc: "G04", anchor: { x: 204, y: 197 }, width: 150, height: 84, compactHeight: 30, keepOut: { x0: 145, y0: 175, x1: 214, y1: 216 } },
    { disc: "G05", anchor: { x: 206, y: 162 }, width: 150, height: 48, compactHeight: 30, keepOut: { x0: 150, y0: 140, x1: 216, y1: 177 } },
    { disc: "G06", anchor: { x: 209, y: 128 }, width: 150, height: 48, compactHeight: 30, keepOut: { x0: 157, y0: 106, x1: 219, y1: 141 } },
    { disc: "G01", anchor: { x: 219, y: 321 }, width: 150, height: 48, compactHeight: 30, keepOut: { x0: 158, y0: 296, x1: 229, y1: 344 } },
  ];
  const overSpine = (p: PlacedLabel) =>
    view.avoid.some((b) => p.x < b.x1 && p.x + p.width > b.x0 && p.y < b.y1 && p.y + p.height > b.y0);

  it("keeps every callout of the phone hero, the first (Deals) above all", () => {
    const { labels } = layoutLabels(hero, view);
    expect(labels.filter((l) => l.hidden).map((l) => l.disc)).toEqual([]);
    shown(labels).forEach((p) => expect(overSpine(p)).toBe(false));
    expectClean(labels, view.width, view.height);
  });

  it("still keeps them all however the gap centres nudge the discs a few px", () => {
    for (let dx = -6; dx <= 6; dx += 3) {
      const moved = hero.map((l) => ({ ...l, anchor: { x: l.anchor.x + dx, y: l.anchor.y }, keepOut: { ...l.keepOut!, x0: l.keepOut!.x0 + dx, x1: l.keepOut!.x1 + dx } }));
      const { labels } = layoutLabels(moved, { ...view, avoid: view.avoid.map((b) => ({ ...b, x0: b.x0 + dx, x1: b.x1 + dx })) });
      expect(labels.find((l) => l.disc === "G04")!.hidden).toBe(false);
      shown(labels).forEach((p) => expect(view.avoid.some((b) => p.x < b.x1 + dx && p.x + p.width > b.x0 + dx && p.y < b.y1 && p.y + p.height > b.y0)).toBe(false));
    }
  });

  it("still hides a label that no slide can clear of the spine", () => {
    const wall = { ...view, avoid: [{ x0: 0, y0: 0, x1: 390, y1: 410 }] };
    expect(layoutLabels(hero, wall).labels.every((l) => l.hidden)).toBe(true);
  });
});

// W20-MID: at the 1024 x 768 desktop hero the right column had no room, so the callouts went left of the spine, over
// the hero's paragraph and stats. marginLeft keeps every label right of the words' column: right, compact or hidden.
describe("W20-MID: a label never goes left of marginLeft", () => {
  const view = { width: 1024, height: 600, marginRight: 24 };
  const at = (disc: DiscId, x: number, y: number, height: number): LabelInput =>
    ({ disc, anchor: { x, y }, width: 196, height, compactHeight: 36, keepOut: { x0: x - 70, y0: y - 18, x1: x, y1: y + 18 } });
  const hero = [at("G04", 812, 330, 84), at("G05", 816, 262, 52), at("G06", 820, 196, 52), at("G01", 836, 520, 52)];

  it("goes left of the spine without it (the bug)", () => {
    expect(shown(layoutLabels(hero, view).labels).some((l) => l.x < 579)).toBe(true);
  });

  it("keeps every shown label right of marginLeft with it", () => {
    const out = shown(layoutLabels(hero, { ...view, marginLeft: 579 }).labels);
    out.forEach((l) => expect(l.x, l.disc).toBeGreaterThanOrEqual(579));
    out.forEach((l) => expect(l.x + l.width, l.disc).toBeLessThanOrEqual(1024 - 24));
  });
});
