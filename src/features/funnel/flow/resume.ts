/**
 * (C) W24-C, the owner's fix 3: once the plan is on screen, "/" opens on it again for the rest of the visit. The logo,
 * any link to "/", Back, Forward and a reload all show the same plan, and send nothing new. Review M3 kept the plan in
 * memory for Back alone, so the logo restarted the questions. The copy now sits in sessionStorage beside the visit's
 * ID (visit-id.ts) and lasts exactly as long: leaving the plan for the questions, starting over, or closing the tab
 * ends the visit, and the copy with it. It holds what the plan shows, the visitor's name, email and words among them,
 * and not what it doesn't: the S2 box and the S7 draft stay out. Storage that throws keeps it in memory for this page
 * view (§10).
 */
import type { FlowState } from "./state";
import { peekVisit } from "./visit-id";

const KEY = "ziiro.funnel.plan";
/** Goes up whenever FlowState changes shape, so a tab never reopens a plan that an older build kept. */
const VERSION = 1;

interface KeptPlan { v: typeof VERSION; visitId: string; state: FlowState }

let memory: KeptPlan | null = null;
/** Set once storage refuses a write: from then on the copy in memory is the only one. */
let blocked = false;

/** Enough of the shape to draw the plan. Anything else, another build's copy or a hand edit, is no plan. */
function isKeptPlan(value: unknown): value is KeptPlan {
  const kept = value as Partial<KeptPlan> | null;
  const state = kept?.state;
  return kept?.v === VERSION && typeof kept.visitId === "string" && state?.screen === "plan"
    && typeof state.round === "number" && typeof state.nav?.seq === "number"
    && typeof state.visitor?.name === "string" && typeof state.visitor.email === "string"
    && Array.isArray(state.plan?.agentIds) && Array.isArray(state.plan.stops)
    && typeof state.answers?.problemText === "string" && Array.isArray(state.answers.chips);
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

/** The plan as kept: what it shows, without the typed words it doesn't (the S2 box and the S7 draft). */
function shown(state: FlowState): FlowState {
  return { ...state, answers: { ...state.answers, businessOther: "" }, contact: { name: "", email: "", phone: "", consent: false } };
}

/** FunnelRoot calls this on every change: the plan on screen is kept for its visit; any other screen drops it. */
export function keepPlan(state: FlowState): void {
  if (state.screen !== "plan") {
    if (memory) write(null);
    return;
  }
  const visit = peekVisit();
  if (visit) write({ v: VERSION, visitId: visit.id, state: shown(state) });
}

/**
 * The plan "/" opens on: the one this visit showed, whichever way the visitor came back. Its history entry is
 * retagged in place ("replace"), so coming back adds no step to Back. A copy from another visit is dropped.
 */
export function resumedPlan(): FlowState | null {
  const kept = read();
  if (!kept) return null;
  if (kept.visitId !== peekVisit()?.id) {
    write(null);
    return null;
  }
  memory = kept;
  return { ...kept.state, nav: { mode: "replace", seq: kept.state.nav.seq } };
}
