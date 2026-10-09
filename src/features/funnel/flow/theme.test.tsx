// @vitest-environment jsdom
// (C) W15-A: the visitor's own light/dark choice, kept per visitor, and the one place the page's theme is changed.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubLocalStorage } from "./test/memory-storage";
import { THEME_KEY, chooseTheme, readSavedTheme, resetThemeChoice, savedTheme, useChosenTheme } from "./theme";

type BootWindow = Window & { __funnelBoot?: { theme: string } };

beforeEach(() => void stubLocalStorage());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetThemeChoice();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-funnel");
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
