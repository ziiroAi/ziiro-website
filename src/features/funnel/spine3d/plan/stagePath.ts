// (C) W15-B: the plan's one 3D stage, scrubbed by the scroll (wave15.md item 5, the owner: "when i scroll down, the big
// spine is not transitioning"). One spine, one WebGL context, fixed behind the plan. Its keyframes:
//   (a) the hero: the whole spine on the right, beside the words;
//   (b) block 2, "you need only {n}": it travels to the left and the camera starts zooming in;
//   (c) each department stop: in to that disc, still on the left, the model holding its side view (W14-X);
//   (d) the close: it pulls back.
// Between keyframes the camera blends on an eased curve of the scroll, with a pull-back to the whole spine between two
// stops (D30). Under reduced motion it cuts at each keyframe (§11.8). Pure: PlanStage measures the anchors.
import { DISCS, type DiscId } from "../../data/contract";
import { baseFraming, blendFraming, easeInOut, type Framing } from "../camera";
import { GAPS } from "../gaps";
import type { MeshSize } from "../rules";
import type { Variant } from "./targets";
import { END_MARGIN, shiftXFor, shiftYFor, shownTan, STOP_ACROSS, STOP_HEIGHT } from "./tour";
import { add, length, normalize, scale, sub, type Vec3 } from "./vec";

/** Where the spine stands across the stage, from the left: right of the hero's words, then left of the text column. */
export const ACROSS: Readonly<Record<Variant, { hero: number; left: number }>> = {
  desktop: { hero: 0.74, left: 0.27 },
  phone: { hero: 0.5, left: 0.5 },
};
/** Block 2's zoom on the hero, on screen (W15-B2): the owner asked for "a transition and zoom-in effect to the left
 *  side", and reads a subtle change as none, so block 2 shows the spine half as big again as the hero does. */
export const NEED_ZOOM = 1.5;
/** Each stop comes at least this much closer than block 2: a further step in on desktop. The phone band is already
 *  close at block 2, so there a stop only keeps that size. */
export const STOP_STEP: Readonly<Record<Variant, number>> = { desktop: 1.2, phone: 1 };

/** What a keyframe looks at: a point on the spine, how much of the model fills the stage, and where across it sits.
 *  `hold` 1 turns the model to its side view and stops the idle spin; 0 lets it spin. */
export interface StageAim {
  centre: Vec3;
  height: number;
  across: number;
  hold: number;
  stop: DiscId | null;
}

export interface StageKey {
  framing: Framing;
  hold: number;
  stop: DiscId | null;
  /** Where the spine stands across the stage: the still (no 3D) follows it with a slide. */
  across: number;
}

/** A keyframe and the scroll position (window.scrollY) where the stage reaches it. The same key twice in a row holds
 *  it still between the two. */
export interface StageAnchor {
  at: number;
  key: StageKey;
}

const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t));
const centreOf = (disc: DiscId): Vec3 => GAPS[DISCS.indexOf(disc)].centre;
const FIRST = GAPS[0].centre;
const LAST = GAPS[GAPS.length - 1].centre;
const MIDDLE = mix3(FIRST, LAST, 0.5);
/** The whole spine with its end vertebrae. */
const WHOLE = length(sub(LAST, FIRST)) + 2 * END_MARGIN;

const whole = (across: number, hold: number, height = WHOLE): StageAim => ({ centre: MIDDLE, height, across, hold, stop: null });
/** The middle of the plan's lit discs, where block 2 aims: the spine's middle when there are none. */
const litCentre = (discs: readonly DiscId[]): Vec3 =>
  discs.length === 0 ? MIDDLE : scale(discs.map(centreOf).reduce((sum, c) => add(sum, c)), 1 / discs.length);

/** The keyframes in scroll order: hero, block 2, one per stop, the close. */
export function stageAims(discs: readonly DiscId[], size: MeshSize, variant: Variant): StageAim[] {
  const { hero, left } = ACROSS[variant];
  const stopAcross = variant === "desktop" ? left : STOP_ACROSS[size];
  return [
    whole(hero, 0),
    { centre: litCentre(discs), height: WHOLE / NEED_ZOOM, across: left, hold: 0, stop: null },
    ...discs.map((disc): StageAim => ({ centre: centreOf(disc), height: STOP_HEIGHT[size], across: stopAcross, hold: 1, stop: disc })),
    whole(left, 0),
  ];
}

