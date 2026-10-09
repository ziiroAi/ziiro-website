/**
 * (C) W15-M6: as the visitor leaves S1, the funnel starts downloading the plan's 3D (its worker's script, then each
 * mesh in PLAN_MESHES), so the plan's 3D is ready soon after S8 ends instead of starting its downloads then
 * (1.15 MB, 1.8 s on a Fast 4G phone, worker-2's W15-R). Once per funnel, in idle time so S1's tap
 * never waits on it, from its own small chunk (the probe and the rules decide whether the 3D would run at all), and
 * never after the visitor leaves the funnel.
 */
import { useEffect, useRef } from "react";
import type { Screen } from "./state";

/** The screens before the plan, past S1: reaching any of them starts the warm (S8's hold at the latest). */
const WARM_ON: ReadonlySet<Screen> = new Set<Screen>(["s1b", "s2", "s34", "s5", "s6", "s7", "s8"]);
/** requestIdleCallback's deadline, so the warm starts on a page that is never idle. */
const IDLE_TIMEOUT_MS = 1000;

interface PlanWarm {
  warmPlanMesh(signal: AbortSignal): Promise<boolean>;
}

const loadPlanWarm = (): Promise<PlanWarm> => import("../spine3d/plan-warm");

function whenIdle(run: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(run, 0);
}

export function usePlanWarm(screen: Screen, load: () => Promise<PlanWarm> = loadPlanWarm): void {
  /** Set once the warm was started: it is asked for once per funnel. Aborted when the funnel unmounts. */
  const leave = useRef<AbortController | null>(null);
  useEffect(() => {
    if (leave.current || !WARM_ON.has(screen)) return;
    const controller = new AbortController();
    leave.current = controller;
    whenIdle(() => {
      if (controller.signal.aborted) return;
      load()
        .then((module) => module.warmPlanMesh(controller.signal))
        // The plan's own viewer fetches its mesh when this could not; nothing waits on the warm.
        .catch(() => undefined);
    });
  }, [screen, load]);
  useEffect(() => () => leave.current?.abort(), []);
}
