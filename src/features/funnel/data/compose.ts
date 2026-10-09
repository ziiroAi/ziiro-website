// §5.2 to §5.5 and §6.3: which agents a plan needs, in which order, and where their words point.
import { agentById, AGENTS_VERSION, jobIdsFor, marksFor, stopsFor } from "./agents.js";
import { classify, CLASSIFIER_VERSION } from "./classifier/classify.js";
import { AGENT_IDS, TIER_SIZE } from "./contract.js";
import type { AgentId, Bucket, DepartmentId, Lane, OrderVariant, PlanDescriptor, PlanInput, Template, Tier } from "./contract.js";
import { tierFor } from "./tier.js";

const byNumber = (numbers: readonly number[]): AgentId[] => numbers.map((n) => AGENT_IDS[n - 1]);

/** §5.4: each order's priority list, written as agent numbers. */
export const priority: Readonly<Record<OrderVariant, readonly AgentId[]>> = {
  "A-default": byNumber([29, 30, 26, 25, 31, 32, 27, 24, 21]),
  "A-payments": byNumber([29, 30, 26, 25, 31, 32, 27, 24, 21]),
  "A-numbers": byNumber([30, 29, 26, 25, 31, 32, 27, 24, 21]),
  "A-team": byNumber([26, 27, 32, 29, 30, 25, 31, 24, 21]),
  "B-convert": byNumber([16, 17, 18, 15, 6, 30, 20, 19, 29]),
  "B-volume": byNumber([6, 7, 16, 17, 12, 30, 9, 11, 18]),
};

/** §5.4: content, support and hiring plans add their lane's agent. */
export const laneAgent: Readonly<Record<Lane, AgentId>> = {
  content: "marketing-creation",
  support: "customer-support",
  hiring: "back-office-talent",
};

export interface Route {
  template: Template;
  orderVariant: OrderVariant;
  lane: Lane | null;
}

/** §5.2: the problem picks the template, the order and the lane. */
export const ROUTES: Readonly<Record<Bucket, Route>> = {
  lead_gen: { template: "B", orderVariant: "B-volume", lane: null },
  sales: { template: "B", orderVariant: "B-convert", lane: null },
  ads: { template: "B", orderVariant: "B-volume", lane: null },
  numbers: { template: "A", orderVariant: "A-numbers", lane: null },
  payments: { template: "A", orderVariant: "A-payments", lane: null },
  team_ops: { template: "A", orderVariant: "A-team", lane: null },
  content: { template: "A", orderVariant: "A-default", lane: "content" },
  support: { template: "A", orderVariant: "A-default", lane: "support" },
  hiring: { template: "A", orderVariant: "A-default", lane: "hiring" },
  unclassified: { template: "A", orderVariant: "A-default", lane: null },
};

/** §5.4: the order's first 3, 6 or 9 agents. A lane's agent takes the last place unless it's already in. */
export function agentsFor(route: Route, tier: Tier): AgentId[] {
  const picked = priority[route.orderVariant].slice(0, TIER_SIZE[tier]);
  if (route.lane === null || picked.includes(laneAgent[route.lane])) return picked;
  return [...picked.slice(0, -1), laneAgent[route.lane]];
}

export function composePlan(input: PlanInput): PlanDescriptor {
  const classification = classify(input.problemText, input.chips);
  const route = ROUTES[classification.bucketPrimary];
  const tier = tierFor(input.teamBand, input.revenueBand);
  const stops = stopsFor(agentsFor(route, tier));
  const agentIds = stops.flatMap((s) => s.agentIds);
  return {
    ...classification,
    template: route.template,
    orderVariant: route.orderVariant,
    lane: route.lane,
    tier,
    agentIds,
    jobIds: jobIdsFor(agentIds),
    stops,
    marks: marksFor(agentIds),
    litDiscs: stops.map((s) => s.disc).sort(),
    pilot: route.template === "B",
    fallback: classification.bucketPrimary === "unclassified",
    currency: input.currency,
    classifierVersion: CLASSIFIER_VERSION,
    agentsVersion: AGENTS_VERSION,
  };
}

/**
 * W17-B: the sample plan for a visitor who runs no business (S1b), now that S1b leads to the plan page (the owner
 * vetoed D15's /products). It's what a small business gets before it says anything: no words and no chips, so the
 * fallback plan, sized for a team of 2 to 5.
 */
export const GUEST_PLAN_INPUT: Readonly<PlanInput> = { teamBand: "2_5", revenueBand: "band_2", currency: "INR", chips: [], problemText: "" };

export function composeGuestPlan(): PlanDescriptor {
  return composePlan({ ...GUEST_PLAN_INPUT, chips: [] });
}

/** §6.3 and D36: their words, classified alone without the chips, point at a department. A content, support or
 *  hiring problem points at its lane agent's department; any other problem, at its order's first agent's. */
export function wordsDepartmentFor(problemText: string): DepartmentId | null {
  const alone = classify(problemText, []);
  if (alone.bucketPrimary === "unclassified") return null;
  const route = ROUTES[alone.bucketPrimary];
  const agentId = route.lane === null ? priority[route.orderVariant][0] : laneAgent[route.lane];
  return agentById(agentId)?.department ?? null;
}
