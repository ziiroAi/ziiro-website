/**
 * (C) W15-A: the canvas paints its own background (look-three.ts makeBackground) so bloom and the column's end fade
 * blend with it. That value goes through three's Neutral tone mapping (exposure 1) and sRGB before it reaches the
 * screen, so a base that "looks like" the page comes out a few levels off it, and the CSS fade at the canvas edges
 * then draws that difference as a slow ramp: in 8 bits a ramp of 6 levels over 1,100 px is a row of vertical bands
 * (the owner's "this line", 9 Oct). This works the base out backwards from the page colour, so it comes out exact.
 * No three.js imports: look.ts is plain data.
 */
type Rgb = [number, number, number];

/** tokens.css's --funnel-bg, as sRGB bytes (page-match.test.ts reads the CSS to keep them equal). */
export const PAGE_RGB = { light: [250, 250, 248], dark: [6, 9, 17] } as const satisfies Record<string, readonly number[]>;

const START = 0.8 - 0.04;   // three's StartCompression
const DESAT = 0.15;         // three's Desaturation
const D = 1 - START;

/** three's NeutralToneMapping (tonemapping_pars_fragment), exposure 1. */
export function neutralToneMap([r, g, b]: Rgb): Rgb {
  const x = Math.min(r, g, b);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  const c: Rgb = [r - offset, g - offset, b - offset];
  const peak = Math.max(...c);
  if (peak < START) return c;
  const newPeak = 1 - (D * D) / (peak + D - START);
  const k = 1 - 1 / (DESAT * (peak - newPeak) + 1);
  return c.map((v) => (v * newPeak) / peak * (1 - k) + newPeak * k) as Rgb;
}

export const srgbByteToLinear = (byte: number): number => {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

export const linearToSrgbByte = (v: number): number =>
  255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** The linear background value that tone maps to the given sRGB page colour (a near-grey, as both pages are). */
export function baseForPage(page: readonly number[]): Rgb {
  const out = page.map(srgbByteToLinear) as Rgb;
  const lo = Math.min(...out);
  const hi = Math.max(...out);
  if (hi < START) {
    // Uncompressed: out = c - offset. With the dark branch's offset (min under 0.08), out_min = 6.25 m².
    const m = Math.sqrt(lo / 6.25);
    const offset = m < 0.08 ? m - lo : 0.04;
    return out.map((v) => v + offset) as Rgb;
  }
  // Compressed: the peak channel comes out as newPeak, and the desaturation mixes every channel towards it.
  const peak = (D * D) / (1 - hi) - D + START;
  const k = 1 - 1 / (DESAT * (peak - hi) + 1);
  return out.map((v) => ((v - k * hi) / (1 - k)) * (peak / hi) + 0.04) as Rgb;
}
