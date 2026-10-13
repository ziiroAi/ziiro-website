import { describe, expect, it } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import type { VisitAnswers } from "../../../api/funnel/_db";
import {
  alertRecipients, buildAlertEmail, buildPlanEmail, buildSendByHandAlert, type AlertInput, type PlanEmailInput,
} from "../../../api/funnel/_email";
import { agentById, calendlyUrl, copy, departments, stopsFor } from "../../../src/features/funnel/data";
import type { LeadRequest } from "../../../src/features/funnel/data/contract";

const lead = ananya as LeadRequest;
const WORDS = lead.answers.problemText ?? "";
const label = (copyId: string, index: number): string => copy(copyId).split(" · ")[index];
const planInput = (over: Partial<PlanEmailInput> = {}): PlanEmailInput => ({
  name: lead.name, email: lead.email, problemText: WORDS, chips: lead.answers.chips, plan: lead.plan, ...over,
});
const planA = { ...lead.plan, template: "A", orderVariant: "A-default" } as LeadRequest["plan"];
const planFallback = { ...planA, fallback: true } as LeadRequest["plan"];
const links = (text: string) => text.match(/https?:\/\//g) ?? [];

const ANSWERS: VisitAnswers = {
  segment: "business", business_type: "interior", years_band: "5_10", team_band: "6_20",
  revenue_band: "band_3", revenue_currency: "INR",
};
const alertInput = (over: Partial<AlertInput> = {}): AlertInput => ({
  lead, flag: null, spamCheck: "passed", answers: ANSWERS, country: "IN",
  receivedAt: "2026-10-19T06:30:00.000Z", planEmail: buildPlanEmail(planInput()), ...over,
});

describe("buildPlanEmail (§7, copy.md M)", () => {
  it("opens with her name, the open line and her words", () => {
    const email = buildPlanEmail(planInput());
    expect(email.subject).toBe(copy("em.subject", { name: "Ananya", n: 6 }));
    expect(email.text.startsWith(
      `${copy("em.hi", { name: "Ananya" })}\n\n${copy("em.open")}\n\n${copy("em.said", { "their words": WORDS })}\n\n`,
    )).toBe(true);
  });

  it("lists her departments in scroll order, with each agent's line", () => {
    const text = buildPlanEmail(planInput()).text;
    const heads = stopsFor(lead.plan.agentIds).map((stop) => departments.find((d) => d.id === stop.department)?.name);
    const positions = heads.map((name) => text.indexOf(`\n${name}. `));
    expect(positions.every((position) => position > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const id of lead.plan.agentIds) expect(text).toContain(`\n- ${agentById(id)?.name}: `);
  });

  it("carries em.pilot on a template B plan only (decision 19)", () => {
    expect(buildPlanEmail(planInput()).text).toContain(copy("em.pilot"));
    expect(buildPlanEmail(planInput({ plan: planA })).text).not.toContain(copy("em.pilot"));
  });

  it("has one link, the Calendly link with her name and email", () => {
    const text = buildPlanEmail(planInput()).text;
    expect(links(text)).toHaveLength(1);
    expect(text).toContain(calendlyUrl("Ananya", "ananya@example.com"));
  });

  it("cleans links, addresses and phone numbers out of the name and the words (§13.3)", () => {
    const email = buildPlanEmail(planInput({
      name: "Ananya https://evil.com", problemText: `${WORDS} Book at www.evil.com or call 98765 43210`,
    }));
    expect(email.text).not.toMatch(/evil|98765/);
    expect(links(email.text)).toHaveLength(1);
    expect(email.subject).toBe(copy("em.subject", { name: "Ananya", n: 6 }));
  });

  it("quotes the chips when the words leave nothing", () => {
    const text = buildPlanEmail(planInput({ problemText: "https://evil.com", chips: ["leads", "ads"] })).text;
    expect(text).toContain(copy("em.said.chips", { chips: `${label("s6.chips", 0)}, ${label("s6.chips", 3)}` }));
  });

  it("drops the quote when there are no words and no chips", () => {
    const blocks = buildPlanEmail(planInput({ problemText: undefined, chips: [], plan: planFallback })).text.split("\n\n");
    expect(blocks[2]).toBe(copy("em.need.fallback", { n: 6 }));
  });

  it("uses the fallback subject and need line when the plan is a fallback (§5.7)", () => {
    const email = buildPlanEmail(planInput({ problemText: "zzz", chips: [], plan: planFallback }));
    expect(email.subject).toBe(copy("em.subject.fallback", { name: "Ananya", n: 6 }));
    expect(email.text).toContain(copy("em.need.fallback", { n: 6 }));
  });

  it("takes the fallback from the plan, not from the words (00-index §1.5, request 16)", () => {
    const email = buildPlanEmail(planInput({ problemText: "zzz", chips: [] }));
    expect(email.subject).toBe(copy("em.subject", { name: "Ananya", n: 6 }));
    expect(email.text).not.toContain(copy("em.need.fallback", { n: 6 }));
  });
});

describe("buildAlertEmail (§7)", () => {
  it("is titled with the name, the business type and the team", () => {
    expect(buildAlertEmail(alertInput()).subject)
      .toBe(`New funnel lead: Ananya, ${label("s2.o", 0)}, team of ${label("s4.o", 2)}`);
  });

  it("carries every answer, her words, the spam check, the plan and her booking link", () => {
    const text = buildAlertEmail(alertInput()).text;
    for (const line of [
      "Name: Ananya", "Email: ananya@example.com", "Phone: none", "Country: IN", `What they do: ${copy("s1.o1")}`,
      `Business: ${label("s2.o", 0)}`, `Years: ${label("s3.o", 3)}`, `Team: ${label("s4.o", 2)}`,
      `Revenue: ${label("s5.o.IN", 2)}`, `Their words: ${WORDS}`, "Spam check: passed",
      "Plan email: going out now", "Consent: version 2026-10-08, at 2026-10-19T06:30:00.000Z",
      `Their booking link: ${calendlyUrl("Ananya", "ananya@example.com")}`, `Visit: ${lead.visitId}`,
    ]) expect(text).toContain(`${line}\n`);
    for (const id of lead.plan.agentIds) expect(text).toContain(agentById(id)?.name ?? id);
  });

  it("opens a flagged lead with the FLAGGED line, and carries the plan to send by hand", () => {
    const text = buildAlertEmail(alertInput({ flag: "turnstile_unverified", spamCheck: "missing" })).text;
    expect(text.split("\n")[0])
      .toBe("FLAGGED (turnstile_unverified). Check it today, and if a real person sent it, send the plan by hand.");
    expect(text).toContain("Plan email: held, because this lead is flagged\n");
    expect(text).toContain(`Subject: ${copy("em.subject", { name: "Ananya", n: 6 })}\n`);
  });

  it("says it's the only copy when the database write failed", () => {
    const email = buildAlertEmail(alertInput({ answers: null }));
    expect(email.text.split("\n")[0]).toBe("The database write failed. This email is the only copy of this lead.");
    expect(email.subject).toBe("New funnel lead: Ananya, business type unknown, team of unknown size");
  });

  it("uses the typed business when S2 was Other, and Rather not say for the revenue", () => {
    const email = buildAlertEmail(alertInput({
      lead: { ...lead, answers: { ...lead.answers, businessOther: "Printing press" } },
      answers: { ...ANSWERS, business_type: "other", revenue_band: "undisclosed" },
    }));
    expect(email.subject).toBe(`New funnel lead: Ananya, Printing press, team of ${label("s4.o", 2)}`);
    expect(email.text).toContain(`Revenue: ${copy("s5.skip")}\n`);
  });
});

describe("buildSendByHandAlert (§7, §10)", () => {
  it("opens with the spec's line and carries the plan email to forward", () => {
    const planEmail = buildPlanEmail(planInput());
    const email = buildSendByHandAlert({ lead, errorName: "resend_500", planEmail });
    expect(email.subject).toBe("Plan email NOT sent: Ananya");
    expect(email.text.split("\n")[0]).toBe("Plan email NOT sent. Send it by hand today.");
    expect(email.text).toContain("(resend_500)");
    expect(email.text.endsWith(planEmail.text)).toBe(true);
  });
});

describe("alertRecipients (§13.2, write 2)", () => {
  it("sends once when TEAM_INBOX and PLAN_REPLY_TO are the same address", () => {
    expect(alertRecipients("team@ziiroai.com", "TEAM@ziiroai.com ")).toEqual(["team@ziiroai.com"]);
  });

  it("sends to both when they differ", () => {
    expect(alertRecipients("team@ziiroai.com", "adyut@ziiroai.com")).toEqual(["team@ziiroai.com", "adyut@ziiroai.com"]);
  });
});
