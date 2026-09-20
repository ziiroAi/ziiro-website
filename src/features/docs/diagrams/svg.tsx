import type { ReactNode } from "react";

/**
 * Shared drawing language for the Docs diagrams.
 *
 * WHY INLINE SVG. A raster would need an asset pipeline, would blur on a
 * retina screen, would need a second file per theme, and would be invisible to
 * a crawler. These ship inside the prerendered HTML, stay crisp at any size,
 * and take their ink from the same CSS variables as the text beside them, so
 * retoning the site retones the diagrams with no second edit.
 *
 * TYPE SIZE IS THE WHOLE CONSTRAINT, and every diagram here is authored
 * MOBILE FIRST because of it. An SVG scales its text with its box, so the
 * authored width decides what the type does at both ends of the range.
 *
 * I got this wrong first and the screenshot caught it. Authoring at ~600 units
 * and capping there put the phone at a 0.57 scale, which rendered the smallest
 * labels at 4.8px: every numeric check passed, zero overflow included, and the
 * diagrams were simply unreadable on a phone.
 *
 * So: author at VIEW (340 units), which is about the content width of a 390px
 * phone, and cap at MAX (480px). The scale range is then 1.0 on a phone up to
 * about 1.4 on a desktop, so a label authored at 11 units renders at 11px and
 * 15px. Both of those are sizes this site sets by hand elsewhere. Author wider
 * than this and the phone end breaks again.
 *
 * NO DRAWING ANIMATION, in any of them. The page reveals its sections already,
 * these are reference figures rather than moments, and a diagram that animates
 * in is a diagram you have to wait for. That also means there is no
 * reduced-motion branch to get wrong: there is no motion to reduce.
 */

export const INK = "var(--text-primary)";
export const DIM = "var(--text-secondary)";
export const FAINT = "var(--text-muted)";
export const LINE = "var(--border)";
export const LINE_STRONG = "var(--border-strong)";
export const ACCENT = "var(--accent)";
export const BG = "var(--background)";

/** Authored width, about the content width of a 390px phone. */
export const VIEW = 340;
/** Cap, so the scale never climbs past ~1.4 and the type never balloons. */
export const MAX = 480;

/** Space Mono for tracked uppercase micro-labels only, as everywhere else. */
export const MONO = '"Space Mono", ui-monospace, SFMono-Regular, monospace';
export const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/**
 * The wrapper every diagram uses.
 *
 * ACCESSIBILITY, which the brief makes part of the job rather than a footnote.
 * The `<svg>` inside carries role="img" and is named by its own `<title>`, so
 * a screen reader announces one figure rather than reading out a pile of
 * anonymous shapes. `<desc>` carries the longer reading.
 *
 * The information is ALSO recoverable without seeing it: every diagram here
 * draws data that exists as real text on the same page, and where a diagram
 * adds something the prose does not say, the caption says it in words. A
 * figure that is the only carrier of its own content is the failure this
 * pattern exists to avoid.
 */
export function Figure({
  caption,
  children,
  className = "",
  maxWidth,
}: {
  /** Visible, and the figure's text equivalent. Keep it a real sentence. */
  caption: string;
  children: ReactNode;
  className?: string;
  /** Cap in px. See the note above on why this is not optional. */
  maxWidth: number;
}) {
  return (
    <figure className={`not-prose my-2 ${className}`} style={{ maxWidth }}>
      {children}
      <figcaption className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.2em] text-[var(--text-muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}

/** A right-pointing arrowhead, drawn rather than a marker: markers inherit
 *  stroke in ways that vary between engines, and this is three points. */
export function ArrowHead({ x, y, size = 5 }: { x: number; y: number; size?: number }) {
  return (
    <polygon
      points={`${x},${y - size * 0.6} ${x + size},${y} ${x},${y + size * 0.6}`}
      fill={FAINT}
    />
  );
}

/** A down-pointing arrowhead, for the vertical flows. */
export function ArrowDown({ x, y, size = 5 }: { x: number; y: number; size?: number }) {
  return (
    <polygon
      points={`${x - size * 0.6},${y} ${x + size * 0.6},${y} ${x},${y + size}`}
      fill={FAINT}
    />
  );
}
