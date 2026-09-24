import {
  CORE,
  CORE_DISC_R,
  FOCUS_ANGLE,
  NODE_RING_R,
  SLOT_ANGLES,
  TEXT_DX,
  TEXT_DY,
  THREAD_END_R,
  TRACK,
  slotLerp,
  towardCore,
  trackPoint,
  type Point,
} from "./geometry";

/**
 * The orbit's motion, as plain CSS keyframes built once at module load.
 *
 * WHY CSS AND NOT rAF. The keyframes ship in the server markup; HeroStage holds
 * them paused until hydration decides. They cost no JavaScript per frame, and
 * pause with one `animation-play-state`. Reduced motion is a media query
 * that switches the animations off and leaves each element's inline
 * `transform`, which IS the reference frame.
 *
 * WHY HTML AND NOT SVG. Chrome never runs CSS animations of SVG elements on
 * the compositor: animating the nodes as SVG groups cost 60 layouts and 120
 * paints a second (16.6% of the main thread on a prod build, 94% at 4× CPU).
 * So every MOVING part is an HTML element that animates only `transform` and
 * `opacity`, which the compositor runs without touching the main thread. Each
 * is a zero-size "pin" at the plane's origin that carries a small static SVG
 * (a dot, a text block, a hairline), so the drawing itself is unchanged. The
 * rings, the track and the focus ring do not move and stay SVG. Colour changes
 * are opacity crossfades between two copies, never an animated fill or stroke.
 *
 * THE MODEL. Time is measured in steps. A department's position is a
 * fractional slot index (0 entry, 1–8 the rest slots, 9 exit), and it advances
 * one slot per step, linearly in angle within each segment. The slots are
 * uneven, so speed varies ±20% by segment, which is invisible at this step
 * length and is the only way both to flow continuously and to land on the
 * reference at every integer step. A node's keyframes are
 * `translate(T) rotate(−θ) translate(r) rotate(θ)`, one per step: the browser
 * interpolates each function of the list linearly, so between two keyframes θ
 * moves linearly and the dot stays exactly on the circle.
 *
 * Every department shares one set of keyframes and is offset by a negative
 * delay of `index` steps.
 *
 * THE WRAP. With eight departments on eight slots, the node sliding slot 8 →
 * exit is also the node sliding entry → slot 1. Each department therefore has
 * a second copy ("B") that is invisible except during its own wrap step, when
 * it fades and scales in from the entry slot while copy A fades out to the
 * exit. At the loop point the two copies hand over at slot 1 with identical
 * pixels, so the seam never shows.
 */

/** One step, in seconds. Inside 3.5–5 s: nodes move at ~27 px/s, near the
 *  brain rim's 20, and each label reads for a full five seconds as it passes
 *  the marker. Still linear, with no dwell: a move-then-stop rhythm would put a
 *  motion onset on screen every step, and onsets are what pull the eye off the
 *  headline. */
export const STEP_S = 5;
const STEPS = 8;
export const PERIOD_S = STEP_S * STEPS;

/** The brain's rotation period; the satellites drift with it. Both read
 *  `--brain-period` first (brain-raster.css falls back to the same 120s), so
 *  setting it on the stage retimes the two together. */
export const SATELLITE_PERIOD_S = 120;

/** Thread and pulse samples per step. They aim at C, not at the track's
 *  centre, so they are sampled rather than rotated: at 4, a hairline's end
 *  strays < 0.6 su from its dot. The nodes need one keyframe per step. */
const SAMPLES_PER_STEP = 4;
/** Samples across the wrap step, where scale and opacity ease. */
const WRAP_SAMPLES = 8;

/** Where the active window sits, in steps from a department's slot-1 time.
 *  Segment 4 → 5 (steps 3 → 4) crosses the marker at fraction ≈ 0.44, and a
 *  node is active for one step centred there, so exactly one node is active
 *  at any moment. */
const CROSS_STEP =
  3 + (FOCUS_ANGLE - SLOT_ANGLES[4]) / (SLOT_ANGLES[5] - SLOT_ANGLES[4]);
