import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avifSize, webpSize } from "../helpers/image-size";

const THEMES = ["light", "dark"] as const;
const FORMATS = ["avif", "webp"] as const;
const LANDSCAPE = [1280, 1920, 2560];                          // 16:9 (§6.6)
const PHONE: Record<number, number> = { 828: 870, 1170: 1230 }; // the band (D34); no 1290 (D31)
const LIMITS = {                                                // §13.10, bytes
  desktop: { avif: 220_000, webp: 320_000 },
  phone: { avif: 120_000, webp: 180_000 },
};
const sizeOf = { avif: avifSize, webp: webpSize };
const cases = (widths: number[]) => widths.flatMap((w) => FORMATS.map((f) => [w, f] as const));

describe.each(THEMES)("public/spine/r17/%s/hero (§6.6)", (theme) => {
  const dir = `public/spine/r17/${theme}/hero`;

  it("holds exactly the ten phase 1 files", () => {
    const expected = [
      ...cases(LANDSCAPE).map(([w, f]) => `hero-${w}.${f}`),
      ...cases(Object.keys(PHONE).map(Number)).map(([w, f]) => `phone-${w}.${f}`),
    ].sort();
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(expected);
  });

  it.each(cases(LANDSCAPE))("hero-%i.%s is 16:9 and within the desktop limit", (w, f) => {
    const buf = readFileSync(`${dir}/hero-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: (w * 9) / 16 });
    expect(buf.length).toBeLessThanOrEqual(LIMITS.desktop[f]);
  });

  it.each(cases(Object.keys(PHONE).map(Number)))("phone-%i.%s is the band, within the phone limit", (w, f) => {
    const buf = readFileSync(`${dir}/phone-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: PHONE[w] });
    expect(buf.length).toBeLessThanOrEqual(LIMITS.phone[f]);
  });
});

/** W18-C: the plan's stills since r18, drawn by the live 3D at the frame it starts on, one per stage shape. r17 stays
 *  above: its files are immutable and an old cached page may still ask for them. */
const R18: Record<"hero" | "tablet" | "phone", Record<number, number>> = {
  hero: { 1280: 725, 1920: 1088, 2880: 1632 },   // the 1440 x 816 stage
  tablet: { 1024: 1076, 1536: 1614 },            // the 1290:1356 band from 600 px, desktop mesh
  phone: { 585: 615 },                           // the phone band, at the 3D's own 1.5x
};
const r18Cases = Object.entries(R18).flatMap(([name, sizes]) =>
  Object.keys(sizes).flatMap((w) => FORMATS.map((f) => [name as keyof typeof R18, Number(w), f] as const)));

describe.each(THEMES)("public/spine/r18/%s/hero (W18-C)", (theme) => {
  const dir = `public/spine/r18/${theme}/hero`;

  it("holds exactly the twelve stills", () => {
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(r18Cases.map(([n, w, f]) => `${n}-${w}.${f}`).sort());
  });

  it.each(r18Cases)("%s-%i.%s has its stage's size, within the limit", (name, w, f) => {
    const buf = readFileSync(`${dir}/${name}-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: R18[name][w] });
    expect(buf.length).toBeLessThanOrEqual(LIMITS[name === "phone" ? "phone" : "desktop"][f]);
  });
});

// W19: the same stills drawn from m5 (the owner's coil). r18 stays above: immutable, and an old page may ask for it.
describe.each(THEMES)("public/spine/r19/%s/hero (W19)", (theme) => {
  const dir = `public/spine/r19/${theme}/hero`;

  it("holds exactly the twelve stills", () => {
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(r18Cases.map(([n, w, f]) => `${n}-${w}.${f}`).sort());
  });

  it.each(r18Cases)("%s-%i.%s has its stage's size, within the limit", (name, w, f) => {
    const buf = readFileSync(`${dir}/${name}-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: R18[name][w] });
    expect(buf.length).toBeLessThanOrEqual(LIMITS[name === "phone" ? "phone" : "desktop"][f]);
  });
});

// W19 r2: the same stills drawn from m5b (graphite, quiet discs dark). r19 stays above: immutable.
describe.each(THEMES)("public/spine/r20/%s/hero (W19 r2)", (theme) => {
  const dir = `public/spine/r20/${theme}/hero`;

  it("holds exactly the twelve stills", () => {
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(r18Cases.map(([n, w, f]) => `${n}-${w}.${f}`).sort());
  });

  it.each(r18Cases)("%s-%i.%s has its stage's size, within the limit", (name, w, f) => {
    const buf = readFileSync(`${dir}/${name}-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: R18[name][w] });
    expect(buf.length).toBeLessThanOrEqual(LIMITS[name === "phone" ? "phone" : "desktop"][f]);
  });
});

// W21: the same stills drawn with the satin gunmetal finish. r20 stays above: immutable.
describe.each(THEMES)("public/spine/r21/%s/hero (W21)", (theme) => {
  const dir = `public/spine/r21/${theme}/hero`;

  it("holds exactly the twelve stills", () => {
    expect(readdirSync(dir).filter((f) => !f.startsWith(".")).sort()).toEqual(r18Cases.map(([n, w, f]) => `${n}-${w}.${f}`).sort());
  });

  it.each(r18Cases)("%s-%i.%s has its stage's size, within the limit", (name, w, f) => {
    const buf = readFileSync(`${dir}/${name}-${w}.${f}`);
    expect(sizeOf[f](buf)).toEqual({ width: w, height: R18[name][w] });
    expect(buf.length).toBeLessThanOrEqual(LIMITS[name === "phone" ? "phone" : "desktop"][f]);
  });
});
