/**
 * Attributes for the small static SVG a pin carries (see motion.ts). It is a
 * 1 × 1 box that draws about its origin with overflow visible: an outer SVG
 * of zero size would not render at all. Decorative, like the whole orbit.
 */
export const PIN_SVG = {
  width: 1,
  height: 1,
  overflow: "visible",
  "aria-hidden": true,
  focusable: false,
} as const;