/** The pull-back between two stops (D30): the whole spine where the stops stand, still in its side view. */
export const pulledAim = (size: MeshSize, variant: Variant): StageAim =>
  whole(variant === "desktop" ? ACROSS.desktop.left : STOP_ACROSS[size], 1);

/**
 * An aim as a camera on the stage's real canvas, as tour.ts's tourFraming does it: r17's view direction, roll and lens,
 * the aim's point `across` the canvas and in the middle of the height above the legend strip. A whole-spine aim fits
 * above that strip.
 */
export function aimFraming(aim: StageAim, size: MeshSize, view: { width: number; height: number }, stripPx: number): Framing {
  const base = baseFraming(size);
  const share = stripShare(view, stripPx);
  const height = aim.stop ? aim.height : aim.height / (1 - share);
  return framingAt(aim.centre, height / (2 * shownTan(size, base.lensMm, view)), aim.across, size, view, share);
}

const stripShare = (view: { width: number; height: number }, stripPx: number): number =>
  (view.height > 0 ? Math.min(0.5, stripPx / view.height) : 0);

/** r17's view direction, roll and lens, `distance` back from `centre`, which sits `across` the canvas and in the middle
 *  of the height above the legend strip. */
function framingAt(centre: Vec3, distance: number, across: number, size: MeshSize, view: { width: number; height: number }, share: number): Framing {
  const base = baseFraming(size);
  const back = normalize(sub(base.position, base.target));
  return {
    ...base,
    target: centre,
    position: add(centre, scale(back, distance)),
    shift: [shiftXFor(size, view, across), shiftYFor(size, view, (1 - share) / 2)],
  };
}

const keyOf = (aim: StageAim, size: MeshSize, view: { width: number; height: number }, stripPx: number): StageKey =>
  ({ framing: aimFraming(aim, size, view, stripPx), hold: aim.hold, stop: aim.stop, across: aim.across });

/**
 * The stage's keyframes on its canvas, and the pull-back between stops. On desktop the hero is r17's own camera ("as
 * now"), the frame the still and the viewer's first draw show; a phone's band shows the whole spine (PlanStage eases
 * there from r17's crop when the 3D arrives). Block 2 comes NEED_ZOOM times closer than the hero, on the lit discs,
 * so the slide left and the zoom in are one move (W15-B2).
 */
