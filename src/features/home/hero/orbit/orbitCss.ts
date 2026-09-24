import { STAGE_H, STAGE_W } from "./geometry";
import {
  PERIOD_S,
  SATELLITE_PERIOD_S,
  STEP_S,
  buildActiveKeyframes,
  buildBeatKeyframes,
  buildNodeKeyframes,
} from "./motion";
import { STAGE_LENGTH_PROPERTY, stageScaleCss } from "./useStageScale";

/**
 * Below this viewport width the per-node labels cannot fit, so the orbit goes
 * compact: dots and numbers stay, labels and roles hide, and a caption in the
 * stage's bottom-left corner names the active department. MEASURED on the real
 * hero, not guessed: in the stacked layout the stage is anchored to the right,
 * and at 660px the longest role passing nine o'clock still clears the
 * viewport's left edge; at 640 it does not. Desktop mode starts at 1024, so
 * this never reaches the desktop picture.
 */
const COMPACT_MAX_PX = 659.98;

/** Elements whose animation name is `zo-` + their class suffix. */
const ANIMATED = [
  "node-a",
  "text-a",
  "thread-a",
  "node-b",
  "text-b",
  "thread-b",
  "readout",
  "focus",
  "core-ring",
  "glow",
  "pulse",
  "ripple-at",
  "ripple",
] as const;

/** Every looping class: the period (`zo-a`), one step, two steps, the drift. */
const LOOPS = ".zo-a,.zo-step,.zo-pair,.zo-drift";

/**
 * The whole stylesheet. Animations are scoped to `.zo-root` and only run when
 * motion is allowed; `data-paused` freezes them in place (offscreen, hidden
 * tab, or the `paused` prop), so resuming continues rather than jumps.
 */
export const ORBIT_CSS = [
  buildNodeKeyframes(),
  buildActiveKeyframes(),
  buildBeatKeyframes(),
  // `--zo-s`: CSS px per su, from the stage's own `--s` (see useStageScale).
  // `--zo-k`: the text's counter-scale, so type holds its size in px (label
  // 11, number and role 10) however small the stage gets.
  STAGE_LENGTH_PROPERTY,
  stageScaleCss(".zo-root", "zo-s"),
  `.zo-root{--zo-k:max(1, calc(1 / var(--zo-s, 1)))}`,
  // The plane is the stage at s = 1, scaled once; everything inside is in su.
  `.zo-plane{position:absolute;left:0;top:0;width:${STAGE_W}px;height:${STAGE_H}px;transform:scale(var(--zo-s, 1));transform-origin:0 0;pointer-events:none}`,
  `.zo-plane svg{position:absolute;left:0;top:0;overflow:visible}`,
  // A pin is a zero-size box at the plane's origin; its transform places it,
  // exactly as an SVG group's would.
  `.zo-pin{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0}`,
  `.zo-drift{position:absolute;transform-origin:50% 50%}`,
  // Counter-scale about the text block's anchor, its local (0, 0), so right
  // alignment against the dot holds at every scale.
  `.zo-root .zo-k{transform:scale(var(--zo-k, 1))}`,
  `.zo-root .zo-compact-only{display:none}`,
  `@media (max-width:${COMPACT_MAX_PX}px){`,
  `.zo-root .zo-label{display:none}`,
  `.zo-root .zo-compact-only{display:block}`,
  // With the label gone, the number drops level with its dot.
  `.zo-root .zo-num{transform:translateY(16px)}`,
  `}`,
  `@media (prefers-reduced-motion: no-preference){`,
  `.zo-root .zo-a{animation-duration:${PERIOD_S}s;animation-timing-function:linear;animation-iteration-count:infinite;animation-fill-mode:both}`,
  `.zo-root .zo-step{animation-duration:${STEP_S}s;animation-timing-function:linear;animation-iteration-count:infinite}`,
  `.zo-root .zo-pair{animation-duration:${2 * STEP_S}s;animation-timing-function:linear;animation-iteration-count:infinite;animation-fill-mode:both}`,
  ...ANIMATED.map((n) => `.zo-root .zo-${n}{animation-name:zo-${n}}`),
  `.zo-root .zo-role-on{animation-name:zo-role}`,
  `.zo-root .zo-drift{animation:zo-drift var(--brain-period, ${SATELLITE_PERIOD_S}s) linear infinite}`,
  `.zo-root[data-paused="true"] :is(${LOOPS}){animation-play-state:paused}`,
  // Layers only while running: paused or offscreen, the ~70 animated pins
  // fall back into their parent's layer instead of each holding its own.
  `.zo-root:not([data-paused="true"]) :is(${LOOPS}){will-change:transform,opacity}`,
  `}`,
].join("");
