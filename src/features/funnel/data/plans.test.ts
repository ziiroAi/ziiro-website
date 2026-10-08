import { describe, expect, it } from "vitest";
import { jobIdsFor, stopsFor } from "./agents";
import { composePlan } from "./compose";
import { LIMITS, TIER_SIZE, TIERS } from "./contract";
import type { ChipId, PlanDescriptor, TeamBand, Tier } from "./contract";

const TEAM_FOR_TIER: Readonly<Record<Tier, TeamBand>> = { S: "solo", M: "6_20", L: "21_50" };

/** One way into each of the 9 routes in §6.7: 6 orders and 3 lanes. */
const ROUTE_INPUTS: readonly { name: string; chips: ChipId[]; problemText: string }[] = [
  { name: "A-default", chips: [], problemText: "help" },
  { name: "A-payments", chips: ["payments"], problemText: "" },
  { name: "A-numbers", chips: ["numbers"], problemText: "" },
  { name: "A-team", chips: ["team"], problemText: "" },
  { name: "B-convert", chips: ["convert"], problemText: "" },
  { name: "B-volume", chips: ["leads"], problemText: "" },
  { name: "content lane", chips: ["content"], problemText: "" },
  { name: "support lane", chips: ["support"], problemText: "" },
  { name: "hiring lane", chips: [], problemText: "we just can't find good people for the studio" },
];

const ALL: readonly { name: string; plan: PlanDescriptor }[] = ROUTE_INPUTS.flatMap((route) =>
  TIERS.map((tier) => ({
    name: `${route.name} ${tier}`,
    plan: composePlan({
      teamBand: TEAM_FOR_TIER[tier], revenueBand: "undisclosed", currency: "INR",
      chips: route.chips, problemText: route.problemText,
    }),
  })),
);

describe("the 27 plans (§6.7)", () => {
  it("light exactly §6.7's 9 sets of discs", () => {
    const sets = ALL.reduce<Record<string, string[]>>((acc, { name, plan }) => {
      const key = plan.litDiscs.join("+");
      return { ...acc, [key]: [...(acc[key] ?? []), name] };
    }, {});
    expect(sets).toEqual({
      "G01+G02": [
        "A-default S", "A-default M", "A-payments S", "A-payments M", "A-numbers S", "A-numbers M",
        "A-team S", "A-team M", "hiring lane M", "hiring lane L",
      ],
      "G01+G02+G03": ["A-default L", "A-payments L", "A-numbers L", "A-team L", "support lane M", "support lane L"],
      G04: ["B-convert S"],
      "G01+G04+G05+G06": ["B-convert M", "B-convert L", "B-volume M", "B-volume L"],
      "G04+G06": ["B-volume S"],
      "G01+G06": ["content lane S"],
      "G01+G02+G06": ["content lane M", "content lane L"],
      "G01+G03": ["support lane S"],
      G01: ["hiring lane S"],
    });
  });

  it("are each 3, 6 or 9 agents, as the tier says, with no repeats", () => {
    const wrong = ALL.filter(({ plan }) =>
      plan.agentIds.length !== TIER_SIZE[plan.tier] || new Set(plan.agentIds).size !== plan.agentIds.length);
    expect(wrong.map(({ name }) => name)).toEqual([]);
  });

  it("agree with themselves: jobs, stops, marks and discs", () => {
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    const broken = ALL.filter(({ plan }) =>
      !same(plan.jobIds, jobIdsFor(plan.agentIds)) ||
      !same(plan.stops, stopsFor(plan.agentIds)) ||
      plan.marks.runs + plan.marks.build + plan.marks.mapped !== plan.jobIds.length ||
      !same(plan.litDiscs, plan.stops.map((s) => s.disc).sort()));
    expect(broken.map(({ name }) => name)).toEqual([]);
  });

  it("stay inside /lead's limits", () => {
    const over = ALL.filter(({ plan }) =>
      plan.agentIds.length > LIMITS.agentIds || plan.matchedPhrases.length > LIMITS.matchedPhrases);
    expect(over.map(({ name }) => name)).toEqual([]);
  });

  it("carry the Pilot tag on lead-gen plans only (§5.7)", () => {
    expect(ALL.filter(({ plan }) => plan.pilot).map(({ name }) => name)).toEqual([
      "B-convert S", "B-convert M", "B-convert L", "B-volume S", "B-volume M", "B-volume L",
    ]);
  });
});
