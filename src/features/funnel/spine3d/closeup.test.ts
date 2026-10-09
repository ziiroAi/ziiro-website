// (C) W16-A: the close-up's glowing bands. Its gaps are 3-6x taller than the full spine's, so the full spine's band
// height (LOOK.ring.heightK of each gap's width) made solid drums there; its bands get their own height (worker-3, W16-C
// step 3).
import { describe, expect, it } from "vitest";
import { CLOSEUP, CLOSEUP_RING_HEIGHT_K, closeupRingGaps } from "./closeup";

describe("the close-up's ring gaps (W16-A)", () => {
  it("makes each band CLOSEUP_RING_HEIGHT_K of its gap's width tall, whatever the shared heightK", () => {
    expect(CLOSEUP_RING_HEIGHT_K).toBe(0.25);
    for (const heightK of [0.9, 2.2]) {
      closeupRingGaps(heightK).forEach((gap, i) => {
        expect(gap.width * heightK).toBeCloseTo(CLOSEUP.gaps[i].width * CLOSEUP_RING_HEIGHT_K, 9);
        expect(gap.centre).toEqual(CLOSEUP.gaps[i].centre);
        expect(gap.grooveRadius).toBe(CLOSEUP.gaps[i].grooveRadius);
      });
    }
  });
});

describe("the close-up's lowest gap (W16-C5)", () => {
  it("sits in the disc, 0.03 up its normal from W16-A's fit, and is as wide as the other two", () => {
    expect(CLOSEUP.gaps[0].centre).toEqual([0.03427, 0.1654, 0.10166]);
    expect(CLOSEUP.gaps[0].width).toBe(0.045);
  });
});
