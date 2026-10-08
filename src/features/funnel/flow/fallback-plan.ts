/**
 * (C) The lead's plan when the plan's code can't load (review H2, fix step 3): a deploy mid-visit, a dropped
 * connection. The lead still goes to /lead, so the team hears of it and the server emails the fallback plan (§5.7).
 * This is lane C's unclassified plan for their tier, copied here so it needs none of the plan's code;
 * fallback-plan.test.ts checks it against composePlan for every team and revenue band.
 */
import type { AgentId, LeadPlan, RevenueBand, TeamBand, Tier } from "@/features/funnel/data/light";
import { tierFor } from "@/features/funnel/data/tier";

/** classifierVersion when the classifier never ran, so the saved lead shows it. */
export const NO_CLASSIFIER = "none";
const AGENTS_VERSION = "2026-10-04";

const S: readonly AgentId[] = ["back-office-money-in", "back-office-finance-reporting", "operations-client-comms"];
const M: readonly AgentId[] = [
  "back-office-money-in", "back-office-finance-reporting", "back-office-records", "back-office-office",
  "operations-client-comms", "operations-build-ops",
];
const L: readonly AgentId[] = [...M, "operations-knowledge", "operations-onboarding", "customer-support"];
const AGENTS: Readonly<Record<Tier, readonly AgentId[]>> = { S, M, L };

export function fallbackLeadPlan(teamBand: TeamBand, revenueBand: RevenueBand): LeadPlan {
  const tier = tierFor(teamBand, revenueBand);
  return {
    template: "A", orderVariant: "A-default", tier, agentIds: [...AGENTS[tier]],
    matchedPhrases: [], classifierVersion: NO_CLASSIFIER, agentsVersion: AGENTS_VERSION, fallback: true,
  };
}
