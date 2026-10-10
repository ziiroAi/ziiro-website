import { describe, expect, it } from "vitest";
import { baseFraming, blendFraming, CLOSE_UP_HEIGHT, easeInOut, framingFor, visibleTan } from "./camera";
import { GAPS } from "./gaps";
import { LOOK } from "./look";

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("baseFraming: r17's own camera (worker-3's look.ts), per mesh size", () => {
  it.each(["desktop", "phone"] as const)("takes the %s pose as it is", (size) => {
    const c = LOOK.camera[size];
    expect(baseFraming(size)).toEqual({ position: c.position, target: c.target, rollDeg: c.rollDeg, lensMm: c.lensMm, shift: c.shift });
  });
});

describe("framingFor: where a camera target puts the camera", () => {
  it("keeps r17's camera for the overview", () => {
    expect(framingFor({ kind: "overview" }, "desktop")).toEqual(baseFraming("desktop"));
  });

  it.each(["desktop", "phone"] as const)("closes in on a disc on %s: aimed at its gap, CLOSE_UP_HEIGHT tall in frame", (size) => {
    const base = baseFraming(size);
    const close = framingFor({ kind: "disc", disc: "G05" }, size);
    expect(close.target).toEqual(GAPS[5].centre);
    const visible = 2 * dist(close.position, close.target) * visibleTan(LOOK.camera[size]);
    expect(visible).toBeCloseTo(CLOSE_UP_HEIGHT);
    // The same view direction, roll, lens and shift: only the distance and the aim change.
    const dir = (f: typeof base) => f.position.map((p, i) => (p - f.target[i]) / dist(f.position, f.target));
    dir(close).forEach((v, i) => expect(v).toBeCloseTo(dir(base)[i]));
    expect([close.rollDeg, close.lensMm, close.shift]).toEqual([base.rollDeg, base.lensMm, base.shift]);
  });

  it("takes an explicit framing as it is", () => {
    const framing = { ...baseFraming("phone"), lensMm: 80 };
    expect(framingFor({ kind: "framing", framing }, "phone")).toEqual(framing);
  });
});

describe("blendFraming and easeInOut: a flight between two framings", () => {
  const from = baseFraming("desktop");
  const to = framingFor({ kind: "disc", disc: "G02" }, "desktop");

  it("starts at the first framing and lands on the second", () => {
    expect(blendFraming(from, to, 0)).toEqual(from);
    expect(blendFraming(from, to, 1)).toEqual(to);
  });

  it("passes between them half way", () => {
    const half = blendFraming(from, to, 0.5);
    half.target.forEach((v, i) => expect(v).toBeCloseTo((from.target[i] + to.target[i]) / 2));
  });

  it("eases from 0 to 1 without going back", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    const samples = Array.from({ length: 21 }, (_, i) => easeInOut(i / 20));
    samples.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(samples[i]));
  });
});
