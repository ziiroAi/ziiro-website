import { describe, expect, it } from "vitest";
import { THEME_FADE_MS, cssEaseInOut, fadeAlpha, msToNextClockSwitch } from "./themeFade";

describe("cssEaseInOut: CSS ease-in-out, cubic-bezier(0.42, 0, 0.58, 1), so the 3D keeps the page's clock (W18-B)", () => {
  it("starts at 0, ends at 1 and is half way at the middle", () => {
    expect(cssEaseInOut(0)).toBe(0);
    expect(cssEaseInOut(1)).toBe(1);
    expect(cssEaseInOut(0.5)).toBeCloseTo(0.5, 6);
  });

  it("is slow at the ends and symmetric about the middle", () => {
    expect(cssEaseInOut(0.1)).toBeLessThan(0.05);
    for (const x of [0.1, 0.25, 0.4]) expect(cssEaseInOut(x) + cssEaseInOut(1 - x)).toBeCloseTo(1, 5);
  });

  it("matches the curve's known value at a quarter (0.1291, from the bezier itself)", () => {
    expect(cssEaseInOut(0.25)).toBeCloseTo(0.1291, 3);
  });

  it("never runs backwards", () => {
    let last = -1;
    for (let i = 0; i <= 100; i++) {
      const y = cssEaseInOut(i / 100);
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
  });

  it("clamps outside 0-1", () => {
    expect(cssEaseInOut(-1)).toBe(0);
    expect(cssEaseInOut(2)).toBe(1);
  });
});

describe("fadeAlpha: how much of the old look's snapshot still shows", () => {
  const fade = { start: 1000, ms: THEME_FADE_MS };

  it("is the whole snapshot until the fade starts, and none once it ends", () => {
    expect(fadeAlpha(900, fade)).toBe(1);
    expect(fadeAlpha(1000, fade)).toBe(1);
    expect(fadeAlpha(1000 + THEME_FADE_MS, fade)).toBe(0);
    expect(fadeAlpha(5000, fade)).toBe(0);
  });

  it("is half at the middle, on the page's ease-in-out", () => {
    expect(fadeAlpha(1000 + THEME_FADE_MS / 2, fade)).toBeCloseTo(0.5, 6);
    expect(fadeAlpha(1000 + THEME_FADE_MS / 4, fade)).toBeCloseTo(1 - cssEaseInOut(0.25), 6);
  });

  it("is none without a fade, or with a zero-length one (reduced motion)", () => {
    expect(fadeAlpha(1000, null)).toBe(0);
    expect(fadeAlpha(1000, { start: 1000, ms: 0 })).toBe(0);
  });

  it("lasts about 400-500 ms", () => {
    expect(THEME_FADE_MS).toBeGreaterThanOrEqual(400);
    expect(THEME_FADE_MS).toBeLessThanOrEqual(500);
  });
});

describe("msToNextClockSwitch: the wait to the next 06:00 or 18:00, by the visitor's clock", () => {
  const at = (h: number, m = 0, s = 0) => new Date(2026, 9, 9, h, m, s);

  it("waits for 18:00 by day and 06:00 by night", () => {
    expect(msToNextClockSwitch(at(17, 59))).toBe(60_000);
    expect(msToNextClockSwitch(at(12))).toBe(6 * 3600_000);
    expect(msToNextClockSwitch(at(5, 30))).toBe(30 * 60_000);
    expect(msToNextClockSwitch(at(23))).toBe(7 * 3600_000);
  });

  it("at the switch itself, waits for the next one", () => {
    expect(msToNextClockSwitch(at(6))).toBe(12 * 3600_000);
    expect(msToNextClockSwitch(at(18))).toBe(12 * 3600_000);
  });
});