const ACTIVE_FROM = CROSS_STEP - 0.5;
const ACTIVE_TO = CROSS_STEP + 0.5;

/** The role colour and thread glow ramp on over 0.08 step and off over 0.15,
 *  each CENTRED on the handover, so the outgoing and incoming departments
 *  cross-fade and one of them is always lit. */
const RAMP_IN = 0.08;
const RAMP_OUT = 0.15;
/** The compact readout cannot cross-fade (two captions would stack in one
 *  plate), so it swaps in sequence: out over the last 0.03 step of a window,
 *  in over the first 0.03 of the next. About 150 ms each, never empty. */
const READOUT_SWAP = 0.03;

/** The beat's rings, eased out with the site's curve so they arrive softly
 *  rather than expand mechanically. */
const EASE_OUT = "cubic-bezier(0.22,1,0.36,1)";
const RIPPLE = { scale: 1.6, peak: 0.45, steps: 0.25 } as const;
const CORE_RING = { scale: 1.5, peak: 0.35, steps: 0.4 } as const;

/** Entry/exit scale floor. */
const SCALE_HIDDEN = 0.55;

// ------------------------------------------------------------------ helpers

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const pct = (step: number, steps = STEPS) => `${r3((step / steps) * 100)}%`;

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

function range(from: number, to: number, by: number): number[] {
  const out: number[] = [];
  const n = Math.round((to - from) / by);
  for (let i = 0; i <= n; i += 1) out.push(from + ((to - from) * i) / n);
  return out;
}

function keyframes(name: string, frames: ReadonlyArray<readonly [string, string]>) {
  const body = frames.map(([at, decl]) => `${at}{${decl}}`).join("");
  return `@keyframes ${name}{${body}}`;
}

interface NodeState {
  readonly slot: number;
  readonly scale: number;
  readonly opacity: number;
}

/** Copy A: slot 1 at step 0, slot 8 at step 7, exit at step 8. */
function stateA(step: number): NodeState {
  const out = smooth(step - 7);
  return { slot: 1 + step, scale: 1 - (1 - SCALE_HIDDEN) * out, opacity: 1 - out };
}

/** Copy B: parked, invisible, at the entry slot until step 7, then entry →
 *  slot 1 while copy A leaves. */
function stateB(step: number): NodeState {
  const inn = smooth(step - 7);
  return {
    slot: Math.max(0, step - 7),
    scale: SCALE_HIDDEN + (1 - SCALE_HIDDEN) * inn,
    opacity: inn,
  };
}

const pointAt = (slot: number): Point => trackPoint(slotLerp(SLOT_ANGLES, slot));

/**
 * A label leaves before its dot and arrives after it: the text is gone in the
 * first 30% of the exit step and appears in the last 30% of the entry step.
 * At the arc's ends the slots bunch up vertically (slot 7 → 8 is 66 su), and a
 * half-faded exiting label otherwise brushes the one above it once the text is
 * held at its px floor on a small stage (measured at 1024 × 768).
 */
const TEXT_FADE_STEPS = 0.3;
const textOpacityA = (step: number) => 1 - smooth((step - 7) / TEXT_FADE_STEPS);
const textOpacityB = (step: number) =>
  smooth((step - 8 + TEXT_FADE_STEPS) / TEXT_FADE_STEPS);

// ------------------------------------------------------------ transforms

/** The node on the track: out from T along angle θ, then turned back upright,
 *  so its contents never rotate. */
function nodeTransform(s: NodeState): string {
  const a = r3(slotLerp(SLOT_ANGLES, s.slot));
  return `translate(${TRACK.x}px,${TRACK.y}px) rotate(${-a}deg) translate(${TRACK.r}px,0px) rotate(${a}deg) scale(${r3(s.scale)})`;
}

function textTransform(slot: number): string {
  return `translate(${r2(slotLerp(TEXT_DX, slot))}px,${r2(slotLerp(TEXT_DY, slot))}px)`;
}

