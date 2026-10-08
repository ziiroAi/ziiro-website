// §5.3: the size of the plan.
import type { RevenueBand, TeamBand, Tier } from "./contract.js";

const BY_TEAM: Readonly<Record<TeamBand, Tier>> = { solo: "S", "2_5": "S", "6_20": "M", "21_50": "L", "50_plus": "L" };
const ONE_DOWN: Readonly<Record<Tier, Tier>> = { S: "S", M: "S", L: "M" };
const ONE_UP: Readonly<Record<Tier, Tier>> = { S: "M", M: "L", L: "L" };

/** The team sets the tier. The lowest revenue band moves it down one, and the top two move it up one. */
export function tierFor(team: TeamBand, revenue: RevenueBand): Tier {
  const base = BY_TEAM[team];
  if (revenue === "band_1") return ONE_DOWN[base];
  if (revenue === "band_4" || revenue === "band_5") return ONE_UP[base];
  return base;
}
