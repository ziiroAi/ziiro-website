import type { CSSProperties } from "react";

/**
 * The Ziiro brand mark: two curved wedges that read as a Z, drawn as inline
 * vector geometry so it stays crisp at any size and needs no network request.
 *
 * The supplied artwork is exactly 180-degree rotationally symmetric, so only
 * the upper wedge is described here; the lower one is the same path rotated
 * about the centre of the viewBox. That keeps the two halves identical by
 * construction rather than by hand.
 *
 * The shape is painted with currentColor, so it takes the ink of whatever text
 * colour it sits in. The viewBox is square and trimmed to the glyph, so size it
 * with a height class and the width follows.
 *
 * Single source of truth for the mark (navbar, footer). The standalone file at
 * public/logo/ziiro-mark.svg carries the same geometry for non-React consumers.
 */
const WEDGE =
  "M63.45 54.64C63.97 54.79 64.47 55.1 65.01 55.1C67.66 55.1 70.01 53.23 72.2 51.75" +
  "C76.73 48.7 80.78 44.98 84.66 41.15C88.13 37.71 91.27 33.93 94.29 30.08" +
  "C95.91 28.02 97.39 25.83 98.56 23.49C99.12 22.38 99.75 21.25 99.93 20.01" +
  "C100.28 17.65 99.21 15.04 97.65 13.23C95.48 10.73 92.42 9.03 89.39 7.69" +
  "C86 6.18 82.52 4.84 78.93 3.91C66.27 0.62 52.84 -0.51 39.83 0.77" +
  "C38.68 0.88 37.5 0.81 36.35 0.96C31.03 1.65 25.7 2.5 20.54 3.94" +
  "C18.03 4.63 15.61 5.63 13.18 6.56C8.56 8.34 3.55 10.87 1.07 15.16" +
  "C0.2 16.66 -0.42 18.87 0.49 20.34C1.29 21.62 2.77 22.37 4.11 23.04" +
  "C5.65 23.81 7.21 24.53 8.84 25.06C19.27 28.48 30.05 30.77 40.53 34.05" +
  "C44.09 35.16 47.63 36.41 51.05 37.91C54.68 39.49 58.33 41.49 60.97 44.44" +
  "C61.9 45.48 62.6 46.83 62.77 48.21C62.99 49.97 62.39 51.8 62.81 53.51" +
  "C62.91 53.93 63.25 54.25 63.45 54.64Z";

/**
 * `label` is for a mark that stands alone. Both current call sites sit inside a
 * link that already names itself, so the mark stays decorative by default and
 * a screen reader doesn't read "Ziiro" twice.
 */
export default function ZiiroMark({
  className = "h-7",
  label,
  style,
}: {
  className?: string;
  label?: string;
  /** Merged last, so a caller holding the mark's size in a constant rather
   *  than a class can set `height` here without fighting the defaults. */
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ width: "auto", aspectRatio: "1 / 1", ...style }}
      fill="currentColor"
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={WEDGE} />
      <path d={WEDGE} transform="rotate(180 50 50)" />
    </svg>
  );
}
