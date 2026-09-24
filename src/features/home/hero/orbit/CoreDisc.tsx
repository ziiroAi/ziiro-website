/**
 * The core: a quiet glowing point where the threads meet. A small orange dot
 * in a white ring, in a soft orange glow, the department nodes' family a size
 * up. It used to be a large white disc with a frosted band of ticks and the
 * words "CORE / BRAIN" set in it; the words and the disc are gone, at the
 * owner's request, and the glass brain behind it now carries the picture.
 *
 * It is its own layer, ABOVE the stage and NOT clipped by it (HeroStage). The
 * parent is a square box centred on C, 124 su × s, and the drawing is in su
 * about C.
 *
 * Static by design. The orbit's per-step ring, drawn under it, is what makes
 * the core react, so this layer needs no pause logic. Its radius is
 * CORE_DISC_R (geometry.ts), so the active thread and the pulse land on its
 * edge.
 */

import { CORE_DISC_R } from "./geometry";
import { ORANGE, orangeTint } from "./palette";

/** The glow's reach and the dot, in su. */
const GLOW_R = 40;
const DOT_R = 7;

interface CoreDiscProps {
  className?: string;
}

export default function CoreDisc({ className }: CoreDiscProps) {
  return (
    <div data-hero="core" className={`relative h-full w-full ${className ?? ""}`}>
      <svg
        className="block h-full w-full overflow-visible"
        viewBox="-62 -62 124 124"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="zc-glow" cx="0" cy="0" r={GLOW_R} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={ORANGE} stopOpacity="0.3" />
            <stop offset="0.45" stopColor={ORANGE} stopOpacity="0.1" />
            <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r={GLOW_R} fill="url(#zc-glow)" />
        <circle r={CORE_DISC_R} fill="#FFFFFF" stroke={orangeTint(0.55)} strokeWidth={1} />
        <circle r={DOT_R} fill={ORANGE} />
      </svg>
    </div>
  );
}
