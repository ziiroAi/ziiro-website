import { describe, expect, it } from "vitest";
import {
  anchorFromBox, boxFromPoints, clipBox, hitArea, hittableDiscs, isHittable, MIN_TARGET_PX, padToMin, pickDisc,
  type ScreenDisc,
} from "./tap";

const box = (x0: number, y0: number, w: number, h: number) => ({ x0, y0, x1: x0 + w, y1: y0 + h });
const PHONE = { width: 390, height: 410 };
const DESKTOP = { width: 720, height: 810 };
const height = (b: { y0: number; y1: number }) => b.y1 - b.y0;

describe("isHittable: §11.3's 44 × 44 px", () => {
  it("is 44 px", () => expect(MIN_TARGET_PX).toBe(44));

  it.each([
    [44, 44, true],
    [120, 44, true],
    [43.9, 60, false],
    [60, 43.9, false],
    [20, 20, false],
  ])("a %s × %s box: %s", (w, h, ok) => {
    expect(isHittable(box(0, 0, w, h))).toBe(ok);
  });
});

describe("hitArea: phone refuses a disc under 44 px, desktop pads it to 44 (§6.2, locked scope)", () => {
  // Review H2: the desktop overview at 810 tall gives boxes like G03 82 × 43, which must still open.
  const g03: ScreenDisc = { disc: "G03", box: box(500, 400, 82, 30), inFront: true };

  it("on desktop pads an 82 × 30 box to at least 44 × 44, around its centre", () => {
    const area = hitArea(g03, "desktop", DESKTOP)!;
    expect(height(area)).toBeGreaterThanOrEqual(44);
    expect(area.x1 - area.x0).toBeGreaterThanOrEqual(82);
    expect((area.y0 + area.y1) / 2).toBeCloseTo(415, 9);
    expect(hittableDiscs([g03], "desktop", DESKTOP)).toEqual(["G03"]);
  });

  it("on a phone refuses the same box", () => {
    expect(hitArea(g03, "phone", PHONE)).toBeNull();
    expect(hittableDiscs([{ ...g03, box: box(100, 100, 82, 30) }], "phone", PHONE)).toEqual([]);
  });

  it("padToMin leaves a box that is already big enough alone", () => {
    expect(padToMin(box(0, 0, 100, 60), 44)).toEqual(box(0, 0, 100, 60));
  });
});

describe("the 44 px rule measures the box on screen (review H3)", () => {
  // proj.py, desktop close-up on G04 in a 720 × 810 canvas: G05's box runs off the top edge.
  const sliver: ScreenDisc = { disc: "G05", box: { x0: 210, y0: -41, x1: 512, y1: 20 }, inFront: true };

  it("clips the box to the canvas first", () => {
    expect(clipBox(sliver.box, DESKTOP)).toEqual({ x0: 210, y0: 0, x1: 512, y1: 20 });
    expect(clipBox(box(800, 900, 50, 50), DESKTOP)).toBeNull();
  });

  it("refuses the 20 px strip on a phone-sized rule", () => {
    expect(hitArea(sliver, "phone", { width: 720, height: 810 })).toBeNull();
    expect(pickDisc({ x: 300, y: 10 }, [sliver], "phone", { width: 720, height: 810 })).toBeNull();
  });

  it("on desktop pads only the visible part, anchored on its centre", () => {
    const area = hitArea(sliver, "desktop", DESKTOP)!;
    expect((area.y0 + area.y1) / 2).toBeCloseTo(10, 9);
    expect(height(area)).toBe(44);
  });

  it("never targets a disc behind the camera", () => {
    const behind: ScreenDisc = { disc: "G04", box: box(100, 100, 200, 80), inFront: true, behindCamera: true };
    expect(hitArea(behind, "desktop", DESKTOP)).toBeNull();
    expect(pickDisc({ x: 150, y: 140 }, [behind], "desktop", DESKTOP)).toBeNull();
  });
});

describe("pickDisc: what a tap or a pointer lands on", () => {
  // A phone band in overview: discs 20 to 30 px apart, too small to tap (§6.2 "Phones have no disc buttons").
  const overview: ScreenDisc[] = [
    { disc: "G04", box: box(100, 200, 70, 24), inFront: true },
    { disc: "G05", box: box(100, 175, 70, 24), inFront: true },
  ];
  // A phone close-up on G04 (proj.py: 236 × 92 at 390 × 410); its neighbours are off the band.
  const closeUp: ScreenDisc[] = [
    { disc: "G04", box: box(77, 159, 236, 92), inFront: true },
    { disc: "G05", box: box(80, -217, 230, 80), inFront: true },
    { disc: "G08", box: box(0, 0, 300, 60), inFront: true },
  ];

  it("ignores discs under 44 px, so nothing is tappable in the phone overview", () => {
    expect(pickDisc({ x: 130, y: 210 }, overview, "phone", PHONE)).toBeNull();
    expect(hittableDiscs(overview, "phone", PHONE)).toEqual([]);
  });

  it("picks the close-up disc, and nothing off the band", () => {
    expect(pickDisc({ x: 190, y: 200 }, closeUp, "phone", PHONE)).toBe("G04");
    expect(hittableDiscs(closeUp, "phone", PHONE)).toEqual(["G04"]);
  });

  it("never picks an end disc, which has no department", () => {
    expect(pickDisc({ x: 10, y: 10 }, closeUp, "phone", PHONE)).toBeNull();
  });

  it("misses when the point is outside every box", () => {
    expect(pickDisc({ x: 380, y: 400 }, closeUp, "phone", PHONE)).toBeNull();
  });

  it("prefers a disc in front, then the one whose centre is nearest", () => {
    const overlap: ScreenDisc[] = [
      { disc: "G03", box: box(0, 0, 100, 100), inFront: false },
      { disc: "G02", box: box(40, 40, 100, 100), inFront: true },
      { disc: "G01", box: box(45, 45, 100, 100), inFront: true },
    ];
    expect(pickDisc({ x: 60, y: 60 }, overlap, "phone", PHONE)).toBe("G02");
    expect(pickDisc({ x: 140, y: 140 }, overlap, "phone", PHONE)).toBe("G01");
  });
});

describe("§6.7's box and anchor rules", () => {
  it("boxFromPoints keeps the 2nd to 98th percentile", () => {
    const points = Array.from({ length: 101 }, (_, i) => ({ x: i, y: 1000 - i }));
    expect(boxFromPoints(points)).toEqual({ x0: 2, y0: 902, x1: 98, y1: 998 });
  });

  it("boxFromPoints needs points", () => {
    expect(() => boxFromPoints([])).toThrow();
  });

  it("anchorFromBox is the box's right edge, 20 % down: discs-1920.json G04 at the hero camera", () => {
    // proto/look/web/layers/discs-1920.json, frame 0: box [0.7018, 0.3756, 0.7559, 0.4556], anchor [0.7559, 0.3916].
    const a = anchorFromBox({ x0: 0.7018, y0: 0.3756, x1: 0.7559, y1: 0.4556 });
    expect(Math.abs(a.x - 0.7559)).toBeLessThanOrEqual(0.0006);
    expect(Math.abs(a.y - 0.3916)).toBeLessThanOrEqual(0.0006);
  });
});
