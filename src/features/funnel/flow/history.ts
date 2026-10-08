/**
 * (C) The questions in the browser's history (spec §4.1). S1 to S7 each add an entry on the same URL, and S8
 * and the plan take S7's, so Back from the plan lands on S6. Each entry keeps react-router's own state.
 */
import { useEffect } from "react";
import { isOneOf } from "@/features/funnel/data/light";
import { SCREENS, type FlowState, type Screen } from "./state";

export function tagEntry(win: Window, screen: Screen, mode: "push" | "replace"): void {
  const state = { ...((win.history.state as Record<string, unknown> | null) ?? {}), funnel: screen };
  if (mode === "push") win.history.pushState(state, "", win.location.href);
  else win.history.replaceState(state, "", win.location.href);
}

export function screenOfEntry(state: unknown): Screen | null {
  const screen = (state as { funnel?: unknown } | null)?.funnel;
  return isOneOf(SCREENS, screen) ? screen : null;
}

/** Mirrors each step into history, and turns the browser's Back and Forward into popTo. */
export function useFlowHistory(nav: FlowState["nav"], screen: Screen, onPop: (screen: Screen) => void): void {
  useEffect(() => {
    tagEntry(window, "s1", "replace");  // the landing entry
  }, []);

  useEffect(() => {
    if (nav.seq === 0 || nav.mode === "none") return;
    tagEntry(window, screen, nav.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per step; seq changes with every step
  }, [nav.seq]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const target = screenOfEntry(event.state);
      if (target) onPop(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onPop]);
}
