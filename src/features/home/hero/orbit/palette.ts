/**
 * The orbit's and core's colours. The brain graphic is orange; the labels stay
 * ink and grey. Nothing here is blue or violet.
 *
 * - INK: the labels' and core words' near-black. With weight 500 it keeps the
 *   reference's tone; the reference's stems are heavier than 400 renders.
 * - ORANGE: every graphic: dots, halos, threads, pulses, ripples, the
 *   satellites, the focus marker and the core's rings. 2.85:1 on white, so
 *   never text.
 * - ORANGE_INK: every orange TEXT (the department numbers, the lit role, the
 *   compact caption's role). 5.18:1 on white, above AA's 4.5 for these small
 *   mono sizes.
 * - orangeTint(): ORANGE mixed with white, for the soft rings, ticks and haze.
 *   Each amount was chosen to match the luminance of the blue tint it replaced,
 *   so the rings keep their weight in the picture.
 * - Warm neutrals: the idle marker, the track and the outer ring, which were
 *   cool blue-greys; same luminance, warm instead of blue.
 */
export const INK = "#202124";
export const ORANGE = "#FF6B1A";
export const ORANGE_INK = "#C2410C";

/** The role line's grey: warm, 5.28:1 on white. */
export const MUTED_INK = "#6F6B68";
export const TRACK_GREY = "#C8BFB9";
export const RULE_GREY = "#D3CAC4";
export const MARKER_GREY = "#BDB5AF";

const ORANGE_RGB = [0xff, 0x6b, 0x1a] as const;

/** ORANGE mixed with white: `amount` 1 is ORANGE itself, 0 is white. */
export function orangeTint(amount: number): string {
  const hex = ORANGE_RGB.map((c) =>
    Math.round(255 - (255 - c) * amount)
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${hex.join("").toUpperCase()}`;
}
