// @vitest-environment jsdom
// (C) W15-A: the visitor's own light/dark choice, kept per visitor, and the one place the page's theme is changed.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubLocalStorage } from "./test/memory-storage";
import { THEME_FADE_MS } from "./themeFade";
import {
  THEME_KEY, chooseTheme, readSavedTheme, resetThemeChoice, savedTheme, startClockTheme, themeFadeNow, useChosenTheme,
  visitorHasChosen,
} from "./theme";

type BootWindow = Window & { __funnelBoot?: { theme: string } };

beforeEach(() => void stubLocalStorage());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetThemeChoice();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-funnel");
  document.documentElement.removeAttribute("data-theme-fade");
  vi.useRealTimers();
  delete (window as BootWindow).__funnelBoot;
});

describe("the saved choice", () => {
  it("reads light or dark, and nothing else", () => {
    expect(readSavedTheme()).toBeNull();
    window.localStorage.setItem(THEME_KEY, "dark");
    expect(readSavedTheme()).toBe("dark");
    window.localStorage.setItem(THEME_KEY, "sepia");
    expect(readSavedTheme()).toBeNull();
  });

  it("reads nothing when storage throws", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readSavedTheme()).toBeNull();
  });
});

describe("chooseTheme", () => {
  it("saves the choice, sets <html data-theme> on '/' and tells the boot", () => {
    document.documentElement.setAttribute("data-funnel", "questions");
    document.documentElement.setAttribute("data-theme", "dark");
    (window as BootWindow).__funnelBoot = { theme: "dark" };
    chooseTheme("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect((window as BootWindow).__funnelBoot?.theme).toBe("light");
  });

  it("leaves other pages' <html> alone", () => {
    chooseTheme("light");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("still holds the choice for this visit when storage throws", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    chooseTheme("dark");
    expect(savedTheme()).toBe("dark");
  });
});

describe("useChosenTheme", () => {
  it("is the boot's theme until the visitor chooses, then follows the choice live", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const seen: string[] = [];
    function Probe() {
      seen.push(useChosenTheme("dark"));
      return null;
    }
    const root = createRoot(document.createElement("div"));
    act(() => root.render(<Probe />));
    expect(seen.at(-1)).toBe("dark");
    act(() => chooseTheme("light"));
    expect(seen.at(-1)).toBe("light");
    act(() => root.unmount());
  });
});

const motion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));

describe("the crossfade a choice starts on '/' (W18-B)", () => {
  beforeEach(() => document.documentElement.setAttribute("data-funnel", "plan"));

  it("marks <html data-theme-fade=smooth> and gives the 3D the fade's start and length, then clears", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    motion(false);
    const before = performance.timeOrigin + performance.now();
    chooseTheme("dark");
    expect(document.documentElement.dataset.themeFade).toBe("smooth");
    const fade = themeFadeNow();
    expect(fade?.ms).toBe(THEME_FADE_MS);
    expect(fade?.start).toBeGreaterThanOrEqual(before);
    vi.advanceTimersByTime(THEME_FADE_MS + 100);
    expect(document.documentElement.hasAttribute("data-theme-fade")).toBe(false);
  });

  it("re-times the fade to the frame its colours start in, as CSS starts a transition, so the 3D keeps step", () => {
    motion(false);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
    chooseTheme("dark");
    const ts = performance.now() + 7;
    frames.splice(0).forEach((frame) => frame(ts));
    expect(themeFadeNow()?.start).toBe(performance.timeOrigin + ts);
  });

  it("switches at once under reduced motion: data-theme-fade=instant and no fade for the 3D", () => {
    motion(true);
    chooseTheme("dark");
    expect(document.documentElement.dataset.themeFade).toBe("instant");
    expect(themeFadeNow()).toBeNull();
  });

  it("has no fade once it has run its length", () => {
    motion(false);
    chooseTheme("dark");
    vi.spyOn(performance, "now").mockReturnValue(performance.now() + THEME_FADE_MS + 1);
    expect(themeFadeNow()).toBeNull();
  });
});

describe("the clock's switch at 06:00 and 18:00 (W18-B)", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-funnel", "plan");
    document.documentElement.setAttribute("data-theme", "light");
    motion(false);
  });

  it("goes dark at 18:00 with the same crossfade, without saving it as the visitor's choice", () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 9, 17, 59), toFake: ["setTimeout", "clearTimeout", "Date"] });
    const stop = startClockTheme();
    vi.advanceTimersByTime(59_000);
    expect(document.documentElement.dataset.theme).toBe("light");
    vi.advanceTimersByTime(1_000);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeFade).toBe("smooth");
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
    expect(visitorHasChosen()).toBe(false);
    stop();
  });

  it("leaves a visitor's own choice alone", () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 9, 17, 59), toFake: ["setTimeout", "clearTimeout", "Date"] });
    chooseTheme("light");
    expect(visitorHasChosen()).toBe(true);
    const stop = startClockTheme();
    vi.advanceTimersByTime(120_000);
    expect(document.documentElement.dataset.theme).toBe("light");
    stop();
  });
});
