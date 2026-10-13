/**
 * (C) W24-C, the owner's fix 3: once the plan is on screen, "/" opens on it again for the rest of the visit. The logo,
 * any link to "/", Back, Forward and a reload all show the same plan, and send nothing new. Review M3 kept the plan in
 * memory for Back alone, so the logo restarted the questions. The copy now sits in sessionStorage beside the visit's
 * ID (visit-id.ts) and lasts as long, or 30 minutes, whichever ends first: leaving the plan for the questions,
 * starting over, or closing the tab ends the visit, and the copy with it. W24-C2 (review C-2): it holds only what the
 * plan draws: the first name, the plan, the taps, and the visitor's words only when the plan quotes them. Never the
 * email or the S7 draft, never the S2 box (/privacy section 05). Storage that throws keeps it in memory for this page
 * view (§10).
 */
import type { PlanDescriptor, PlanProgress } from "@/features/funnel/data/light";
import { loadPlanData } from "./plan-chunk";
import { initialFlow, type Answers, type FlowState, type SaveNotice } from "./state";
import { peekVisit } from "./visit-id";
import { problemTextFrom } from "./words";

const KEY = "ziiro.funnel.plan";
/** Goes up whenever the kept shape changes, so a tab never reopens a plan that an older build kept. */
const VERSION = 2;
/** A copy older than this is dropped, even on its own visit (review C-2). */
export const KEEP_MS = 30 * 60 * 1000;

/** What the plan draws, and nothing else. `words` is "" unless the plan quotes them. The two counters keep a resumed
 *  plan from timing or saving itself again (review C-1). */
interface KeptPlan {
  v: typeof VERSION;
  visitId: string;
  savedAt: number;           // when this visit's plan was first kept; later writes keep it
  round: number;
  seq: number;
  name: string;
  plan: PlanDescriptor;
  saveNotice: SaveNotice;
  secondsToResult: number | null;
  progress: PlanProgress;
  answers: Omit<Answers, "problemText" | "businessOther">;
  words: string;
}

let memory: KeptPlan | null = null;
/** Set once storage refuses a write: from then on the copy in memory is the only one. */
let blocked = false;
/** Goes up on every keepPlan, so a words check that resolves late never writes over a newer copy. */
let writes = 0;

/** Enough of the shape to draw the plan. Anything else, another build's copy or a hand edit, is no plan. */
function isKeptPlan(value: unknown): value is KeptPlan {
  const kept = value as Partial<KeptPlan> | null;
  return kept?.v === VERSION && typeof kept.visitId === "string" && typeof kept.savedAt === "number"
    && typeof kept.round === "number" && typeof kept.seq === "number" && typeof kept.name === "string"
    && typeof kept.words === "string" && Array.isArray(kept.plan?.agentIds) && Array.isArray(kept.plan.stops)
    && Array.isArray(kept.answers?.chips) && typeof kept.progress === "object" && kept.progress !== null
    && (kept.secondsToResult === null || typeof kept.secondsToResult === "number");
}

function read(): KeptPlan | null {
  if (blocked) return memory;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isKeptPlan(parsed) ? parsed : null;
  } catch {
    // Blocked or unreadable storage: the copy in memory decides for this page view.
    return memory;
  }
}

function write(kept: KeptPlan | null): void {
  memory = kept;
  try {
    if (kept) window.sessionStorage.setItem(KEY, JSON.stringify(kept));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    blocked = true;  // blocked storage (private mode): the copy lives in memory for this page view (§10)
  }
}

/** Whether the plan quotes these words: planView.ts's rule (§6.3, D36), with the classifier from the data chunk. */
async function planQuotes(plan: PlanDescriptor, words: string): Promise<boolean> {
  const data = await loadPlanData();
  const clean = data.cleanProblemText(words);
  if (clean === "") return false;
  const at = data.wordsDepartmentFor(clean) ?? plan.stops[0]?.department ?? null;
  return plan.stops.some((stop) => stop.department === at);
}

/** FunnelRoot calls this on every change: the plan on screen is kept for its visit; any other screen drops it. */
export function keepPlan(state: FlowState, starter: string): void {
  const token = ++writes;
  if (state.screen !== "plan" || !state.plan || !state.visitor) {
    if (memory) write(null);
    return;
  }
  const visit = peekVisit();
  if (!visit) return;
  const { problemText, businessOther: _box, ...answers } = state.answers;
  const earlier = memory?.visitId === visit.id ? memory.savedAt : null;
  const kept: KeptPlan = {
    v: VERSION, visitId: visit.id, savedAt: earlier ?? Date.now(), round: state.round, seq: state.nav.seq,
    name: state.visitor.name, plan: state.plan, saveNotice: state.saveNotice,
    secondsToResult: state.secondsToResult, progress: state.progress, answers, words: "",
  };
  write(kept);
  const words = problemTextFrom(problemText, starter);
  if (words === "") return;
  void planQuotes(state.plan, words).then((quoted) => {
    if (quoted && token === writes) write({ ...kept, words });
  }, () => undefined);  // no data chunk: the copy stays without the words
}

/**
 * The plan "/" opens on: the one this visit showed in the last 30 minutes, whichever way the visitor came back. Its
 * history entry is retagged in place ("replace"), so coming back adds no step to Back. Any other copy is dropped.
 */
export function resumedPlan(starter: string, now = Date.now()): FlowState | null {
  const kept = read();
  if (!kept) return null;
  if (kept.visitId !== peekVisit()?.id || now - kept.savedAt > KEEP_MS) {
    write(null);
    return null;
  }
  memory = kept;
  const blank = initialFlow(starter);
  return {
    ...blank,
    screen: "plan",
    nav: { mode: "replace", seq: kept.seq },
    answers: { ...blank.answers, ...kept.answers, problemText: kept.words || starter },
    problemDone: true,
    visitor: { name: kept.name, email: "" },
    plan: kept.plan,
    saveNotice: kept.saveNotice,
    secondsToResult: kept.secondsToResult,
    progress: kept.progress,
    round: kept.round,
  };
}
