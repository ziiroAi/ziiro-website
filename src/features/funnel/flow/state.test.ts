import { describe, expect, it } from "vitest";
import { FAKE_PLAN } from "./test/fake-data";
import { createTapGate, funnelStageOf, initialFlow, reduce, type FlowAction, type FlowState } from "./state";

const STARTER = "Honestly, I'm struggling with ___ because ___.";
const from = (state: FlowState, ...actions: FlowAction[]) => actions.reduce(reduce, state);
const run = (...actions: FlowAction[]) => from(initialFlow(STARTER), ...actions);

const TO_S6: FlowAction[] = [
  { type: "segment", value: "business" }, { type: "business", value: "interior" },
  { type: "years", value: "5_10" }, { type: "team", value: "6_20" }, { type: "revenue", value: "band_3", currency: "INR" },
];
const TO_S7: FlowAction[] = [...TO_S6, { type: "problemDone", hasWords: true }];
const SENT: FlowAction[] = [...TO_S7, { type: "sendStarted", visitor: { name: "Ananya", email: "ananya@example.com" } }, { type: "planReady", plan: FAKE_PLAN }];
const AT_PLAN: FlowAction[] = [...SENT, { type: "sendFinished", result: { to: "plan", notice: null, error: null } }];

describe("the questions' state (§4.1, §4.3)", () => {
  it("starts on S1 with the S6 starter in the box and nothing in history", () => {
    expect(initialFlow(STARTER)).toMatchObject({ screen: "s1", nav: { mode: "none", seq: 0 }, answers: { problemText: STARTER, chips: [] } });
  });

  it("S1: an owner goes to S2, anyone else to S1b, each adding a history entry", () => {
    expect(run({ type: "segment", value: "business" })).toMatchObject({ screen: "s2", nav: { mode: "push", seq: 1 } });
    expect(run({ type: "segment", value: "freelance" }).screen).toBe("s1b");
  });

  it("s1.o2 preselects the agency type on S2, but never over a type already chosen", () => {
    expect(run({ type: "segment", value: "agency" }).answers.businessType).toBe("agency");
    expect(run(...TO_S6.slice(0, 2), { type: "popTo", screen: "s1" }, { type: "segment", value: "agency" }).answers.businessType).toBe("interior");
  });

  it("S1b: the answer shows s1b.done on the same screen, replacing its entry, with the header still closed", () => {
    const s = run({ type: "segment", value: "student" }, { type: "nonOwner", value: "learning" });
    expect(s).toMatchObject({ screen: "s1b", nonOwnerDone: true, nav: { mode: "replace", seq: 2 } });
    expect(funnelStageOf(s)).toBe("questions");  // FunnelStage is "plan" from S9 only; s1b.btn leads on (D15)
  });

  it("S2: a type moves on; Other opens the box, which stops at 80, and its button moves on", () => {
    expect(run(...TO_S6.slice(0, 2)).screen).toBe("s34");
    const s = run({ type: "segment", value: "business" }, { type: "business", value: "other" }, { type: "businessOther", text: "x".repeat(100) });
    expect(s).toMatchObject({ screen: "s2", answers: { businessType: "other" } });
    expect(s.answers.businessOther).toHaveLength(80);
    expect(reduce(s, { type: "businessOtherDone" }).screen).toBe("s34");
  });

  it("S3 + S4: the first tap brings the team row forward; the second moves on, in either order", () => {
    const s = run(...TO_S6.slice(0, 3));
    expect(s).toMatchObject({ screen: "s34", teamRowForward: true, nav: { mode: "replace" } });
    expect(reduce(s, { type: "team", value: "6_20" }).screen).toBe("s5");
    expect(run(...TO_S6.slice(0, 2), { type: "team", value: "solo" }, { type: "years", value: "1_3" }).screen).toBe("s5");
  });

  it("S5: a band, or Rather not say, moves on and keeps the currency it was shown in", () => {
    expect(run(...TO_S6.slice(0, 4), { type: "revenue", value: "undisclosed", currency: "USD" })).toMatchObject({
      screen: "s6", answers: { revenueBand: "undisclosed", revenueCurrency: "USD" },
    });
  });

  it("S6: the box stops at 600 characters", () => {
    expect(run(...TO_S6, { type: "problemText", text: "y".repeat(700) }).answers.problemText).toHaveLength(600);
  });

  it("S6: three chips at most; a fourth shows s6.chips.max, and untapping one clears it", () => {
    const four: FlowAction[] = (["leads", "ads", "team", "content"] as const).map((value) => ({ type: "chip", value }));
    const s = run(...TO_S6, ...four);
    expect(s).toMatchObject({ chipsFull: true, answers: { chips: ["leads", "ads", "team"] } });
    expect(reduce(s, { type: "chip", value: "ads" })).toMatchObject({ chipsFull: false, answers: { chips: ["leads", "team"] } });
  });

  it("S6: That's it with nothing shows s6.empty; words or a chip move on", () => {
    expect(run(...TO_S6, { type: "problemDone", hasWords: false })).toMatchObject({ screen: "s6", problemEmpty: true });
    expect(run(...TO_S7)).toMatchObject({ screen: "s7", problemDone: true });
    expect(run(...TO_S6, { type: "chip", value: "leads" }, { type: "problemDone", hasWords: false }).screen).toBe("s7");
  });

  it("S7: a failed check logs its fields; editing a field clears its own error", () => {
    const s = run(...TO_S7, { type: "contactInvalid", fields: ["name", "consent"] });
    expect(s).toMatchObject({ fieldErrors: ["name", "consent"], contactErrors: ["name", "consent"] });
    expect(reduce(s, { type: "contact", patch: { name: "A" } }).fieldErrors).toEqual(["consent"]);
  });

  it("keeps the first 10 contact errors (Appendix C)", () => {
    const eleven: FlowAction[] = Array.from({ length: 11 }, () => ({ type: "contactInvalid", fields: ["email"] }));
    expect(run(...TO_S7, ...eleven).contactErrors).toHaveLength(10);
  });

  it("sending puts S8 in S7's place and counts the try", () => {
    expect(run(...SENT)).toMatchObject({ screen: "s8", nav: { mode: "replace" }, attempt: 1, visitor: { name: "Ananya" }, plan: FAKE_PLAN });
  });

  it("a first failure goes back to S7 with its line; a 400 marks its field (index §1.3)", () => {
    const bot = run(...SENT, { type: "sendFinished", result: { to: "s7", error: "bot", field: null, line: "s7.err.bot" } });
    expect(bot).toMatchObject({ screen: "s7", dir: "back", sendLine: "s7.err.bot", contactErrors: ["bot"], nav: { mode: "replace" } });
    const email = run(...SENT, { type: "sendFinished", result: { to: "s7", error: "email", field: "email", line: null } });
    expect(email).toMatchObject({ fieldErrors: ["email"], sendLine: null });
  });

  it("a send that worked, or a second failure, opens the plan in S7's place with its notice", () => {
    expect(run(...AT_PLAN)).toMatchObject({ screen: "plan", nav: { mode: "replace" }, saveNotice: null });
    const unsure = run(...SENT, { type: "sendFinished", result: { to: "plan", notice: "unsure", error: "timeout" } });
    expect(unsure).toMatchObject({ screen: "plan", saveNotice: "unsure", contactErrors: ["timeout"] });
  });

  it("logs a result that arrives after the visitor went Back, and changes no screen", () => {
    const s = run(...SENT, { type: "popTo", screen: "s6" }, { type: "sendFinished", result: { to: "s7", error: "timeout", field: null, line: "g.error" } });
    expect(s).toMatchObject({ screen: "s6", contactErrors: ["timeout"] });
  });

  it("Back and Forward: the entry decides, S8 means S7, and a plan that's gone means S6", () => {
    expect(run(...TO_S6.slice(0, 4), { type: "popTo", screen: "s34" })).toMatchObject({ screen: "s34", dir: "back", nav: { mode: "none", seq: 5 } });
    expect(run(...SENT, { type: "popTo", screen: "s8" }).screen).toBe("s7");
    expect(run(...TO_S7, { type: "popTo", screen: "plan" }).screen).toBe("s6");
  });

  it("Back after a reload stops at the first unanswered screen and retags that entry (review H1)", () => {
    expect(run({ type: "popTo", screen: "s6" })).toMatchObject({ screen: "s1", nav: { mode: "replace", seq: 1 } });
    expect(run({ type: "popTo", screen: "s7" }).screen).toBe("s1");
    expect(run(TO_S6[0], { type: "popTo", screen: "s34" }).screen).toBe("s2");
    expect(run(...TO_S6.slice(0, 2), { type: "popTo", screen: "s6" }).screen).toBe("s34");
    expect(run(...TO_S6.slice(0, 3), { type: "popTo", screen: "s5" }).screen).toBe("s34");
    expect(run(...TO_S6.slice(0, 4), { type: "popTo", screen: "s7" }).screen).toBe("s5");
    expect(run(...TO_S6, { type: "popTo", screen: "s7" })).toMatchObject({ screen: "s7", nav: { mode: "none" } });
  });

  it("leaving the plan starts a new visit: the round goes up and the try count, errors and plan reset (§4.1)", () => {
    const s = run(...AT_PLAN, { type: "popTo", screen: "s6" });
    expect(s).toMatchObject({ screen: "s6", round: 1, attempt: 0, contactErrors: [], plan: null, saveNotice: null });
    expect(s.contact).toEqual(run(...AT_PLAN).contact);
  });

  it("merges what the plan reports, and caps the time to plan at a day", () => {
    const s = run({ type: "progress", fields: { planDepth: 2 } }, { type: "progress", fields: { filmPlayed: true } }, { type: "planShown", seconds: 100_000 });
    expect(s.progress).toEqual({ planDepth: 2, filmPlayed: true });
    expect(s.secondsToResult).toBe(86_400);
  });

  it("is at the plan stage on the plan only (index §1.2's FunnelStage)", () => {
    expect(funnelStageOf(run(...AT_PLAN))).toBe("plan");
    expect(funnelStageOf(run(...AT_PLAN, { type: "popTo", screen: "s6" }))).toBe("questions");
  });
});

describe("the tap gate (Review Focus 2)", () => {
  it("lets taps through, then ignores them for 350 ms after a step changes", () => {
    const gate = createTapGate();
    expect(gate.allow(0)).toBe(true);
    gate.lock(1_000);
    expect(gate.allow(1_200)).toBe(false);
    expect(gate.allow(1_350)).toBe(true);
  });
});
