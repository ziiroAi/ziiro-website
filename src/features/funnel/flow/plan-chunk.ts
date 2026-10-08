/**
 * (C) The plan chunk (spec §6.6, §13.1, §13.10; index §1.5): lane C's PlanPage, its hero still and composePlan,
 * reached only through import(). S5 starts them, so they're ready when S8 ends, and the agents data, the jobs and
 * the phrase lists never enter the funnel chunk.
 */
import { lazy } from "react";

export const loadPlanPage = () => import("@/features/funnel/plan/PlanPage");
export const loadPlanData = () => import("@/features/funnel/data");

/** Starts both downloads. A failure here is tried again when they're needed. */
export function prefetchPlan(): void {
  loadPlanPage().catch(() => undefined);
  loadPlanData().catch(() => undefined);
}

export const LazyPlanPage = lazy(() => loadPlanPage().then((module) => ({ default: module.PlanPage })));

/** §6.6: the hero <picture>, mounted out of sight from S5, so the browser has the file S9 shows. */
export const LazyHeroPicturePrefetch = lazy(() =>
  import("@/features/funnel/plan/HeroPicture").then((module) => ({ default: module.HeroPicturePrefetch })),
);
