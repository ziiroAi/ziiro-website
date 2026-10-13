// @vitest-environment jsdom
// (C) W24-C2, review C-2: the kept plan holds the visitor's words only when the plan quotes them, never the email.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy, type PlanDescriptor } from "@/features/funnel/data/light";
import { departments, wordsDepartmentFor } from "@/features/funnel/data";
import { loadPlanData } from "./plan-chunk";
import { KEEP_MS, keepPlan, resumedPlan } from "./resume";
import { dropExpiredPlan } from "./plan-expiry";
import { initialFlow, type FlowState } from "./state";
import { startVisit } from "./visit-id";

const starter = copy("s6.text");
const WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const KEY = "ziiro.funnel.plan";
const stored = () => JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;

function planAt(department: string): PlanDescriptor {
  const stop = { department, disc: "G04", agentIds: [], jobIds: [], marks: { runs: 0, build: 0, mapped: 0 }, departmentAgents: 5 };
  return { agentIds: [], stops: [stop] } as unknown as PlanDescriptor;
}

function onPlan(plan: PlanDescriptor, problemText = WORDS): FlowState {
  const base = initialFlow(starter);
  return {
    ...base, screen: "plan", nav: { mode: "push", seq: 9 }, plan,
    answers: { ...base.answers, problemText, businessOther: "my studio" },
    contact: { name: "Ananya", email: "ananya@example.com", phone: "+919800000000", consent: true },
    visitor: { name: "Ananya", email: "ananya@example.com" },
  };
}

/** keepPlan's words check waits on the data chunk; this lets it land. */
async function settle(): Promise<void> {
  await loadPlanData();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  sessionStorage.clear();
  startVisit();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the kept plan (W24-C2, review C-2)", () => {
  it("keeps the words when the plan quotes them, and they come back on the plan", async () => {
    const quotedAt = wordsDepartmentFor(WORDS);
    expect(quotedAt).not.toBeNull();
    keepPlan(onPlan(planAt(quotedAt!)), starter);
    await settle();
    expect(stored()?.words).toBe(WORDS);
    expect(resumedPlan(starter)?.answers.problemText).toBe(WORDS);
  });

  it("drops the words when the plan doesn't quote them: S6 shows the starter again", async () => {
    const other = departments.map((d) => d.id).find((id) => id !== wordsDepartmentFor(WORDS))!;
    keepPlan(onPlan(planAt(other)), starter);
    await settle();
    expect(stored()?.words).toBe("");
    expect(resumedPlan(starter)?.answers.problemText).toBe(starter);
  });

  it("never holds the email, the phone, the S7 draft or the S2 box; the plan opens with the name alone", async () => {
    keepPlan(onPlan(planAt(wordsDepartmentFor(WORDS)!)), starter);
    await settle();
    const raw = sessionStorage.getItem(KEY) ?? "";
    for (const secret of ["ananya@example.com", "+919800000000", "my studio", "consent"]) expect(raw).not.toContain(secret);
    expect(resumedPlan(starter)).toMatchObject({ screen: "plan", visitor: { name: "Ananya", email: "" }, contact: { email: "" } });
  });

  it("a late words check never writes over a newer copy, or brings back one already dropped", async () => {
    const state = onPlan(planAt(wordsDepartmentFor(WORDS)!));
    keepPlan(state, starter);
    keepPlan({ ...state, screen: "s6" }, starter);  // Back to S6 before the check lands
    await settle();
    expect(stored()).toBeNull();
  });

  it("a re-keep carries the words already decided, with no window where they're blank (review N-3)", async () => {
    const state = onPlan(planAt(wordsDepartmentFor(WORDS)!));
    keepPlan(state, starter);
    await settle();
    keepPlan({ ...state, progress: { planDepth: 3 } }, starter);
    expect(stored()?.words).toBe(WORDS);  // synchronously, before any check could land
  });

  it("a resumed plan's words carry into its next keep too", async () => {
    keepPlan(onPlan(planAt(wordsDepartmentFor(WORDS)!)), starter);
    await settle();
    const resumed = resumedPlan(starter)!;
    keepPlan({ ...resumed, progress: { planDepth: 4 } }, starter);
    expect(stored()?.words).toBe(WORDS);
  });

  it("is not kept again once its 30 minutes are up (review N-4)", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const state = onPlan(planAt("deals"), starter);
    keepPlan(state, starter);
    vi.setSystemTime(Date.now() + KEEP_MS + 1_000);
    keepPlan({ ...state, progress: { planDepth: 2 } }, starter);
    expect(stored()).toBeNull();
  });

  it("leaves storage at 30 minutes on any page, by the timer the first keep sets, and at boot (review N-4)", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    keepPlan(onPlan(planAt("deals"), starter), starter);
    vi.advanceTimersByTime(KEEP_MS - 1_000);
    expect(stored()).not.toBeNull();
    vi.advanceTimersByTime(2_000);
    expect(stored()).toBeNull();
    sessionStorage.setItem(KEY, JSON.stringify({ v: 2, savedAt: Date.now() - KEEP_MS - 1 }));
    dropExpiredPlan();  // main.tsx, on whatever route the tab reopens
    expect(stored()).toBeNull();
  });

  it("lasts 30 minutes from when the plan was first kept, not from its last change", () => {
    const t0 = Date.now();
    keepPlan(onPlan(planAt("deals"), starter), starter);
    keepPlan({ ...onPlan(planAt("deals"), starter), progress: { planDepth: 2 } }, starter);  // later scrolls keep savedAt
    expect(resumedPlan(starter, t0 + KEEP_MS - 1_000)).not.toBeNull();
    expect(resumedPlan(starter, t0 + KEEP_MS + 1_000)).toBeNull();
    expect(stored()).toBeNull();
  });
});
