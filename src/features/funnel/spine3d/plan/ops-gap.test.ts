// (C) W24-D / review D-1: gap 2 (Operations) was re-fitted to its groove's own plane on m5c. Its ring, its front and
// its stops' reach were measured together, so they move together: changing one means measuring all three again
// (worker-3's $BUS/funnel/spine3d/w24 groove.mjs, iterate.mjs, anterior rule, reach.mjs).
// Also measured then: G01 (Back Office) and G03 (Customer) sit 0.014 and 0.044 off their grooves from a right stop's
// camera. No tour shows them from there today; a tour that does needs the same re-fit for them.
import { describe, expect, it } from "vitest";
import { LOOK } from "../look";
import { ANTERIOR } from "./facing";
import { STOP_REACH } from "./stagePath";

const OPERATIONS = 2;
/** m5c's groove at gap 2: its floor, and the lower of its two lips (the front lower lip, w24 iterate.mjs). */
const GROOVE_FLOOR = 0.052;
const LIP = 0.068;
/** The ring sits at grooveRadius x 1.04 (look-three.ts). */
const RING_SCALE = 1.04;

const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const unit = (v: readonly number[]) => v.map((x) => x / Math.hypot(...v));

describe("the Operations ring sits in its groove (W24-D, review D-1)", () => {
  const gap = LOOK.gaps[OPERATIONS];

  it("inside the lips, and out from the floor: not on the bone, not buried", () => {
    const ring = gap.grooveRadius * RING_SCALE;
    expect(ring).toBeLessThan(LIP);
    expect(ring).toBeGreaterThan(GROOVE_FLOOR);
  });

  it("its front lies in the ring's plane", () => {
    expect(Math.abs(dot(unit(ANTERIOR[OPERATIONS]), unit(gap.normal)))).toBeLessThan(0.05);
  });

  it("its ring, front and stop reach are the set measured together on m5c", () => {
    expect({ centre: gap.centre, normal: gap.normal, grooveRadius: gap.grooveRadius }, "LOOK.gaps[2] moved: re-measure ANTERIOR[2] and STOP_REACH[2] too")
      .toEqual({ centre: [0.04091, 0.26302, 0.03526], normal: [0.21915, 0.79317, -0.56821], grooveRadius: 0.0617 });
    expect(ANTERIOR[OPERATIONS], "ANTERIOR[2] moved: it is measured in gap 2's plane").toEqual([0.9711, -0.1212, 0.2054]);
    expect(STOP_REACH[OPERATIONS], "STOP_REACH[2] moved: it follows ANTERIOR[2]'s stop turns").toEqual({
      left: [0.2285, 0.2281, 0.2239, 0.2145],
      right: [0.1811, 0.1848, 0.1875, 0.1911],
    });
  });
});