/** A hairline from the dot's ring toward C, stopping `stopR` short of C. The
 *  element is 1 su long, and the transform stretches it, so one keyframe
 *  carries both the aim and the length. */
function threadTransform(p: Point, stopR: number): string {
  const { deg, dist } = towardCore(p);
  const len = Math.max(0, dist - stopR - NODE_RING_R - 2);
  return `translate(${r2(p.x)}px,${r2(p.y)}px) rotate(${r2(deg)}deg) translate(${NODE_RING_R + 2}px,0px) scale(${r2(len)},1)`;
}

const at = (p: Point) => `translate(${r2(p.x)}px,${r2(p.y)}px)`;

// ------------------------------------------------------------ rest frame

/** The rest frame (reduced motion, the paused server frame, and every integer
 *  step): department `i` sits on slot `i + 1`. Each value is the element's
 *  inline `transform`. */
export function restFrame(index: number) {
  const s = stateA(index);
  const p = pointAt(s.slot);
  return {
    node: nodeTransform(s),
    text: textTransform(s.slot),
    thread: threadTransform(p, THREAD_END_R),
    glow: threadTransform(p, CORE_DISC_R),
  };
}

/** Copy B's parked frame: the entry slot, invisible. */
export function parkedFrame() {
  const s = stateB(0);
  return {
    node: nodeTransform(s),
    text: textTransform(s.slot),
    thread: threadTransform(pointAt(s.slot), THREAD_END_R),
  };
}

export const FOCUS_POINT = trackPoint(FOCUS_ANGLE);
export const pinAt = at;

/** The readout shown without motion: 04, the rest frame's next node into the
 *  marker, and the one the t = 0 keyframes already have active. */
export const READOUT_REST_INDEX = 3;

/** Negative delay that puts department `index` on slot `index + 1` at t=0. */
export const delayFor = (index: number) => `${r2(-index * STEP_S)}s`;

// ------------------------------------------------------------- keyframes

type Frame = readonly [string, string];

export function buildNodeKeyframes(): string {
  const wrap = range(7, 8, 1 / WRAP_SAMPLES);
  const aSteps = [...range(0, 7, 1), ...wrap.slice(1)];
  const aNode = aSteps.map((t): Frame => {
    const s = stateA(t);
    return [pct(t), `transform:${nodeTransform(s)};opacity:${r3(s.opacity)}`];
  });
  // Text offsets are linear per segment, so one keyframe per step carries the
  // position; the wrap-step samples carry the early fade.
  const aText = aSteps.map((t): Frame => [
    pct(t),
    `transform:${textTransform(stateA(t).slot)};opacity:${r3(textOpacityA(t))}`,
  ]);
  const threadSteps = range(0, STEPS, 1 / SAMPLES_PER_STEP);
  const aThread = threadSteps.map((t): Frame => {
    const s = stateA(t);
    return [
      pct(t),
      `transform:${threadTransform(pointAt(s.slot), THREAD_END_R)};opacity:${r3(s.opacity)}`,
    ];
  });

  const bSteps = [0, ...wrap];
  const bNode = bSteps.map((t): Frame => {
    const s = stateB(t);
    return [pct(t), `transform:${nodeTransform(s)};opacity:${r3(s.opacity)}`];
  });
  const bText = bSteps.map((t): Frame => [
    pct(t),
    `transform:${textTransform(stateB(t).slot)};opacity:${r3(textOpacityB(t))}`,
  ]);
  const bThread = [0, ...range(7, 8, 1 / SAMPLES_PER_STEP)].map((t): Frame => {
    const s = stateB(t);
    return [
      pct(t),
      `transform:${threadTransform(pointAt(s.slot), THREAD_END_R)};opacity:${r3(s.opacity)}`,
    ];
  });

  return [
    keyframes("zo-node-a", aNode),
    keyframes("zo-text-a", aText),
    keyframes("zo-thread-a", aThread),
    keyframes("zo-node-b", bNode),
    keyframes("zo-text-b", bText),
    keyframes("zo-thread-b", bThread),
  ].join("");
}

