// @vitest-environment jsdom
// (C) W24-C2, review C-2: the kept plan holds the visitor's words only when the plan quotes them, never the email.
import { beforeEach, describe, expect, it } from "vitest";
import { copy, type PlanDescriptor } from "@/features/funnel/data/light";
import { departments, wordsDepartmentFor } from "@/features/funnel/data";
import { loadPlanData } from "./plan-chunk";
import { KEEP_MS, keepPlan, resumedPlan } from "./resume";
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

  it("lasts 30 minutes from when the plan was first kept, not from its last change", () => {
    const t0 = Date.now();
    keepPlan(onPlan(planAt("deals"), starter), starter);
    keepPlan({ ...onPlan(planAt("deals"), starter), progress: { planDepth: 2 } }, starter);  // later scrolls keep savedAt
    expect(resumedPlan(starter, t0 + KEEP_MS - 1_000)).not.toBeNull();
    expect(resumedPlan(starter, t0 + KEEP_MS + 1_000)).toBeNull();
    expect(stored()).toBeNull();
  });
});
