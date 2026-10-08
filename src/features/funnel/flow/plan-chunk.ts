/**
 * (C) The plan chunk (spec §6.6, §13.1, §13.10; index §1.5): lane C's PlanPage, its hero still and composePlan,
 * reached only through import(). S5 starts them, so they're ready when S8 ends, and the agents data, the jobs and
 * the phrase lists never enter the funnel chunk.
 */
import { lazy } from "react";

/** How long a failed import waits before its one retry (review H2: a dropped connection, a deploy mid-visit). */
export const IMPORT_RETRY_MS = 500;

export async function retryOnce<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, IMPORT_RETRY_MS));
    return load();
  }
}

export const loadPlanPage = () => import("@/features/funnel/plan/PlanPage");
export const loadPlanData = () => retryOnce(() => import("@/features/funnel/data"));

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
