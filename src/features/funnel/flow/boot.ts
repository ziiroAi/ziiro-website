/**
 * (C) The boot rules (spec §4.2, D4, D9). index.html's head script runs the same rules before
 * first paint on a full load of "/"; head-script.test.ts keeps the two in step.
 */
import type { DayPart, FunnelStage, Theme } from "@/features/funnel/data/light";

export type SubId = "s0.sub.early" | "s0.sub.day" | "s0.sub.late";
/** A row of the greeting map in index.html. `lang` is lower case; `checked` turns the row on (decision 21). */
export interface GreetingRow { lang: string; checked: boolean; lines: [string, string, string] }
export interface Boot {
  hour: number;
  t0: number;                 // performance.now() when worked out
  dayPart: DayPart;
  theme: Theme;
  sub: SubId;
  lang: string;
  greeting: string;
  early: string | null;       // an S1 option tapped before React ran (Review Focus 3)
  ready: boolean;             // set once FunnelRoot has mounted
}
export interface BootInput {
  hour: number;
  deviceDark: boolean;
  languages: readonly string[];
  map: readonly GreetingRow[] | null;
  t0: number;
}
type BootWindow = Window & { __funnelBoot?: Boot };

/** What the prerendered HTML holds, and keeps if the boot script fails (§4.2). */
export const STATIC_GREETING = "Hello.";
/** The boot the prerender (and a server render) uses: "Hello.", the daytime line, light. */
export const PRERENDER_BOOT: Boot = {
  hour: 12, t0: 0, dayPart: "afternoon", theme: "light", sub: "s0.sub.day",
  lang: "en", greeting: STATIC_GREETING, early: null, ready: false,
};
const LINE_FOR: Record<DayPart, 0 | 1 | 2> = { morning: 0, afternoon: 1, evening: 2 };

export function dayPartFor(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function subFor(hour: number): SubId {
  if (hour >= 5 && hour < 8) return "s0.sub.early";
  if (hour >= 8 && hour < 22) return "s0.sub.day";
  return "s0.sub.late";
}

export function themeFor(hour: number, deviceDark: boolean): Theme {
  return deviceDark || hour >= 17 || hour < 5 ? "dark" : "light";
}

/** The first browser language with a live row, by full tag and then its first part; else English (D4). */
export function pickRow(map: readonly GreetingRow[], languages: readonly string[]): GreetingRow | null {
  const live = (lang: string) => map.find((row) => row.checked && row.lang === lang);
  for (const tag of languages) {
    const t = String(tag).toLowerCase();
    const row = live(t) ?? live(t.split("-")[0]);
    if (row) return row;
  }
  return live("en") ?? null;
}

export function computeBoot({ hour, deviceDark, languages, map, t0 }: BootInput): Boot {
  const dayPart = dayPartFor(hour);
  const row = map ? pickRow(map, languages) : null;
  return {
    hour, t0, dayPart,
    theme: themeFor(hour, deviceDark),
    sub: subFor(hour),
    lang: row?.lang ?? "en",
    greeting: row ? row.lines[LINE_FOR[dayPart]] : STATIC_GREETING,
    early: null,
    ready: false,
  };
}

export function readGreetingMap(doc: Document): GreetingRow[] | null {
  try {
    const parsed: unknown = JSON.parse(doc.getElementById("funnel-greetings")?.textContent ?? "null");
    return Array.isArray(parsed) ? (parsed as GreetingRow[]) : null;
  } catch {
    return null;
  }
}

/** The head script's result on a full load of "/"; worked out here when the visitor came from another page. */
export function readBoot(win: BootWindow): Boot {
  if (win.__funnelBoot) return win.__funnelBoot;
  let deviceDark = false;
  try {
    deviceDark = win.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    deviceDark = false;       // no matchMedia: the clock decides
  }
  const nav = win.navigator;
  const boot = computeBoot({
    hour: new Date().getHours(),
    deviceDark,
    languages: nav.languages?.length ? nav.languages : [nav.language || "en"],
    map: readGreetingMap(win.document),
    t0: win.performance.now(),
  });
  win.__funnelBoot = boot;
  return boot;
}

/** data-funnel marks "/" for the funnel's own CSS. The header reads funnelSession.stage(), not this attribute. */
export function applyFunnelAttributes(doc: Document, theme: Theme, stage: FunnelStage): void {
  doc.documentElement.setAttribute("data-theme", theme);
  doc.documentElement.setAttribute("data-funnel", stage);
}

/** Leaving "/": other pages keep their own look, and a later visit to "/" works its boot out afresh. */
export function clearFunnelAttributes(win: BootWindow): void {
  win.document.documentElement.removeAttribute("data-theme");
  win.document.documentElement.removeAttribute("data-funnel");
  delete win.__funnelBoot;
}

/** When the S0 intro started: first paint on a full load of "/", or t0 when the visitor came from another page. */
export function introStartMs(win: Window, t0: number): number {
  const paint = win.performance.getEntriesByName?.("first-contentful-paint")?.[0];
  return Math.max(paint ? paint.startTime : t0, t0);
}

/** How far the S0 intro already is, as a negative delay for flow.css's --f-t. */
export function introOffsetMs(start: number, now: number): number {
  return Math.min(0, Math.round(start - now));
}
