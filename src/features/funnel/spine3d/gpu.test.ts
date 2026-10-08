import { describe, expect, it } from "vitest";
import { bloomScaleFor, maxDprFor, shouldRelease } from "./gpu";

describe("the GPU budget (W14-K)", () => {
  it("draws a phone at 1.5 device pixels per CSS pixel at most, and desktop at 2", () => {
    expect(maxDprFor("phone")).toBe(1.5);
    expect(maxDprFor("desktop")).toBe(2);
  });

  it("keeps the bloom at the size worker-3 tuned the glow at, 4 CSS px per CSS px, on a phone and a retina desktop", () => {
    expect(bloomScaleFor("desktop", 2)).toBe(2);
    expect(bloomScaleFor("phone", 1.5) * 1.5).toBeCloseTo(4);
  });

  it("never makes the bloom more than twice the canvas on desktop, so a DPR 1 screen does not pay for a 4x bloom", () => {
    expect(bloomScaleFor("desktop", 1)).toBe(2);
  });

  it("lets go of a viewer's 3D only when it is off screen and another viewer is live", () => {
    expect(shouldRelease({ nearScreen: false, othersLive: true })).toBe(true);
    expect(shouldRelease({ nearScreen: true, othersLive: true })).toBe(false);
    expect(shouldRelease({ nearScreen: false, othersLive: false })).toBe(false);
  });
});