export function stageKeys(
  discs: readonly DiscId[],
  size: MeshSize,
  variant: Variant,
  view: { width: number; height: number },
  stripPx: number,
): { keys: StageKey[]; pulled: StageKey } {
  const [heroAim, needAim, ...rest] = stageAims(discs, size, variant);
  // A phone's band shows the whole spine: from r17's close crop a 1.5 x zoom left two vertebrae in 390 px (W15-B2).
  const hero: StageKey = variant === "desktop"
    ? { framing: baseFraming(size), hold: heroAim.hold, stop: null, across: heroAim.across }
    : keyOf(heroAim, size, view, stripPx);
  const needDistance = length(sub(hero.framing.position, hero.framing.target)) / NEED_ZOOM;
  const need: StageKey = {
    framing: framingAt(needAim.centre, needDistance, needAim.across, size, view, stripShare(view, stripPx)),
    hold: needAim.hold, stop: null, across: needAim.across,
  };
  const stopDistance = needDistance / STOP_STEP[variant];
  const closer = (aim: StageAim): StageKey => {
    const key = keyOf(aim, size, view, stripPx);
    const { position, target } = key.framing;
    if (!aim.stop || length(sub(position, target)) <= stopDistance) return key;
    return { ...key, framing: framingAt(aim.centre, stopDistance, aim.across, size, view, stripShare(view, stripPx)) };
  };
  return {
    keys: [hero, need, ...rest.map(closer)],
    pulled: keyOf(pulledAim(size, variant), size, view, stripPx),
  };
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** W15-B3: the hero's left column (words and stats) is gone once the spine stands this far across on its way left. The
 *  spine is about a fifth of the stage wide, so its left edge is still clear of the 55 % column then. */
export const HERO_WORDS_GONE_AT = 0.62;

/**
 * How much of the hero's left column shows, 0 to 1, for where the spine stands: all of it in the hero, fading over the
 * start of the travel left, so the spine never crosses its words or stats (the manager's eye, W15-B2 strip at 8-16 %).
 * On a phone the band sits between the words and the text, so they always show.
 */
export function heroWordsOpacity(across: number, variant: Variant): number {
  if (variant === "phone") return 1;
  return clamp01((across - HERO_WORDS_GONE_AT) / (ACROSS.desktop.hero - HERO_WORDS_GONE_AT));
}

/** Block 2's words show from where the spine stands at NEED_WORDS_FROM (none) to NEED_WORDS_FULL_AT (all): its right
 *  edge, about 0.12 right of that, is then clear of the 46 % column's text (from about 0.57 of the width). */
export const NEED_WORDS_FROM = 0.45;
export const NEED_WORDS_FULL_AT = 0.4;

/** How much of block 2's words show, 0 to 1: they enter at the bottom right while the spine is still leaving the right,
 *  so they wait for it to clear their column (W15-B3). Always on a phone. */
export function needWordsOpacity(across: number, variant: Variant): number {
  if (variant === "phone") return 1;
  return clamp01((NEED_WORDS_FROM - across) / (NEED_WORDS_FROM - NEED_WORDS_FULL_AT));
}

/**
 * Where the stage is at a scroll position: on a keyframe at its anchor, blended between two on an eased curve, with
 * a pull-back between two stops. Under reduced motion it holds each keyframe until the next anchor and cuts.
 */
export function stageAt(anchors: readonly StageAnchor[], scrollY: number, reducedMotion: boolean, pulled: StageKey): StageKey {
  if (anchors.length === 0) return pulled;
  const next = anchors.findIndex((anchor) => anchor.at > scrollY);
  if (next === 0) return anchors[0].key;
  if (next === -1) return anchors[anchors.length - 1].key;
  const from = anchors[next - 1];
  const to = anchors[next];
  if (reducedMotion || from.key === to.key) return from.key;
  const t = clamp01((scrollY - from.at) / Math.max(to.at - from.at, 1));
  if (from.key.stop && to.key.stop) {
    const framing = t < 0.5
      ? blendFraming(from.key.framing, pulled.framing, easeInOut(t * 2))
      : blendFraming(pulled.framing, to.key.framing, easeInOut(t * 2 - 1));
    return { framing, hold: 1, stop: from.key.stop, across: from.key.across };
  }
  const e = easeInOut(t);
  return {
    framing: blendFraming(from.key.framing, to.key.framing, e),
    hold: from.key.hold + (to.key.hold - from.key.hold) * e,
    stop: from.key.stop,
    across: from.key.across + (to.key.across - from.key.across) * e,
  };
}

/** A section's top and bottom in page px (window.scrollY + its rect). */
export interface Span {
  top: number;
  bottom: number;
}

/**
 * The scroll anchors for the keyframes: the hero's from the top of the page, then one per section after it (block 2,
 * each stop, the close). A keyframe is reached as its section's top meets the reading line (`line` px from the top of
 * the screen) and held until `travel` px of scroll before the next one's, so the camera rests while a section is read
 * and moves over the last `travel` px. Anchors never run backwards.
 */
export function stageAnchors(keys: readonly StageKey[], spans: readonly Span[], line: number, travel: number): StageAnchor[] {
  const count = Math.min(spans.length, keys.length - 1);
  const arrivals = spans.slice(0, count).map((span) => span.top - line);
  const anchors: StageAnchor[] = [];
  const push = (at: number, key: StageKey) => anchors.push({ at: Math.max(at, anchors.at(-1)?.at ?? 0), key });
  push(0, keys[0]);
  arrivals.forEach((arrival, i) => {
    push(arrival - travel, keys[i]);
    push(arrival, keys[i + 1]);
  });
  return anchors;
}