/** `prop` 0 → 1 over `inW` steps centred on `on`, and 1 → 0 over `outW`
 *  centred on `off`. */
function rampWindow(prop: string, on: number, off: number, inW: number, outW: number): Frame[] {
  return [
    ["0%", `${prop}:0`],
    [pct(on - inW / 2), `${prop}:0`],
    [pct(on + inW / 2), `${prop}:1`],
    [pct(off - outW / 2), `${prop}:1`],
    [pct(off + outW / 2), `${prop}:0`],
    ["100%", `${prop}:0`],
  ];
}

/**
 * The beat's shared elements. Every crossing happens at the same place and the
 * same phase of a step, only by a different department, so the glow, pulse and
 * ripple are not per department: each is ONE element on a one-step loop (two
 * alternating glows on a two-step loop, because consecutive glows overlap as
 * they cross-fade). That is 5 animations where per-department copies took 24,
 * and every running animation costs main-thread time each frame even on the
 * compositor. `local` is steps since the window's base, in a department's own
 * step time; the delay lines each loop's 0% up with that base.
 */
const GLOW_BASE = ACTIVE_FROM - RAMP_IN / 2;
const GLOW_END = ACTIVE_TO + RAMP_OUT / 2;
const PULSE_BASE = ACTIVE_FROM;

/** Delay so that a `period`-step loop's 0% falls on department `offset`'s
 *  `base`, as a negative delay (the loop is already running at t = 0). */
const loopDelay = (base: number, period: number, offset = 0) => {
  const phase = (((base - offset) % period) + period) % period;
  return `${r2((phase - period) * STEP_S)}s`;
};

export const BEAT_DELAYS = {
  glow: [loopDelay(GLOW_BASE, 2), loopDelay(GLOW_BASE, 2, 1)],
  pulse: loopDelay(PULSE_BASE, 1),
  ripple: loopDelay(CROSS_STEP, 1),
} as const;

/** Where the ripple starts, for its inline (never visible) rest transform. */
export const RIPPLE_REST = nodeTransform(stateA(CROSS_STEP));

export function buildBeatKeyframes(): string {
  const glowOpacity = (t: number) =>
    Math.min(smooth((t - GLOW_BASE) / RAMP_IN), smooth((GLOW_END - t) / RAMP_OUT));
  const glowAt = (t: number, o: number): string =>
    `transform:${threadTransform(pointAt(stateA(t).slot), CORE_DISC_R)};opacity:${r3(o)}`;
  // Every 0.2 step for the aim, plus both ramps' ends and middles: the ramps
  // are shorter than the sampling, and a keyframe list is linear in between.
  const rampPoints = [0, 0.5, 1].flatMap((f) => [
    GLOW_BASE + RAMP_IN * f,
    GLOW_END - RAMP_OUT * f,
  ]);
  const glowSteps = [...range(GLOW_BASE, GLOW_END, 0.2), ...rampPoints]
    .sort((x, y) => x - y)
    .filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-6);
  const glow: Frame[] = [
    ...glowSteps.map((t): Frame => [pct(t - GLOW_BASE, 2), glowAt(t, glowOpacity(t))]),
    ["100%", glowAt(GLOW_END, 0)],
  ];

  // The pulse leaves the dot just after the node wakes and reaches the disc
  // edge as the node crosses the marker.
  const p0 = ACTIVE_FROM + 0.04;
  const p1 = CROSS_STEP - 0.02;
  const pulseAt = (t: number) => {
    const p = pointAt(stateA(t).slot);
    const { dist } = towardCore(p);
    const u = smooth((t - p0) / (p1 - p0));
    const travel = ((dist - CORE_DISC_R - NODE_RING_R) / dist) * u + NODE_RING_R / dist;
    return {
      p: { x: p.x + (CORE.x - p.x) * travel, y: p.y + (CORE.y - p.y) * travel },
      o: r3(Math.min(smooth((t - p0) / 0.04), 1 - smooth((t - p1 + 0.03) / 0.03))),
    };
  };
  const pulse: Frame[] = [
    ["0%", `transform:${at(pulseAt(p0).p)};opacity:0`],
    ...range(p0, p1, 0.05).map((t): Frame => {
      const q = pulseAt(t);
      return [pct(t - PULSE_BASE, 1), `transform:${at(q.p)};opacity:${q.o}`];
    }),
    ["100%", `transform:${at(pulseAt(p1).p)};opacity:0`],
  ];

  // One ripple off the dot as it crosses the marker. The outer element rides
  // with the dot, linearly (the crossing and the ripple's end are both in
  // segment 4 → 5, so one pair of keyframes is exact); the inner one grows
  // and fades about the dot on the ease-out curve.
  const rippleEnd = nodeTransform(stateA(CROSS_STEP + RIPPLE.steps));
  const rippleAt: Frame[] = [
    ["0%", `transform:${RIPPLE_REST}`],
    [pct(RIPPLE.steps, 1), `transform:${rippleEnd}`],
    ["100%", `transform:${rippleEnd}`],
  ];
  const ripple: Frame[] = [
    ["0%", `transform:scale(1);opacity:${RIPPLE.peak};animation-timing-function:${EASE_OUT}`],
    [pct(RIPPLE.steps, 1), `transform:scale(${RIPPLE.scale});opacity:0`],
    ["100%", `transform:scale(${RIPPLE.scale});opacity:0`],
  ];

  return [
    keyframes("zo-glow", glow),
    keyframes("zo-pulse", pulse),
    keyframes("zo-ripple-at", rippleAt),
    keyframes("zo-ripple", ripple),
  ].join("");
}

