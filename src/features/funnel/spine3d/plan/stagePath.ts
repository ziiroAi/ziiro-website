// (C) W15-B, re-choreographed by W16-A: the plan's one 3D stage, scrubbed by the scroll. One stage, one WebGL
// context. The owner (wave16.md W16-A):
//   (a) the hero: the full spine on the right, beside the words, at r17's camera;
//   (b) block 2: the dive. It travels left while the camera zooms in on his close-up model and turns a little, and the
//       full spine crossfades into the close-up, timed to the zoom (CROSSFADE);
//   (c) each department stop: the close-up alternates sides, left, then right with a little turn, then left..., and
//       the text takes the other side;
//   (d) the close: it pulls back out to the full spine, on the left, with the text on the right.
// Between keyframes the camera blends on an eased curve of the scroll. Under reduced motion it cuts at each keyframe
// (§11.8). Pure: PlanStage measures the anchors.
import { DISCS, type DiscId } from "../../data/contract";
import { baseFraming, blendFraming, easeInOut, type Framing } from "../camera";
import { CLOSEUP } from "../closeup";
import { GAPS } from "../gaps";
import type { MeshSize } from "../rules";
import type { Variant } from "./targets";
import { END_MARGIN, shiftXFor, shiftYFor, shownTan } from "./tour";
import { add, length, normalize, scale, sub, type Vec3 } from "./vec";

/** Where the model stands across the stage, from the left: the hero's spine right of its words, the close-up left or
 *  right of a section's text, the close's spine left of it. A phone's band keeps the close-up near its middle. */
export const ACROSS: Readonly<Record<Variant, { hero: number; need: number; left: number; right: number; close: number }>> = {
  desktop: { hero: 0.74, need: 0.27, left: 0.27, right: 0.73, close: 0.27 },
  phone: { hero: 0.5, need: 0.5, left: 0.4, right: 0.6, close: 0.5 },
};
/** How much of the model (LOOK units) the stage shows top to bottom at the close-up: all of it, its top plate and its
 *  cut base, with a little room at the top. Its vertebrae are about twice the full spine's, so this reads as a zoom in. */
export const CLOSEUP_HEIGHT = 0.85;
/** Where the camera aims on the close-up: the middle of the whole model on screen, which sits this far below its
 *  middle vertebra's centre (the top plate is short, the cut base long). By eye on the W16-A strips. */
const CLOSEUP_DROP = 0.11;
export const CLOSEUP_AIM: Vec3 = [CLOSEUP.pivot[0], CLOSEUP.pivot[1] - CLOSEUP_DROP, CLOSEUP.pivot[2]];
const DEG = Math.PI / 180;
/** The little turn of the model (added to its yaw) at block 2, and at each department with the close-up on the right. */
export const TURN = { need: -12 * DEG, left: 0, right: 18 * DEG } as const;
/** The crossfade between the full spine and the close-up, as a share of a travel's eased progress: it starts once the
 *  zoom is under way and is done before the camera arrives (W16-A: "a crossfade/dissolve timed to the zoom"). */
export const CROSSFADE = { from: 0.35, to: 0.8 } as const;

/** Which side of the stage department i's close-up stands on: left first, then alternating. */
export const closeupSide = (i: number): "left" | "right" => (i % 2 === 0 ? "left" : "right");

export interface StageKey {
  framing: Framing;
  /** 1 turns the model to its side view and stops the idle sway; 0 lets it sway. */
  hold: number;
  stop: DiscId | null;
  /** Where the model stands across the stage: the still (no 3D) follows it with a slide. */
  across: number;
  /** 0 shows the full spine, 1 the close-up, between them a dissolve. */
  closeup: number;
  /** A turn about the column added to the model's yaw, in radians. */
  turn: number;
}

/** A keyframe and the scroll position (window.scrollY) where the stage reaches it. The same key twice in a row holds
 *  it still between the two. */
export interface StageAnchor {
  at: number;
  key: StageKey;
}

const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t));
const FIRST = GAPS[0].centre;
const LAST = GAPS[GAPS.length - 1].centre;
const MIDDLE = mix3(FIRST, LAST, 0.5);
/** The whole spine with its end vertebrae. */
const WHOLE = length(sub(LAST, FIRST)) + 2 * END_MARGIN;

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

/**
 * The stage's keyframes on its canvas, in scroll order: hero, block 2, one per department, the close. On desktop the
 * hero is r17's own camera, the frame the still and the viewer's first draw show; a phone's band shows the whole
 * spine. Block 2 and the stops frame the close-up, which needs no legend strip below it.
 */
