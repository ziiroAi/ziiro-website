import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { buildPlanEmail, type PlanEmailInput } from "../../api/funnel/_email";
import {
  CHIPS, CURRENCIES, REVENUE_BANDS, TEAM_BANDS, type ChipId, type PlanDescriptor,
} from "../../src/features/funnel/data/contract";
import { composePlan } from "../../src/features/funnel/data";
import { PlanPage } from "../../src/features/funnel/plan/PlanPage";

export const VISITOR = { name: "Ananya", email: "ananya@example.com" };

export interface Reached { plan: PlanDescriptor; chips: ChipId[]; problemText: string }

/**
 * The words that reach each plan: each chip alone, an unclassified sentence, and the hiring lane. No chip leads to
 * hiring, and text under 4 words with no chip is unclassified (§5.2 rule 6), so the hiring words are a sentence:
 * the one lane C's plans test uses for its hiring route.
 */
const WORDS: { chips: ChipId[]; problemText: string }[] = [
  ...CHIPS.map((chip) => ({ chips: [chip], problemText: "" })),
  { chips: [], problemText: "We sell furniture." },
  { chips: [], problemText: "we just can't find good people for the studio" },
];

/** Every distinct plan the composer can produce, at every size and in both currencies. */
export function reachablePlans(): Reached[] {
  const seen = new Map<string, Reached>();
  for (const words of WORDS) for (const teamBand of TEAM_BANDS) for (const revenueBand of REVENUE_BANDS) for (const currency of CURRENCIES) {
    const plan = composePlan({ ...words, teamBand, revenueBand, currency });
    const key = [plan.orderVariant, plan.lane, plan.tier, plan.fallback, plan.currency].join("|");
    if (!seen.has(key)) seen.set(key, { plan, ...words });
  }
  return [...seen.values()];
}

export const planName = ({ plan }: Reached) =>
  `${plan.orderVariant}${plan.lane ? `+${plan.lane}` : ""} ${plan.tier}${plan.fallback ? " fallback" : ""} ${plan.currency}`;

export function planHtml({ plan, chips, problemText }: Reached): string {
  return renderToStaticMarkup(
    createElement(HelmetProvider, null,
      createElement(MemoryRouter, null,
        createElement(PlanPage, { plan, visitor: VISITOR, words: { problemText, chips }, saveNotice: null, onProgress: () => {} }))),
  );
}

/**
 * The plan email's subject and text for this plan (lane B, Task 8). PlanEmailInput needs no visit ID,
 * consent or token, so the check can write an email for every plan (00-index §1.5, request 3). The plan
 * carries fallback (request 16), so a support L plan and an unclassified L plan get different emails.
 */
export function emailText({ plan, chips, problemText }: Reached): string {
  const input: PlanEmailInput = {
    name: VISITOR.name,
    email: VISITOR.email,
    ...(problemText ? { problemText } : {}),
    chips,
    plan: {
      template: plan.template, orderVariant: plan.orderVariant, tier: plan.tier, agentIds: plan.agentIds,
      matchedPhrases: plan.matchedPhrases, classifierVersion: plan.classifierVersion, agentsVersion: plan.agentsVersion,
      fallback: plan.fallback,
    },
  };
  const email = buildPlanEmail(input);
  return `${email.subject}\n${email.text}`;
}
