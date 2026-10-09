import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// node:fs, not ?raw: Vitest empties every .css module (its css option), ?raw included.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const entry = read("../../../index.css");
const tokensCss = read("../tokens.css");
const flowCss = read("./flow.css");
const tokens = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");
const NAMES = ["bg", "fg", "muted", "line", "card", "accent", "on-accent", "title-from", "title-to"];

/** The --funnel-* values declared in the block whose selector list contains `selector`. */
function block(selector: string): Record<string, string> {
  const found = [...tokens.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, sel]) =>
    sel.split(",").map((s) => s.trim()).includes(selector),
  );
  if (!found) throw new Error(`no block for ${selector}`);
  return Object.fromEntries([...found[2].matchAll(/--funnel-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, k, v]) => [k, v]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = ['[data-theme="light"]', '[data-theme="dark"]'];

describe("the funnel's colours (index §1.3, §11.4)", () => {
  it.each(THEMES)("%s declares all nine", (theme) => {
    expect(Object.keys(block(theme)).sort()).toEqual([...NAMES].sort());
  });

  it.each(THEMES)("%s keeps text at 4.5:1 and the button at 3:1 against the page", (theme) => {
    const c = block(theme);
    expect(contrast(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.muted, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.fg, c.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.muted, c.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c["on-accent"], c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.accent, c.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(c["title-from"], c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c["title-to"], c.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps hx.h2 grey in light and makes it a blue-white gradient in dark (§6.2)", () => {
    const light = block('[data-theme="light"]');
    const dark = block('[data-theme="dark"]');
    expect([light["title-from"], light["title-to"]]).toEqual([light.muted, light.muted]);
    expect([dark["title-from"], dark["title-to"]]).toEqual(["#F4F6FA", "#B9CCF2"]);
  });

  it("gives / without JavaScript the light colours", () => {
    expect(block(":root")).toEqual(block('[data-theme="light"]'));
  });

  it("makes the funnel's sheet at least a screen tall, so the footer starts below the fold (D6)", () => {
    expect(flowCss).toMatch(/\.f-root \{[^}]*min-height: 100svh;/);
  });

  it("loads both files first in the entry stylesheet, so prerendered S0 and S1 are styled at first paint", () => {
    expect(entry.split("\n").slice(0, 3)).toEqual([
      '@import "./features/funnel/tokens.css";',
      '@import "./features/funnel/flow/flow.css";',
      "@tailwind base;",
    ]);
  });
});

describe("S0's small print on a phone (W15-A, worker-2's W14-Y LOW)", () => {
  const ms = (css: string, re: RegExp) => Number(css.match(re)?.[1] ?? NaN);
  it("waits for S1's options to finish rising before it shows, so it never sits over one", () => {
    const rise = flowCss.match(/\.f-intro-on \.f-s1 \{ animation: f-rise (\d+)ms[^}]*\+ (\d+)ms\)/);
    expect(rise).not.toBeNull();
    const riseEnd = Number(rise![1]) + Number(rise![2]);
    const note = flowCss.match(/\.f-root:has\(\.f-intro-on\) \.f-note \{[^}]*\}/)?.[0] ?? "";
    expect(note).toContain("both");
    expect(ms(note, /\+ (\d+)ms\)/)).toBeGreaterThanOrEqual(riseEnd);
  });
});

describe("S0 has no spine layer (W16-B: the spine belongs to the plan only)", () => {
  it("styles no .f-spine at any width", () => {
    expect(flowCss).not.toContain(".f-spine");
  });
});
