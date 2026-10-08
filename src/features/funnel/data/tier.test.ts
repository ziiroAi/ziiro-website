import { describe, expect, it } from "vitest";
import { REVENUE_BANDS, TEAM_BANDS } from "./contract";
import type { Tier } from "./contract";
import { tierFor } from "./tier";

// Rows follow TEAM_BANDS. Columns follow REVENUE_BANDS: band_1 (the lowest) to band_5, then undisclosed.
const TABLE: readonly (readonly Tier[])[] = [
  ["S", "S", "S", "M", "M", "S"], // solo
  ["S", "S", "S", "M", "M", "S"], // 2_5
  ["S", "M", "M", "L", "L", "M"], // 6_20
  ["M", "L", "L", "L", "L", "L"], // 21_50
  ["M", "L", "L", "L", "L", "L"], // 50_plus
];

describe("tierFor (§5.3)", () => {
  it("covers every team and revenue answer", () => {
    expect(TEAM_BANDS.map((team) => REVENUE_BANDS.map((band) => tierFor(team, band)))).toEqual(TABLE);
  });
});
