/**
 * Every duration and every curve the site animates on, in one file.
 *
 * Before this existed the codebase ran three motion systems side by side —
 * framer-motion, anime.js and a hand-rolled rAF scrubber — each with its own
 * invented timings. Nothing was wrong individually; the problem was that a
 * hover was 300ms in one component and 200ms in the next, and the whole thing
 * read as slightly loose. A house style you can defend is worth more than any
 * single well-chosen value, so: pick from this file, or add to it.
 *
 * The values are calibrated against the reference site, whose computed styles
 * were measured rather than guessed. Two findings drove the scale:
 *
 *   1. Micro-interactions there are FAST — 0.15s on 73 of the elements that
 *      carry a transition at all, with 0.3s a distant second. The perception
 *      of smoothness does not come from slowing things down. It comes from
 *      instant response plus a long, soft settle on the things that travel.
 *   2. The one curve doing the expressive work is expo-out,
 *      cubic-bezier(0.16, 1, 0.3, 1) — used at 0.45s for content swaps.
 *
 * Both are consistent with Apple's guidance: respond immediately, and reserve
 * the long easing for motion that covers distance.
 */

/* ── Curves ──────────────────────────────────────────────────────────────── */

/** Expo-out. The house curve for anything that travels: a fast start that
 *  spends most of its time settling, which is what reads as "smooth". */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** A gentler deceleration for entrances that shouldn't feel flung. */
export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const;

/** Symmetric, for ambient loops and anything that returns to where it began.
 *  Also the correct curve for a state that can be reversed mid-flight. */
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

/** Standard material-style deceleration, for small UI that appears in place. */
export const EASE_OUT = [0, 0, 0.2, 1] as const;

const css = (c: readonly [number, number, number, number]) =>
  `cubic-bezier(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;

/** The same curves as CSS strings, for `transition` and `style`. */
export const CSS_EASE = {
  outExpo: css(EASE_OUT_EXPO),
  outSoft: css(EASE_OUT_SOFT),
  inOut: css(EASE_IN_OUT),
  out: css(EASE_OUT),
} as const;

/* ── Durations, in seconds ───────────────────────────────────────────────── */

export const DURATION = {
  /** Hover, focus, press. Must feel instantaneous — this is the single value
   *  most responsible for the interface feeling attached to the pointer. */
  micro: 0.15,
  /** Colour and border changes on larger surfaces, tab and toggle swaps. */
  quick: 0.22,
  /** View changes that keep their box: tabs, accordions, panel content. */
  swap: 0.32,
  /** Content arriving from off-screen, one element. */
  reveal: 0.62,
  /** A heading resolving line by line, or a panel expanding. */
  statement: 0.85,
  /** The hero entrance, start to finish. */
  entrance: 1.1,
} as const;

/** Same values in milliseconds, for anime.js and raw timeouts. */
export const MS = Object.fromEntries(
  Object.entries(DURATION).map(([k, v]) => [k, Math.round(v * 1000)]),
) as Record<keyof typeof DURATION, number>;

/* ── Distances ───────────────────────────────────────────────────────────── */

/** How far things travel when they arrive. Small on purpose: a long slide
 *  reads as a slideshow, and it costs the reader time before they can read. */
export const TRAVEL = {
  /** A button's icon nudging on hover. */
  nudge: 3,
  /** An interactive card lifting. Only ever on something that is clickable. */
  lift: 4,
  /** A block of content arriving. */
  reveal: 22,
  /** A heading line. Slightly further, because the type is bigger. */
  line: 30,
} as const;

/** Stagger between siblings, in seconds. Long enough to read as a sequence,
 *  short enough that the last item isn't left waiting. */
export const STAGGER = {
  tight: 0.055,
  line: 0.08,
  card: 0.09,
} as const;

/* ── Framer Motion presets ───────────────────────────────────────────────── */

/** Critically damped. The default for anything a user did not throw. */
export const SPRING = {
  type: "spring",
  bounce: 0,
  duration: 0.45,
} as const;

/** A little overshoot, and ONLY for motion that inherited momentum from a
 *  gesture — a flick, a drag release. Overshoot on a menu that merely faded
 *  in is wrong; overshoot on a card you threw is right. */
export const SPRING_MOMENTUM = {
  type: "spring",
  bounce: 0.22,
  duration: 0.5,
} as const;

/** The standard viewport trigger: fire once, when a fifth of the block is in.
 *  `once` matters — content that re-hides when you scroll back up is the most
 *  common way a "smooth" site becomes an annoying one. */
export const VIEWPORT = { once: true, amount: 0.2 } as const;
