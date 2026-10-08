import { afterEach, describe, expect, it, vi } from "vitest";
import { LEAD_URL, afterSend, leadRequest, postLead, s8LineAt, s8Lines, type LeadInput, type LeadOutcome } from "./send";
import { initialFlow, type Answers, type SendResult } from "./state";
import { FAKE_PLAN } from "./test/fake-data";

const WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const ANSWERS: Answers = {
  ...initialFlow("").answers,
  segment: "business", businessType: "interior", yearsBand: "5_10", teamBand: "6_20",
  revenueBand: "band_3", revenueCurrency: "INR", problemText: WORDS,
};
const BASE: LeadInput = {
  visitId: "v-1", retry: false, contact: { name: "Ananya", email: "ananya@example.com" }, token: "",
  answers: ANSWERS, words: { problemText: WORDS, chips: [] }, plan: FAKE_PLAN,
};
const reply = (status: number, json: unknown) => vi.fn(async () => new Response(JSON.stringify(json), { status }));

describe("leadRequest (index §1.2)", () => {
  it("builds a first try with only the keys that hold something", () => {
    expect(leadRequest(BASE)).toEqual({
      visitId: "v-1", name: "Ananya", email: "ananya@example.com",
      consent: { given: true, version: "2026-10-08" },
      answers: { problemText: WORDS, chips: [], inputMode: "typed" },
      plan: {
        template: "B", orderVariant: "B-convert", tier: "M", agentIds: FAKE_PLAN.agentIds,
        matchedPhrases: ["gone cold"], classifierVersion: "kw-1", agentsVersion: "2026-10-04", fallback: false,
      },
    });
  });

  it("adds retry, the phone, the token and the Other text when there are any", () => {
    const body = leadRequest({
      ...BASE, retry: true, token: "tok", contact: { ...BASE.contact, phone: "+919876543210" },
      answers: { ...ANSWERS, businessType: "other", businessOther: "  Printing press " },
      words: { problemText: "", chips: ["payments"] },
    });
    expect(body).toMatchObject({
      retry: true, phone: "+919876543210", turnstileToken: "tok",
      answers: { businessOther: "Printing press", chips: ["payments"], inputMode: "chips" },
    });
    expect(body.answers).not.toHaveProperty("problemText");
  });

  it("keeps the Other text out unless S2's answer is Other", () => {
    expect(leadRequest({ ...BASE, answers: { ...ANSWERS, businessOther: "left over" } }).answers).not.toHaveProperty("businessOther");
  });

  it("stays under the 10,000-byte cap with the longest answers (§13.2)", () => {
    const body = leadRequest({
      ...BASE,
      answers: { ...ANSWERS, businessType: "other", businessOther: "x".repeat(80) },
      words: { problemText: "ह".repeat(600), chips: ["leads", "ads", "team"] },
    });
    expect(new TextEncoder().encode(JSON.stringify(body)).length).toBeLessThan(10_000);
  });
});

describe("postLead (§13.2)", () => {
  const body = leadRequest(BASE);
  afterEach(() => vi.useRealTimers());

  it("posts JSON to /api/funnel/lead", async () => {
    const fetchImpl = reply(200, { success: true, planEmail: "sent" });
    await postLead(body, 8_000, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(LEAD_URL, expect.objectContaining({
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
  });

  it.each<[string, number, unknown, LeadOutcome]>([
    ["a save", 200, { success: true, planEmail: "held" }, { kind: "saved" }],
    ["a field the server rejects", 400, { success: false, field: "email" }, { kind: "field", field: "email" }],
    ["a bad payload", 400, { success: false, field: "payload" }, { kind: "field", field: "payload" }],
    ["the spam check", 403, { success: false }, { kind: "refused", status: 403 }],
    ["the rate limit", 429, { success: false }, { kind: "refused", status: 429 }],
    ["our server failing", 502, { success: false }, { kind: "refused", status: 502 }],
  ])("reads %s", async (_case, status, json, outcome) => {
    await expect(postLead(body, 8_000, reply(status, json))).resolves.toEqual(outcome);
  });

  it("counts a network failure as no answer", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(postLead(body, 8_000, offline)).resolves.toEqual({ kind: "timeout" });
  });

  it("gives up when its time runs out", async () => {
    vi.useFakeTimers();
    const hanging: typeof fetch = (_url, init) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const outcome = postLead(body, 5_000, hanging);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(outcome).resolves.toEqual({ kind: "timeout" });
  });
});

describe("afterSend (index §1.3, §10, D18)", () => {
  it.each<[string, LeadOutcome, SendResult, SendResult]>([
    ["200", { kind: "saved" }, { to: "plan", notice: null, error: null }, { to: "plan", notice: null, error: null }],
    ["400 email", { kind: "field", field: "email" }, { to: "s7", error: "email", field: "email", line: null }, { to: "plan", notice: "fail", error: "email" }],
    ["400 payload", { kind: "field", field: "payload" }, { to: "s7", error: "server", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "server" }],
    ["403", { kind: "refused", status: 403 }, { to: "s7", error: "bot", field: null, line: "s7.err.bot" }, { to: "plan", notice: "fail", error: "bot" }],
    ["429", { kind: "refused", status: 429 }, { to: "s7", error: "rate", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "rate" }],
    ["415", { kind: "refused", status: 415 }, { to: "s7", error: "server", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "server" }],
    ["502", { kind: "refused", status: 502 }, { to: "s7", error: "server", field: null, line: "g.error" }, { to: "plan", notice: "fail", error: "server" }],
    ["no answer", { kind: "timeout" }, { to: "s7", error: "timeout", field: null, line: "g.error" }, { to: "plan", notice: "unsure", error: "timeout" }],
  ])("%s: back to S7 on the first try, the plan on the second", (_case, outcome, first, second) => {
    expect(afterSend(outcome, false)).toEqual(first);
    expect(afterSend(outcome, true)).toEqual(second);
  });
});

describe("S8's lines (§4.3)", () => {
  it("reads what they wrote, or looks at what they picked", () => {
    expect(s8Lines({ problemText: "Leads go cold", chips: [], teamBand: "6_20", teamLabel: "6–20" })).toEqual([
      { id: "s8.l1" }, { id: "s8.l2" }, { id: "s8.l3", vars: { team: "6–20" } },
    ]);
    expect(s8Lines({ problemText: "", chips: ["leads"], teamBand: "6_20", teamLabel: "6–20" })[0]).toEqual({ id: "s8.l1.chips" });
  });

  it("sizes it for a team of one when it's just them", () => {
    expect(s8Lines({ problemText: "x", chips: [], teamBand: "solo", teamLabel: "Just me" })[2]).toEqual({ id: "s8.l3.one" });
  });

  it("changes line at 0.7 s and 1.4 s, then holds the last", () => {
    expect([0, 699, 700, 1_399, 1_400, 8_000].map(s8LineAt)).toEqual([0, 0, 1, 1, 2, 2]);
  });
});
