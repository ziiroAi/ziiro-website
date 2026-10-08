import { describe, expect, it } from "vitest";
import { blendFraming, CLOSE_UP_HEIGHT, easeInOut, framingFor, type Framing } from "./camera";
import { GAPS } from "./gaps";

const base: Framing = { fovDeg: 22, visibleHeight: 1.07, centreY: 0.399, columnX: 0.765 };

describe("framingFor: where a camera target puts the camera", () => {
  it("keeps the base framing for the overview", () => {
    expect(framingFor({ kind: "overview" }, base)).toEqual(base);
  });

  it("closes in on a disc: centred on its gap, a close-up height, the column where it was", () => {
    const close = framingFor({ kind: "disc", disc: "G05" }, base);
    expect(close.centreY).toBe(GAPS[5].centre[1]);
    expect(close.visibleHeight).toBe(CLOSE_UP_HEIGHT);
    expect(close.columnX).toBe(base.columnX);
  });

  it("takes an explicit framing as it is", () => {
    const framing = { ...base, centreY: 0.7 };
    expect(framingFor({ kind: "framing", framing }, base)).toEqual(framing);
  });
});

describe("blendFraming and easeInOut: a flight between two framings", () => {
  const to = framingFor({ kind: "disc", disc: "G02" }, base);

  it("starts at the first framing and lands on the second", () => {
    expect(blendFraming(base, to, 0)).toEqual(base);
    expect(blendFraming(base, to, 1)).toEqual(to);
  });

  it("passes between them half way", () => {
    expect(blendFraming(base, to, 0.5).centreY).toBeCloseTo((base.centreY + to.centreY) / 2);
  });

  it("eases from 0 to 1 without going back", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    const samples = Array.from({ length: 21 }, (_, i) => easeInOut(i / 20));
    samples.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(samples[i]));
  });
});
