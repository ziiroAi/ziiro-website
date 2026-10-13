/**
 * (C) W17-B: S1b's answer opens the plan page with the sample plan (the owner vetoed D15's /products). The plan's
 * code loads on S1b (FunnelRoot), so this is usually at once. If it can't load, S1b's answer stays, with its button
 * to try again.
 */
import { useCallback, type Dispatch } from "react";
import { loadPlanData } from "./plan-chunk";
import type { FlowAction } from "./state";

export function useGuestPlan(dispatch: Dispatch<FlowAction>): () => void {
  return useCallback(() => {
    loadPlanData().then(
      ({ composeGuestPlan }) => dispatch({ type: "guestPlan", plan: composeGuestPlan() }),
      () => undefined,
    );
  }, [dispatch]);
}
