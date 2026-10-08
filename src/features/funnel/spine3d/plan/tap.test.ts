import { describe, expect, it } from "vitest";
import { boxFromPoints, hittableDiscs, isHittable, MIN_TARGET_PX, pickDisc, type ScreenDisc } from "./tap";

const box = (x0: number, y0: number, w: number, h: number) => ({ x0, y0, x1: x0 + w, y1: y0 + h });

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

describe("pickDisc: what a tap or a pointer lands on", () => {
  // A phone band in overview: discs 20 to 30 px apart, too small to tap (§6.2 "Phones have no disc buttons").
  const overview: ScreenDisc[] = [
    { disc: "G04", box: box(100, 200, 70, 24), inFront: true },
    { disc: "G05", box: box(100, 175, 70, 24), inFront: true },
  ];
  // The same band in a close-up on G04.
  const closeUp: ScreenDisc[] = [
    { disc: "G04", box: box(60, 150, 260, 80), inFront: true },
    { disc: "G05", box: box(70, 40, 240, 70), inFront: true },
    { disc: "G08", box: box(0, 0, 300, 60), inFront: true },
  ];

  it("ignores discs under 44 px, so nothing is tappable in the phone overview", () => {
    expect(pickDisc({ x: 130, y: 210 }, overview)).toBeNull();
    expect(hittableDiscs(overview)).toEqual([]);
  });

  it("picks the disc whose box holds the point once it is big enough", () => {
    expect(pickDisc({ x: 190, y: 190 }, closeUp)).toBe("G04");
    expect(pickDisc({ x: 190, y: 75 }, closeUp)).toBe("G05");
  });

  it("never picks an end disc, which has no department", () => {
    expect(pickDisc({ x: 10, y: 10 }, closeUp)).toBeNull();
    expect(hittableDiscs(closeUp)).toEqual(["G04", "G05"]);
  });

  it("misses when the point is outside every box", () => {
    expect(pickDisc({ x: 380, y: 400 }, closeUp)).toBeNull();
  });

  it("prefers a disc in front, then the one whose centre is nearest", () => {
    const overlap: ScreenDisc[] = [
      { disc: "G03", box: box(0, 0, 100, 100), inFront: false },
      { disc: "G02", box: box(40, 40, 100, 100), inFront: true },
      { disc: "G01", box: box(45, 45, 100, 100), inFront: true },
    ];
    expect(pickDisc({ x: 60, y: 60 }, overlap)).toBe("G02");
    expect(pickDisc({ x: 140, y: 140 }, overlap)).toBe("G01");
  });
});

describe("boxFromPoints: §6.7's 2nd to 98th percentile box of a disc's projected vertices", () => {
  it("drops the stray 2 % at each end", () => {
    const points = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i * 2 }));
    points.push({ x: 10_000, y: -10_000 });
    const b = boxFromPoints(points);
    expect(b.x0).toBeGreaterThanOrEqual(1);
    expect(b.x1).toBeLessThanOrEqual(99);
    expect(b.y0).toBeGreaterThanOrEqual(0);
    expect(b.y1).toBeLessThanOrEqual(198);
  });

  it("needs points", () => {
    expect(() => boxFromPoints([])).toThrow();
  });
});
