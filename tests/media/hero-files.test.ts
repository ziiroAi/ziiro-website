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
