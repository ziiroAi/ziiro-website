import { describe, expect, it } from "vitest";
import { composePlan } from "@/features/funnel/data";
import { REVENUE_BANDS, TEAM_BANDS } from "@/features/funnel/data/light";
import { NO_CLASSIFIER, fallbackLeadPlan } from "./fallback-plan";

describe("the lead's plan when the plan's code can't load (review H2)", () => {
  it.each(TEAM_BANDS.flatMap((team) => REVENUE_BANDS.map((revenue) => [team, revenue] as const)))(
    "is lane C's unclassified plan for %s and %s, marked as never classified",
    (teamBand, revenueBand) => {
      const real = composePlan({ teamBand, revenueBand, currency: "INR", chips: [], problemText: "" });
      expect(real.fallback).toBe(true);
      expect(fallbackLeadPlan(teamBand, revenueBand)).toEqual({
        template: real.template, orderVariant: real.orderVariant, tier: real.tier, agentIds: real.agentIds,
        matchedPhrases: [], classifierVersion: NO_CLASSIFIER, agentsVersion: real.agentsVersion, fallback: true,
      });
    },
  );
});