/**
 * The focus moment's per-department and per-step parts: the role turns cobalt
 * (or, in compact mode, the caption names the department), the marker tints,
 * and the core throws a ring as each pulse lands.
 */
export function buildActiveKeyframes(): string {
  // The cobalt copy of the role, over the grey one.
  const role = rampWindow("opacity", ACTIVE_FROM, ACTIVE_TO, RAMP_IN, RAMP_OUT);
  // Compact mode's readout: the same window, swapped in sequence.
  const readout: Frame[] = [
    ["0%", "opacity:0"],
    [pct(ACTIVE_FROM), "opacity:0"],
    [pct(ACTIVE_FROM + READOUT_SWAP), "opacity:1"],
    [pct(ACTIVE_TO - READOUT_SWAP), "opacity:1"],
    [pct(ACTIVE_TO), "opacity:0"],
    ["100%", "opacity:0"],
  ];

  // Per-step animations (period = one step): the marker tints and the core
  // throws a ring as each pulse lands. Phase 0 of every step is a rest frame,
  // so these line up with the departments without any delay.
  const c = CROSS_STEP - Math.floor(CROSS_STEP);
  const focus: Frame[] = [
    ["0%", "opacity:0"],
    [pct(c - 0.12, 1), "opacity:0"],
    [pct(c, 1), "opacity:1"],
    [pct(c + 0.25, 1), "opacity:0"],
    ["100%", "opacity:0"],
  ];
  const coreRing: Frame[] = [
    ["0%", "transform:scale(1);opacity:0"],
    [pct(c - 0.02, 1), "transform:scale(1);opacity:0"],
    [pct(c, 1), `transform:scale(1);opacity:${CORE_RING.peak};animation-timing-function:${EASE_OUT}`],
    [pct(c + CORE_RING.steps, 1), `transform:scale(${CORE_RING.scale});opacity:0`],
    ["100%", `transform:scale(${CORE_RING.scale});opacity:0`],
  ];

  return [
    keyframes("zo-role", role),
    keyframes("zo-readout", readout),
    keyframes("zo-focus", focus),
    keyframes("zo-core-ring", coreRing),
    keyframes("zo-drift", [
      ["0%", "transform:rotate(0deg)"],
      ["100%", "transform:rotate(-360deg)"],
    ]),
  ].join("");
}
