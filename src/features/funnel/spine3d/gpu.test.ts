import { describe, expect, it, vi } from "vitest";
import { bloomScaleFor, maxDprFor, releaseOnThrow, shouldRelease } from "./gpu";

describe("the GPU budget (W14-K)", () => {
  it("draws a phone at 1.5 device pixels per CSS pixel at most, and desktop at 2", () => {
    expect(maxDprFor("phone")).toBe(1.5);
    expect(maxDprFor("desktop")).toBe(2);
  });

  it("keeps the bloom at the size worker-3 tuned the glow at, 4 CSS px per CSS px, on a retina desktop", () => {
    expect(bloomScaleFor("desktop", 2)).toBe(2);
  });

  it("W23-C: runs a phone's bloom at half that, 2 CSS px per CSS px (1:1 gate frames identical, about 14 MiB less GPU memory)", () => {
    expect(bloomScaleFor("phone", 1.5) * 1.5).toBeCloseTo(2);
  });

  it("never makes the desktop bloom bigger than it was before W14-K (the canvas times the pixel ratio), so a DPR 1 screen pays no more", () => {
    expect(bloomScaleFor("desktop", 1)).toBe(1);
    expect(bloomScaleFor("desktop", 1.5)).toBe(1.5);
  });

  it("lets go of a viewer's 3D only when it is off screen and another viewer is live", () => {
    expect(shouldRelease({ nearScreen: false, othersLive: true })).toBe(true);
    expect(shouldRelease({ nearScreen: true, othersLive: true })).toBe(false);
    expect(shouldRelease({ nearScreen: false, othersLive: false })).toBe(false);
  });
});

describe("a scene that fails while it is built (W14-V T5)", () => {
  it("gives its context back when the mesh or a shader fails, and passes the error on", async () => {
    const release = vi.fn();
    await expect(releaseOnThrow(release, () => Promise.reject(new Error("mesh-failed")))).rejects.toThrow("mesh-failed");
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("keeps its context when the build succeeds", async () => {
    const release = vi.fn();
    await expect(releaseOnThrow(release, async () => "scene")).resolves.toBe("scene");
    expect(release).not.toHaveBeenCalled();
  });
});
