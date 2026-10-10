import { describe, expect, it } from "vitest";
import { DISCS } from "../data/contract";
import { discLevels, QUIET_LEVEL } from "./levels";

describe("discLevels (§6.7, D28)", () => {
  it("lights all nine discs when no plan is given, as in the approved r17", () => {
    expect(Object.values(discLevels())).toEqual(DISCS.map(() => 1));
  });

  it("lights only the plan's departments' discs; the rest, end discs included, keep 12 %", () => {
    // Ananya (§6.7): Deals, Sales, Marketing, Back Office.
    const levels = discLevels(["deals", "sales", "marketing", "back-office"]);
    expect(levels).toEqual({
      G00: QUIET_LEVEL, G01: 1, G02: QUIET_LEVEL, G03: QUIET_LEVEL, G04: 1,
      G05: 1, G06: 1, G07: QUIET_LEVEL, G08: QUIET_LEVEL,
    });
    expect(QUIET_LEVEL).toBe(0.12);
  });

  it("returns a new frozen object each time, so a caller can't change another plan's levels", () => {
    const a = discLevels(["sales"]);
    const b = discLevels(["sales"]);
    expect(a).not.toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
  });
});
