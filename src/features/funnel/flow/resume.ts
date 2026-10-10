/**
 * (C) Review M3: the plan survives a trip to another page in the same tab. The header's links show at S9 (D6), and
 * leaving "/" unmounts FunnelRoot. Without this, Back from /pricing restarts at S1, and sending again makes a
 * second lead. The copy lives in memory only, so nothing typed reaches storage and a reload still starts a new
 * visit (§4.1). It is kept only for the visit that sent its lead.
 */
import { screenOfEntry } from "./history";
import type { FlowState } from "./state";
import { peekVisit } from "./visit-id";

let kept: { visitId: string; state: FlowState } | null = null;

export function keepPlan(state: FlowState): void {
  const visit = peekVisit();
  kept = state.screen === "plan" && visit?.lead ? { visitId: visit.id, state } : null;
}

/** The plan to show again: Back has returned to the plan's own entry, and the visit that sent it is current. */
export function resumedPlan(win: Window): FlowState | null {
  const visit = peekVisit();
  const onPlanEntry = screenOfEntry(win.history.state) === "plan";
  return kept && onPlanEntry && visit?.lead && visit.id === kept.visitId ? kept.state : null;
}
