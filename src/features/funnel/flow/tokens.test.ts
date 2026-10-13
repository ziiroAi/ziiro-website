import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_FADE_MS, cssEaseInOut } from "./themeFade";

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

// W18-B: the light/dark crossfade's ink, read from tokens.css's keyframes and played frame by frame at 60 fps.
const INK = ["fg", "muted", "title-from", "title-to"] as const;
const GROUNDS = ["bg", "card", "line"] as const;
type Stop = { at: number; values: Record<string, string> };

/** A @keyframes block's stops, in order: "30%, 52.99%" gives two stops with the same values. */
function keyframes(name: string): Stop[] {
  const body = tokens.match(new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1];
  if (!body) throw new Error(`no @keyframes ${name}`);
  return [...body.matchAll(/([\d.%,\s]+)\{([^}]*)\}/g)]
    .flatMap(([, at, decl]) => {
      const values = Object.fromEntries([...decl.matchAll(/--funnel-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, k, v]) => [k, v]));
      return at.split(",").map((pct) => ({ at: parseFloat(pct) / 100, values }));
    })
    .sort((a, b) => a.at - b.at);
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** CSS's interpolation of legacy colours: in gamma-encoded sRGB. */
const mix = (a: string, b: string, t: number) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));

/** One token's value at linear progress x through the keyframes. */
function inkAt(stops: Stop[], name: string, x: number): string {
  const next = stops.findIndex((s) => s.at > x);
  if (next <= 0) return stops[next === 0 ? 0 : stops.length - 1].values[name];
  const [a, b] = [stops[next - 1], stops[next]];
  return mix(a.values[name], b.values[name], (x - a.at) / (b.at - a.at));
}

describe("the light/dark crossfade (W18-B)", () => {
  const light = block('[data-theme="light"]');
  const dark = block('[data-theme="dark"]');
  const runs = [
    { name: "funnel-ink-to-dark", from: light, to: dark },
    { name: "funnel-ink-to-light", from: dark, to: light },
  ];

  it("lasts THEME_FADE_MS, the 3D's own fade length, everywhere tokens.css says it", () => {
    const lengths = [...tokens.matchAll(/(\d+)ms/g)].map(([, ms]) => Number(ms));
    expect(lengths.length).toBeGreaterThan(0);
    expect(new Set(lengths)).toEqual(new Set([THEME_FADE_MS]));
    expect(tokens).toMatch(/--funnel-bg 450ms ease-in-out/);
  });

  it("registers each eased token as a colour, starting at the light value", () => {
    for (const name of [...INK, ...GROUNDS]) {
      expect(tokens).toMatch(new RegExp(`@property --funnel-${name} \\{ syntax: "<color>"; inherits: true; initial-value: ${light[name]}; \\}`));
    }
  });

  it.each(runs)("$name starts at the old ink and ends at the new", ({ name, from, to }) => {
    const stops = keyframes(name);
    for (const ink of INK) {
      expect(stops[0].values[ink]).toBe(from[ink]);
      expect(stops.at(-1)!.values[ink]).toBe(to[ink]);
    }
  });

  it.each(runs)("$name keeps every frame's text readable on the page and on cards", ({ name, from, to }) => {
    const stops = keyframes(name);
    const frames = Math.round((THEME_FADE_MS / 1000) * 60);
    let worst = Infinity;
    for (let f = 0; f <= frames; f++) {
      const x = f / frames;
      const eased = cssEaseInOut(x);
      for (const ground of ["bg", "card"] as const) {
        const under = mix(from[ground], to[ground], eased);
        for (const ink of INK) worst = Math.min(worst, contrast(inkAt(stops, ink, x), under));
      }
    }
    // The ground passes mid-grey, where old ink and new ink each read at about 4:1: the step's frame.
    expect(worst).toBeGreaterThanOrEqual(3.5);
  });
});
