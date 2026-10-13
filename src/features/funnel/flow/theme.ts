/**
 * (C) W15-A: the visitor's own light/dark choice (D9). The header's toggle is the only thing that changes it: it
 * saves the choice per visitor, sets <html data-theme> while "/" is open, and tells the boot, so the questions, the
 * plan and the 3D (which follows data-theme live) all switch at once. index.html's head script reads the same key
 * before first paint; head-script.test.ts keeps the two in step.
 */
import { useSyncExternalStore } from "react";
import type { Theme } from "@/features/funnel/data/light";
import { THEME_FADE_MS, fadeClock, msToNextClockSwitch, type ThemeFade } from "./themeFade";

export const THEME_KEY = "ziiro-theme";

type BootWindow = Window & { __funnelBoot?: { theme: Theme } };

/** This visit's choice, kept here too so it holds where storage is blocked or full. */
let chosen: Theme | null = null;
/** True once the visitor pressed the toggle this visit; the clock's switch sets `chosen` but not this. */
let visitorChose = false;
/** W18-B: the crossfade under way, for the 3D to follow (themeFadeNow), and the timer that ends its mark. */
let fade: ThemeFade | null = null;
let fadeEnds: ReturnType<typeof setTimeout> | null = null;
/** The mark outlives the fade by this much, so its last frame is drawn before descendants' transitions come back. */
const FADE_MARK_SLACK_MS = 50;
const listeners = new Set<() => void>();

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

/** The choice saved on an earlier visit, or null: none saved, something else saved, or storage blocked. */
export function readSavedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** This visit's choice, else the saved one. */
export const savedTheme = (): Theme | null => chosen ?? readSavedTheme();

const reducedMotion = (): boolean => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** W18-B: marks <html data-theme-fade> for tokens.css, "smooth" (the 450 ms crossfade) or "instant" (reduced
 *  motion), and keeps the fade's start for the 3D. The mark goes once the fade has run. */
function markFade(html: HTMLElement): void {
  const smooth = !reducedMotion();
  const started = smooth ? { start: fadeClock(), ms: THEME_FADE_MS } : null;
  fade = started;
  // CSS starts the transition at the next frame's timeline time, not now: the 3D takes its start from there too,
  // or it runs a few ms ahead of the page and its edge shows mid-fade.
  if (started) {
    requestAnimationFrame((frameTime) => {
      if (fade === started) fade = { ...started, start: performance.timeOrigin + frameTime };
    });
  }
  html.setAttribute("data-theme-fade", smooth ? "smooth" : "instant");
  if (fadeEnds) clearTimeout(fadeEnds);
  fadeEnds = setTimeout(() => {
    fadeEnds = null;
    html.removeAttribute("data-theme-fade");
  }, (smooth ? THEME_FADE_MS : 0) + FADE_MARK_SLACK_MS);
}

/** The crossfade under way, or null: none started, reduced motion, or it has run its length. */
export function themeFadeNow(): ThemeFade | null {
  return fade && fadeClock() < fade.start + fade.ms ? fade : null;
}

/** The toggle's choice (saved), or the clock's switch (`save: false`, so the next visit follows the clock again). */
export function chooseTheme(next: Theme, { save = true }: { save?: boolean } = {}): void {
  chosen = next;
  if (save) {
    visitorChose = true;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked or full: the choice still holds for this visit.
    }
  }
  const boot = (window as BootWindow).__funnelBoot;
  if (boot) boot.theme = next;
  const html = document.documentElement;
  if (html.hasAttribute("data-funnel") && html.getAttribute("data-theme") !== next) {
    markFade(html);
    html.setAttribute("data-theme", next);
  }
  listeners.forEach((onChange) => onChange());
}

/** True once the visitor has chosen, this visit or an earlier one. */
export const visitorHasChosen = (): boolean => visitorChose || readSavedTheme() !== null;

/** W18-B: while "/" is open, follows the visitor's clock at 06:00 and 18:00 (boot.ts's themeFor) with the same
 *  crossfade, until they choose for themselves. Returns its stop. */
export function startClockTheme(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    timer = setTimeout(() => {
      if (visitorHasChosen()) return;
      const hour = new Date().getHours();
      chooseTheme(hour >= 6 && hour < 18 ? "light" : "dark", { save: false });
      schedule();
    }, msToNextClockSwitch(new Date()));
  };
  schedule();
  return () => {
    if (timer) clearTimeout(timer);
  };
}

/** Tests only: forget this visit's choice and any fade. */
export function resetThemeChoice(): void {
  chosen = null;
  visitorChose = false;
  fade = null;
  if (fadeEnds) clearTimeout(fadeEnds);
  fadeEnds = null;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
}

/** The boot's theme until the visitor chooses one, then their choice, live. */
export function useChosenTheme(initial: Theme): Theme {
  return useSyncExternalStore(subscribe, () => chosen ?? initial, () => initial);
}
