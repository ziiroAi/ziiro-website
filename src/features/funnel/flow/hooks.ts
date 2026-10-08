/** (C) The questions' browser hooks: the boot, <html>'s attributes, focus, and the tap made before React ran. */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { FunnelStage, Theme } from "@/features/funnel/data/light";
import { PRERENDER_BOOT, applyFunnelAttributes, clearFunnelAttributes, readBoot, type Boot } from "./boot";
import type { Screen } from "./state";

/** useLayoutEffect in the browser; useEffect in the prerender, where neither runs and React won't warn. */
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The head script's boot, or one worked out now; the prerender's fixed boot without a window. */
export function useBoot(): Boot {
  const [boot] = useState(() => (typeof window === "undefined" ? PRERENDER_BOOT : readBoot(window)));
  return boot;
}

/** data-theme and data-funnel on <html> while the questions are mounted, cleared when they unmount. */
export function useFunnelAttributes(theme: Theme, stage: FunnelStage): void {
  useIsoLayoutEffect(() => {
    applyFunnelAttributes(document, theme, stage);
  }, [theme, stage]);
  useIsoLayoutEffect(() => () => clearFunnelAttributes(window), []);
}

/** The first match outside a [hidden] subtree. At S8 the hidden S7 form comes first and can't take focus (review M1). */
function firstShown(root: HTMLElement, selector: string): HTMLElement | null {
  return [...root.querySelectorAll<HTMLElement>(selector)].find((el) => !el.closest("[hidden]")) ?? null;
}

/**
 * On each step, focus moves to the new question (§11.2): the screen's [data-focus-first], else its H2.
 * A new screen starts at the top. A step within a screen scrolls only as far as the focus needs.
 */
export function useFocusOnStep(seq: number, screen: Screen, root: RefObject<HTMLElement>): void {
  const lastScreen = useRef(screen);
  useIsoLayoutEffect(() => {
    const moved = lastScreen.current !== screen;
    lastScreen.current = screen;
    if (seq === 0 || !root.current) return;  // landing keeps the browser's own focus
    const target = firstShown(root.current, "[data-focus-first]") ?? firstShown(root.current, "[data-question]");
    if (moved) window.scrollTo(0, 0);
    target?.focus({ preventScroll: moved });
  }, [seq]);
}

/**
 * Review Focus 3: an S1 option tapped before React ran is kept by the head script and answered here, once.
 * The boot object is the head script's own, shared on purpose, so this marks it ready in place. It runs as a
 * layout effect, so a tap after React's first commit is never answered twice.
 */
export function useEarlyTap(boot: Boot, onTap: (id: string) => void): void {
  useIsoLayoutEffect(() => {
    boot.ready = true;
    const id = boot.early;
    boot.early = null;
    if (id) onTap(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);
}
