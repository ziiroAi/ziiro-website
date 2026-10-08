import { describe, expect, it } from "vitest";
import { agentById, jobIdsFor } from "./agents";
import { agentsFor, composePlan, laneAgent, priority, ROUTES, wordsDepartmentFor } from "./compose";
import { TIERS } from "./contract";
import type { OrderVariant, PlanInput } from "./contract";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const numbers = (ids: readonly string[]) => ids.map((id) => agentById(id)?.number);
const names = (ids: readonly string[]) => ids.map((id) => agentById(id)?.name);
const input = (over: Partial<PlanInput>): PlanInput => ({
  teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: "", ...over,
});

describe("the priority lists (§5.4)", () => {
  it("name §5.4's agents in §5.4's order", () => {
    expect(names(priority["A-default"])).toEqual([
      "Collections agent", "Numbers agent", "Client updater", "Data mover", "Records keeper",
      "Office assistant", "Memory keeper", "Kickoff agent", "Support desk",
    ]);
    expect(priority["A-payments"]).toEqual(priority["A-default"]);
    expect(names(priority["A-numbers"]).slice(0, 2)).toEqual(["Numbers agent", "Collections agent"]);
    expect(names(priority["A-team"])).toEqual([
      "Client updater", "Memory keeper", "Office assistant", "Collections agent", "Numbers agent",
      "Data mover", "Records keeper", "Kickoff agent", "Support desk",
    ]);
    expect(names(priority["B-convert"])).toEqual([
      "Enquiry responder", "Reply sorter", "Call companion", "Campaign runner", "Marketing analyst",
      "Numbers agent", "Pipeline keeper", "Proposal maker", "Collections agent",
    ]);
    expect(names(priority["B-volume"])).toEqual([
      "Marketing analyst", "Content maker", "Enquiry responder", "Reply sorter", "List builder",
      "Numbers agent", "Publisher", "Ideal-client finder", "Call companion",
    ]);
  });

  it("give each lane its agent: content 7, support 21, hiring 33", () => {
    expect(numbers([laneAgent.content, laneAgent.support, laneAgent.hiring])).toEqual([7, 21, 33]);
  });

  it("route every problem as §5.2's table says", () => {
    expect(ROUTES.lead_gen).toEqual({ template: "B", orderVariant: "B-volume", lane: null });
    expect(ROUTES.sales).toEqual({ template: "B", orderVariant: "B-convert", lane: null });
    expect(ROUTES.ads).toEqual({ template: "B", orderVariant: "B-volume", lane: null });
    expect([ROUTES.numbers.orderVariant, ROUTES.payments.orderVariant, ROUTES.team_ops.orderVariant]).toEqual(["A-numbers", "A-payments", "A-team"]);
    expect(ROUTES.content).toEqual({ template: "A", orderVariant: "A-default", lane: "content" });
    expect([ROUTES.support.lane, ROUTES.hiring.lane]).toEqual(["support", "hiring"]);
    expect(ROUTES.unclassified).toEqual({ template: "A", orderVariant: "A-default", lane: null });
  });

  it("match every job count in §5.4", () => {
    const expected: readonly [OrderVariant, number[]][] = [
      ["A-default", [10, 23, 34]], ["A-payments", [10, 23, 34]], ["A-numbers", [10, 23, 34]],
      ["A-team", [9, 22, 34]], ["B-convert", [14, 26, 39]], ["B-volume", [18, 31, 44]],
    ];
    const got = expected.map(([orderVariant]) =>
      TIERS.map((tier) => jobIdsFor(agentsFor({ template: "A", orderVariant, lane: null }, tier)).length));
    expect(got).toEqual(expected.map(([, counts]) => counts));
  });

  it("put a lane's agent in the last place unless it's already in", () => {
    expect(numbers(agentsFor(ROUTES.content, "S"))).toEqual([29, 30, 7]);
    expect(numbers(agentsFor(ROUTES.hiring, "L"))).toEqual([29, 30, 26, 25, 31, 32, 27, 24, 33]);
    expect(numbers(agentsFor(ROUTES.support, "L"))).toEqual([29, 30, 26, 25, 31, 32, 27, 24, 21]);
  });
});

describe("composePlan", () => {
  it("builds Ananya's plan (§5.8)", () => {
    const plan = composePlan(input({ problemText: ANANYA_WORDS }));
    expect(plan).toMatchObject({
      template: "B", orderVariant: "B-convert", lane: null, tier: "M", pilot: true, fallback: false, currency: "INR",
      bucketPrimary: "sales", matchedPhrases: ["calls back", "gone cold"], classifierVersion: "kw-1", agentsVersion: "2026-10-04",
      marks: { runs: 3, build: 5, mapped: 18 }, litDiscs: ["G01", "G04", "G05", "G06"],
    });
    expect(numbers(plan.agentIds)).toEqual([16, 17, 18, 15, 6, 30]);
    expect(plan.stops.map((s) => s.department)).toEqual(["deals", "sales", "marketing", "back-office"]);
    expect(plan.jobIds).toEqual(jobIdsFor(plan.agentIds));
    expect(plan.jobIds).toHaveLength(26);
  });

  it("gives B at tier S no Back Office agent (D11)", () => {
    const plan = composePlan(input({ chips: ["convert"], teamBand: "solo" }));
    expect([plan.stops.map((s) => s.department), plan.litDiscs]).toEqual([["deals"], ["G04"]]);
  });

  it("falls back to A-default, with no lane, when unclassified", () => {
    const plan = composePlan(input({ problemText: "payments stuck", teamBand: "solo", revenueBand: "band_1" }));
    expect(plan).toMatchObject({ bucketPrimary: "unclassified", orderVariant: "A-default", lane: null, tier: "S", fallback: true, pilot: false });
    expect(numbers(plan.agentIds)).toEqual([29, 30, 26]);
  });

  it("puts agentIds in scroll order: departments by their first agent, list order inside (§5.5)", () => {
    expect(numbers(composePlan(input({ chips: ["team"] })).agentIds)).toEqual([26, 27, 25, 32, 29, 30]);
  });

  it("carries the currency it's given", () => {
    expect(composePlan(input({ currency: "USD", chips: ["ads"] })).currency).toBe("USD");
  });
});

describe("wordsDepartmentFor (§6.3, D36)", () => {
  it("is the department of the first agent in the order the words alone pick, for a problem with no lane", () => {
    expect(wordsDepartmentFor("our facebook ads burn money every single month")).toBe("marketing");
    expect(wordsDepartmentFor("payment atka hai client ka teen mahine se")).toBe("back-office");
  });

  it("is null for no words, or words that don't classify", () => {
    expect(wordsDepartmentFor("")).toBeNull();
    expect(wordsDepartmentFor("help")).toBeNull();
  });

  it("points content, support and hiring words at their lane agent's department: 7, 21 and 33 (D36)", () => {
    expect(wordsDepartmentFor("no time for reels and posting every week")).toBe("marketing");
    expect(wordsDepartmentFor("We answer the same questions again on WhatsApp all day.")).toBe("customer");
    expect(wordsDepartmentFor("We can't find good people, and the good ones leave.")).toBe("back-office");
  });
});
