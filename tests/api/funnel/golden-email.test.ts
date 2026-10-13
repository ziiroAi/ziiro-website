import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { buildPlanEmail } from "../../../api/funnel/_email";
import { calendlyUrl, composePlan } from "../../../src/features/funnel/data";
import type { LeadRequest } from "../../../src/features/funnel/data/contract";

const lead = ananya as LeadRequest;
const golden = readFileSync(new URL("../../fixtures/ananya-email.txt", import.meta.url), "utf8");

describe("Ananya's plan email (§7, §12)", () => {
  const email = buildPlanEmail({
    name: lead.name, email: lead.email, problemText: lead.answers.problemText, chips: lead.answers.chips, plan: lead.plan,
  });

  it("has the golden subject", () => {
    expect(email.subject).toBe("Ananya, your plan: 6 agents to start with");
  });

  it("matches copy.md M line for line, with the new em.pilot, link aside", () => {
    expect(email.text.replace(calendlyUrl("Ananya", "ananya@example.com"), "{Calendly link}")).toBe(golden);
  });

  it("is built from the plan composePlan makes for her answers", () => {
    const plan = composePlan({
      teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: lead.answers.problemText ?? "",
    });
    expect({
      template: plan.template, orderVariant: plan.orderVariant, tier: plan.tier, agentIds: plan.agentIds,
      matchedPhrases: plan.matchedPhrases, classifierVersion: plan.classifierVersion, agentsVersion: plan.agentsVersion,
      fallback: plan.fallback,
    }).toEqual(ananya.plan);
  });
});