export function stageKeys(
  discs: readonly DiscId[],
  size: MeshSize,
  variant: Variant,
  view: { width: number; height: number },
  stripPx: number,
): StageKey[] {
  const across = ACROSS[variant];
  const share = stripShare(view, stripPx);
  const tan = shownTan(size, baseFraming(size).lensMm, view);
  const wholeAt = (at: number): Framing => framingAt(MIDDLE, WHOLE / (1 - share) / (2 * tan), at, size, view, share);
  const closeAt = (at: number): Framing => framingAt(CLOSEUP_AIM, CLOSEUP_HEIGHT / (2 * tan), at, size, view, 0);
  const hero: StageKey = {
    framing: variant === "desktop" ? baseFraming(size) : wholeAt(across.hero),
    hold: 0, stop: null, across: across.hero, closeup: 0, turn: 0,
  };
  const need: StageKey = { framing: closeAt(across.need), hold: 1, stop: null, across: across.need, closeup: 1, turn: TURN.need };
  const stops = discs.map((disc, i): StageKey => {
    const side = closeupSide(i);
    return { framing: closeAt(across[side]), hold: 1, stop: disc, across: across[side], closeup: 1, turn: TURN[side] };
  });
  const close: StageKey = { framing: wholeAt(across.close), hold: 0, stop: null, across: across.close, closeup: 0, turn: 0 };
  return [hero, need, ...stops, close];
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

/** Words in the left column show from where the model stands at WORDS_LEFT_FROM (none) to WORDS_LEFT_FULL_AT (all):
 *  the close-up's left edge, about 0.1 left of that, is then clear of the 46 % column (W16-A). */
export const WORDS_LEFT_FROM = 0.55;
export const WORDS_LEFT_FULL_AT = 0.6;

/** How much of a left-column section's words show, 0 to 1: they wait for the close-up to reach the right. Always on a
 *  phone. */
export function wordsLeftOpacity(across: number, variant: Variant): number {
  if (variant === "phone") return 1;
  return clamp01((across - WORDS_LEFT_FROM) / (WORDS_LEFT_FULL_AT - WORDS_LEFT_FROM));
}

/** The legend comes back from LEGEND_BACK_FROM (none) to LEGEND_BACK_FULL_AT (all) of the stage's width: after block
 *  2's words are fully in, and far enough left that its right edge stays out of their column (W15-B4 M1). */
export const LEGEND_BACK_FROM = NEED_WORDS_FULL_AT;
export const LEGEND_BACK_FULL_AT = 0.35;

/** How much of the legend shows, 0 to 1: under the full spine on the hero, gone while it travels past block 2's rising
 *  words, back under it on the left, and gone over the close-up (its discs aren't the legend's). Always on a phone,
 *  whose band sits clear of the text. */
export function legendOpacity(across: number, variant: Variant, closeup: number): number {
  if (variant === "phone") return 1;
  const back = clamp01((LEGEND_BACK_FROM - across) / (LEGEND_BACK_FROM - LEGEND_BACK_FULL_AT));
  return Math.max(heroWordsOpacity(across, variant), back) * (1 - closeup);
}

/** Over this share of the screen, as the plan's end rises past the screen's bottom, the stage's legend leaves. */
export const LEAVE_SHARE = 0.25;

/** How much of the stage's small print shows at the end of the plan, 0 to 1: all of it while the stage is stuck (the
 *  plan's end at or below the screen's bottom), none once the end has risen LEAVE_SHARE of the screen, so the legend
 *  never stays at the bottom of the plan over the footer's top with no spine above it (worker-4's W15-S LOW 3). */
export function stageShown(endOnScreen: number, screenHeight: number): number {
  return clamp01(1 - (screenHeight - endOnScreen) / (screenHeight * LEAVE_SHARE));
}

/** How far a travel's crossfade has gone, 0 to 1, at its eased progress e: smooth at both ends of its window. */
function fadeAt(e: number): number {
  const t = clamp01((e - CROSSFADE.from) / (CROSSFADE.to - CROSSFADE.from));
  return t * t * (3 - 2 * t);
}

/**
 * Where the stage is at a scroll position: on a keyframe at its anchor, blended between two on an eased curve, the
 * crossfade inside its window of that curve. Under reduced motion it holds each keyframe until the next travel starts
 * and cuts. Before anything is measured it shows `fallback`.
 */
export function stageAt(anchors: readonly StageAnchor[], scrollY: number, reducedMotion: boolean, fallback: StageKey): StageKey {
  if (anchors.length === 0) return fallback;
  const next = anchors.findIndex((anchor) => anchor.at > scrollY);
  if (next === 0) return anchors[0].key;
  if (next === -1) return anchors[anchors.length - 1].key;
  const from = anchors[next - 1];
  const to = anchors[next];
  if (from.key === to.key) return from.key;
  // Under reduced motion it cuts as the travel starts, so the model is already where the next section's words need
  // it gone from before they rise (W15-B4 M3).
  if (reducedMotion) return to.key;
  const e = easeInOut(clamp01((scrollY - from.at) / Math.max(to.at - from.at, 1)));
  const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
  return {
    framing: blendFraming(from.key.framing, to.key.framing, e),
    hold: mix(from.key.hold, to.key.hold, e),
    stop: from.key.stop,
    across: mix(from.key.across, to.key.across, e),
    closeup: mix(from.key.closeup, to.key.closeup, fadeAt(e)),
    turn: mix(from.key.turn, to.key.turn, e),
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
