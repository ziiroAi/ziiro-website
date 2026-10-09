// (C) W15-A: the canvas's own background must come out of the renderer as the page colour, byte for byte, so the CSS
// fade at the canvas edges blends a colour into itself and no band or box edge can show (the owner's "this line").
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOOK } from "./look";
import { PAGE_RGB, baseForPage, linearToSrgbByte, neutralToneMap } from "./page-match";

/** What the renderer writes for a background value: times the theme's exposure, three's Neutral tone mapping, then sRGB. */
const rendered = (base: readonly number[], exposure: number) =>
  neutralToneMap(base.map((v) => v * exposure) as [number, number, number]).map(linearToSrgbByte);
const THEMES = Object.keys(LOOK.themes) as (keyof typeof LOOK.themes)[];

// vitest stubs CSS imports, ?raw included, so the tokens are read from disk.
const tokens = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const tokenHex = (theme: string) => tokens.match(new RegExp(`\\[data-theme="${theme}"\\][^}]*--funnel-bg:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
const bytesOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("the canvas background is the page colour (W15-A)", () => {
  it.each(THEMES)("%s: PAGE_RGB is tokens.css's --funnel-bg", (theme) => {
    expect(PAGE_RGB[theme]).toEqual(bytesOf(tokenHex(theme)!));
  });

  it.each([0.8, 0.95, 1, 1.2])("the base comes out as the page colour at exposure %s, within half a level", (exposure) => {
    for (const page of Object.values(PAGE_RGB)) {
      const out = rendered(baseForPage(page, exposure), exposure);
      out.forEach((v, i) => expect(Math.abs(v - page[i])).toBeLessThanOrEqual(0.5));
    }
  });

  // W15-S: W15-C3 set dark's exposure to 0.95 and the base, worked out for 1, came out ~0.7 of a level dark: an edge again.
  it.each(THEMES)("%s: the look's own base, at the look's own exposure, renders as the page colour within 0.1 of a level", (theme) => {
    const t = LOOK.themes[theme];
    const out = rendered(t.background.base, t.exposure);
    out.forEach((v, i) => expect(Math.abs(v - PAGE_RGB[theme][i])).toBeLessThanOrEqual(0.1));
    expect(t.background.vignette).toBe(0);
  });

  it.each(THEMES)("%s: the background never blooms (its luminance is under the threshold)", (theme) => {
    const t = LOOK.themes[theme];
    const [r, g, b] = t.background.base;
    expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeLessThan(t.bloom.threshold - 0.05);
  });

  it("neutralToneMap matches three's shader at both branches", () => {
    expect(neutralToneMap([0.01, 0.02, 0.03])[0]).toBeCloseTo(6.25 * 0.01 * 0.01, 9);
    expect(neutralToneMap([0.5, 0.5, 0.5])).toEqual([0.46, 0.46, 0.46]);
    expect(neutralToneMap([2, 2, 2])[0]).toBeCloseTo(1 - 0.0576 / (1.96 + 0.24 - 0.76), 9);
  });
});
