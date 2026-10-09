/**
 * (C) W15-A: the visitor's own light/dark choice (D9). The header's toggle is the only thing that changes it: it
 * saves the choice per visitor, sets <html data-theme> while "/" is open, and tells the boot, so the questions, the
 * plan and the 3D (which follows data-theme live) all switch at once. index.html's head script reads the same key
 * before first paint; head-script.test.ts keeps the two in step.
 */
import { useSyncExternalStore } from "react";
import type { Theme } from "@/features/funnel/data/light";

export const THEME_KEY = "ziiro-theme";

type BootWindow = Window & { __funnelBoot?: { theme: Theme } };

/** This visit's choice, kept here too so it holds where storage is blocked or full. */
let chosen: Theme | null = null;
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

export function chooseTheme(next: Theme): void {
  chosen = next;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked or full: the choice still holds for this visit.
  }
  const boot = (window as BootWindow).__funnelBoot;
  if (boot) boot.theme = next;
  const html = document.documentElement;
  if (html.hasAttribute("data-funnel")) html.setAttribute("data-theme", next);
  listeners.forEach((onChange) => onChange());
}

/** Tests only: forget this visit's choice. */
export function resetThemeChoice(): void {
  chosen = null;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => void listeners.delete(onChange);
}

/** The boot's theme until the visitor chooses one, then their choice, live. */
export function useChosenTheme(initial: Theme): Theme {
  return useSyncExternalStore(subscribe, () => chosen ?? initial, () => initial);
}
