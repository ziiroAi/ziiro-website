// (C) W15-B, re-choreographed by W16-A and W17-S: the plan's one 3D stage, scrubbed by the scroll. One stage, one
// WebGL context, one model: the big spine (wave17.md, the owner: "we don't require the smaller bone ... the scrolling
// effects from left to right, alternating left-right, can be done by the longer vertebra only").
//   (a) the hero: the full spine on the right, beside the words, at r17's camera;
//   (b) block 2: it travels left and the camera zooms in a little on the lit discs (W15-B2);
//   (c) each department stop: the camera zooms in on that department's disc, 2-3 vertebrae around it, and the spine
//       turns so that disc's glowing front faces the stop's text (W18-D, facing.ts), the short way round; the stops
//       alternate sides, left first, and the text takes the other side;
//   (d) the close: it pulls back out to the whole spine, on the left, with the text on the right.
// Between keyframes the camera blends on an eased curve of the scroll. Under reduced motion it cuts at each keyframe
// (§11.8). Pure: PlanStage measures the anchors.
import { DISCS, type DiscId } from "../../data/contract";
import { baseFraming, blendFraming, type Framing } from "../camera";
import { GAPS } from "../gaps";
import type { MeshSize } from "../rules";
import { faceTurn, nearestTurn, turnedCentre } from "./facing";
import type { Variant } from "./targets";
import { END_MARGIN, shiftXFor, shiftYFor, shownTan } from "./tour";
import { add, length, normalize, scale, sub, type Vec3 } from "./vec";

/** Where the spine stands across the stage, from the left: right of the hero's words, left of block 2's, left or right
 *  of a department's text, left of the close's. A zoomed stop's disc stands a little in from either edge: its processes
 *  reach about 0.24 of the width to its left, its body about 0.14 to its right (W17-S strips). W19 r2: m5 reaches about
 *  0.23 of the width outwards (away from the words) and 0.10 inwards at either stop, so the right stop stands at 0.66
 *  and the spine never meets the screen's edge. A phone's band keeps it
 *  near its middle. */
export const ACROSS: Readonly<Record<Variant, { hero: number; need: number; left: number; right: number; close: number }>> = {
  desktop: { hero: 0.74, need: 0.27, left: 0.32, right: 0.66, close: 0.27 },
  phone: { hero: 0.5, need: 0.5, left: 0.4, right: 0.6, close: 0.5 },
};
/** Block 2's zoom on the hero (W15-B2): the owner reads a subtle change as none, so it shows the spine half as big
 *  again as the hero does, aimed at the lit discs. */
export const NEED_ZOOM = 1.5;
/** How much of the spine (LOOK units) a department stop shows top to bottom: about three and a third vertebrae (each
 *  about 0.12), so the stop's disc sits in the middle with 2-3 vertebrae round it, the size the owner liked on the
 *  close-up; that is about 1.6x closer than block 2, so the zoom reads as a move (W16-R's bar). A phone's band is
 *  shorter, so it shows a little more. */
export const STOP_VIEW_HEIGHT: Readonly<Record<MeshSize, number>> = { desktop: 0.4, phone: 0.6 };

/**
 * W20-STOPS: how far each disc's vertebrae reach outwards, toward the screen's edge, at its stop's turn: LOOK units in
 * the disc's screen plane, at a left stop and at a right stop, for views STOP_REACH_ZOOMS times STOP_VIEW_HEIGHT.desktop
 * tall (a pulled-back view takes in more vertebrae). Measured on m5b's desktop mesh by worker-4's W20 script (each
 * disc's own faceTurn, the desktop camera, no roll); a new mesh needs it measured again.
 */
export const STOP_REACH_ZOOMS = [1, 1.25, 1.5, 2] as const;
export const STOP_REACH: readonly { left: readonly number[]; right: readonly number[] }[] = [
  { left: [0.1505, 0.1557, 0.1594, 0.1644], right: [0.1677, 0.1741, 0.1788, 0.185] },
  { left: [0.1858, 0.1861, 0.1865, 0.187], right: [0.1677, 0.1728, 0.1764, 0.1814] },
  { left: [0.2175, 0.2161, 0.2122, 0.2077], right: [0.1712, 0.1747, 0.1772, 0.1806] },
  { left: [0.1772, 0.1902, 0.1872, 0.2095], right: [0.1916, 0.188, 0.1861, 0.184] },
  { left: [0.1607, 0.1701, 0.172, 0.1792], right: [0.1727, 0.1643, 0.1702, 0.1993] },
  { left: [0.1563, 0.162, 0.1638, 0.168], right: [0.2114, 0.2131, 0.2111, 0.2144] },
  { left: [0.1588, 0.1616, 0.1634, 0.1661], right: [0.2306, 0.232, 0.2436, 0.2573] },
  { left: [0.1696, 0.1716, 0.172, 0.173], right: [0.2143, 0.2557, 0.2668, 0.2736] },
  { left: [0.1587, 0.159, 0.171, 0.171], right: [0.1963, 0.2279, 0.2341, 0.297] },
];
/** The share of the width a stop's outermost bone stays in from the screen's edge. The table runs about a tenth short
 *  of the render on the left (the camera's roll, the next vertebra down): at 1024 x 768 the guest's Back Office reached
 *  the edge (review-w20 F6), and the reviewed plans' 1440 stops keep more than this. */
export const EDGE_PAD = 0.04;

/** Disc k's outward reach at a stop shown `zoom` times further out than STOP_VIEW_HEIGHT: the table's most at or below
 *  that zoom, in a line between its rows, held past the last. */
export function stopReach(k: number, side: "left" | "right", zoom: number): number {
  const row = STOP_REACH[k][side].map((_, i, all) => Math.max(...all.slice(0, i + 1)));
  const z = STOP_REACH_ZOOMS;
  if (zoom <= z[0]) return row[0];
  for (let i = 1; i < z.length; i += 1) {
    if (zoom <= z[i]) return row[i - 1] + ((row[i] - row[i - 1]) * (zoom - z[i - 1])) / (z[i] - z[i - 1]);
  }
  return row[row.length - 1];
}

const MAX_ZOOM_OUT = 4;
const SEARCH_STEPS = 48;

/**
 * How many times further out than STOP_VIEW_HEIGHT a desktop-mesh stop shows, so its disc's vertebrae stay EDGE_PAD
 * inside the screen's edge on their side (review-w20 F1, F3: the 768 / 820 band; F6: 1024's left stop): 1 wherever they
 * already fit, as at 1440, else the least zoom that fits (a search; the reach only grows with the zoom).
 */
export function stopZoomOut(k: number, side: "left" | "right", across: number, view: { width: number; height: number }): number {
  if (view.width <= 0 || view.height <= 0) return 1;
  const room = ((side === "left" ? across : 1 - across) - EDGE_PAD) * STOP_VIEW_HEIGHT.desktop * (view.width / view.height);
  const fits = (zoom: number) => stopReach(k, side, zoom) <= room * zoom;
  if (fits(1)) return 1;
  if (room <= 0 || !fits(MAX_ZOOM_OUT)) return MAX_ZOOM_OUT;
  let lo = 1;
  let hi = MAX_ZOOM_OUT;
  for (let i = 0; i < SEARCH_STEPS; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Which side of the stage department i's stop stands on: left first, then alternating. */
export const stopSide = (i: number): "left" | "right" => (i % 2 === 0 ? "left" : "right");

export interface StageKey {
  framing: Framing;
  /** 1 turns the model to its side view and stops the idle sway; 0 lets it sway. */
  hold: number;
  stop: DiscId | null;
  /** Where the model stands across the stage: the still (no 3D) follows it with a slide. */
  across: number;
  /** 1 at a zoomed department stop, 0 on the whole spine: the whole spine's overlay and legend leave as it rises. */
  zoomed: number;
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

const centreOf = (disc: DiscId): Vec3 => GAPS[DISCS.indexOf(disc)].centre;
/** The middle of the plan's lit discs, where block 2 aims: the spine's middle when there are none. */
const litCentre = (discs: readonly DiscId[]): Vec3 =>
  discs.length === 0 ? MIDDLE : scale(discs.map(centreOf).reduce((sum, c) => add(sum, c)), 1 / discs.length);

/**
 * The stage's keyframes on its canvas, in scroll order: hero, block 2, one per department, the close. On desktop the
 * hero is r17's own camera, the frame the still and the viewer's first draw show; a phone's band shows the whole
 * spine. Block 2 comes NEED_ZOOM times closer than the hero, on the lit discs. Each stop aims at its own disc and
 * shows STOP_VIEW_HEIGHT of the spine, with no legend strip below it.
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
  const hero: StageKey = {
    framing: variant === "desktop" ? baseFraming(size) : wholeAt(across.hero),
    hold: 0, stop: null, across: across.hero, zoomed: 0, turn: 0,
  };
  const heroDistance = length(sub(hero.framing.position, hero.framing.target));
  const need: StageKey = {
    framing: framingAt(litCentre(discs), heroDistance / NEED_ZOOM, across.need, size, view, share),
    hold: 0, stop: null, across: across.need, zoomed: 0, turn: 0,
  };
  const stopDistance = STOP_VIEW_HEIGHT[size] / (2 * tan);
  let previous = need.turn;
  const stops = discs.map((disc, i): StageKey => {
    const side = stopSide(i);
    const turn = nearestTurn(faceTurn(DISCS.indexOf(disc), side, size), previous);
    previous = turn;
    const zoomOut = size === "desktop" ? stopZoomOut(DISCS.indexOf(disc), side, across[side], view) : 1;
    return {
      framing: framingAt(turnedCentre(centreOf(disc), turn), stopDistance * zoomOut, across[side], size, view, 0),
      hold: 1, stop: disc, across: across[side], zoomed: 1, turn,
    };
  });
  const close: StageKey = {
    framing: wholeAt(across.close), hold: 0, stop: null, across: across.close, zoomed: 0, turn: nearestTurn(0, previous),
  };
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
export const NEED_WORDS_FROM = 0.38;
export const NEED_WORDS_FULL_AT = 0.32;

/** How much of block 2's words show, 0 to 1: they enter at the bottom right while the spine is still leaving the right,
 *  so they wait for it to clear their column (W15-B3). Always on a phone. */
export function needWordsOpacity(across: number, variant: Variant): number {
  if (variant === "phone") return 1;
  return clamp01((NEED_WORDS_FROM - across) / (NEED_WORDS_FROM - NEED_WORDS_FULL_AT));
}

/** Words in the left column show from where the model stands at WORDS_LEFT_FROM (none) to WORDS_LEFT_FULL_AT (all):
 *  the zoomed spine's inner edge, about 0.11 left of that on m5 (W19 r2; 0.24 on m4), is then clear of the column's
 *  text, which ends at 43 % (W16-A, W17-S). Full by the right stop's 0.66, so no section's words sit half faded in the
 *  page (axe, S9). */
export const WORDS_LEFT_FROM = 0.58;
export const WORDS_LEFT_FULL_AT = 0.64;

/** How much of a left-column section's words show, 0 to 1: they wait for the spine to reach the right. Always on a
 *  phone. */
export function wordsLeftOpacity(across: number, variant: Variant): number {
  if (variant === "phone") return 1;
  return clamp01((across - WORDS_LEFT_FROM) / (WORDS_LEFT_FULL_AT - WORDS_LEFT_FROM));
}

/** The legend comes back from LEGEND_BACK_FROM (none) to LEGEND_BACK_FULL_AT (all) of the stage's width: after block
 *  2's words are fully in, and far enough left that its right edge stays out of their column (W15-B4 M1). */
export const LEGEND_BACK_FROM = NEED_WORDS_FULL_AT;
export const LEGEND_BACK_FULL_AT = 0.3;

/** How much of the legend shows, 0 to 1: under the full spine on the hero, gone while it travels past block 2's rising
 *  words, back under it on the left, and gone at a zoomed department stop (it names the whole spine's discs). Always on a phone,
 *  whose band sits clear of the text. */
export function legendOpacity(across: number, variant: Variant, zoomed: number): number {
  if (variant === "phone") return 1;
  const back = clamp01((LEGEND_BACK_FROM - across) / (LEGEND_BACK_FROM - LEGEND_BACK_FULL_AT));
  return Math.max(heroWordsOpacity(across, variant), back) * (1 - zoomed);
}

/** Over this share of the screen, as the plan's end rises past the screen's bottom, the stage's legend leaves. */
export const LEAVE_SHARE = 0.25;

/** How much of the stage's small print shows at the end of the plan, 0 to 1: all of it while the stage is stuck (the
 *  plan's end at or below the screen's bottom), none once the end has risen LEAVE_SHARE of the screen, so the legend
 *  never stays at the bottom of the plan over the footer's top with no spine above it (worker-4's W15-S LOW 3). */
export function stageShown(endOnScreen: number, screenHeight: number): number {
  return clamp01(1 - (screenHeight - endOnScreen) / (screenHeight * LEAVE_SHARE));
}

/** W20-STOPS: a tablet's band (the phone layout on the desktop mesh) is taller than the scroll left under the plan, so
 *  it rides up under the nav with the plan's end (review-w20 F2, F4). Its spine fades out over this share of the band's
 *  height of scroll before the band starts to leave. */
export const BAND_LEAVE_SHARE = 0.15;

/** How much of a tablet band's spine shows at this scroll, 1 to 0: `leaveAt` is the scroll where the band starts to
 *  leave (unmeasured: never), `height` the band's. */
export function bandShown(scrollY: number, leaveAt: number, height: number): number {
  if (height <= 0 || !Number.isFinite(leaveAt)) return 1;
  return clamp01((leaveAt - scrollY) / (height * BAND_LEAVE_SHARE));
}

/** W20-STOPS: on a tablet's band, the close lands at least this share of the screen before its spine starts to fade,
 *  so it rests whole on screen a while (its full-screen pull-back would land as the band leaves). */
export const CLOSE_REST_SHARE = 0.25;

/** The scroll by which the close must have landed, for a tablet's band (see bandShown); never without one. */
export function closeBy(band: { leaveAt: number; height: number }, screenHeight: number): number {
  if (band.height <= 0 || !Number.isFinite(band.leaveAt)) return Number.POSITIVE_INFINITY;
  return band.leaveAt - band.height * BAND_LEAVE_SHARE - screenHeight * CLOSE_REST_SHARE;
}

/** The stage's ease: smoothstep, whose steepest point is 1.5x its average, so a travel never snaps at normal scroll
 *  speed (W16-R: the cubic ease's 3x let the dive pass in about 50 ms). */
const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Where the stage is at a scroll position: on a keyframe at its anchor, blended between two on an eased curve. Under reduced motion it holds each keyframe until the next travel starts
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
  const e = smooth(clamp01((scrollY - from.at) / Math.max(to.at - from.at, 1)));
  const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
  return {
    framing: blendFraming(from.key.framing, to.key.framing, e),
    hold: mix(from.key.hold, to.key.hold, e),
    stop: from.key.stop,
    across: mix(from.key.across, to.key.across, e),
    zoomed: mix(from.key.zoomed, to.key.zoomed, e),
    turn: mix(from.key.turn, to.key.turn, e),
  };
}

/** How far each travel runs, as shares of the screen's height: `travel` into each department and out to the close,
 *  `hero` from the hero into block 2, `min`, the least any travel may run, and `heroRest`, the least scroll the hero
 *  holds before it sets off. desktop: W17-S's one-screen-scale zoom with the hero's own half screen. phone: half a
 *  screen each, never less (W18-E, review-w17 N2), so the zooms read as moves rather than snaps; and a tenth of a
 *  screen's rest, since reduced motion cuts at a travel's start and a start at 0 cut the hero away at once. `close`,
 *  the pull-back out to the whole spine: a full screen on both (final review L1: it ran 0.47 / 0.71 of one). */
export const TRAVEL: Readonly<Record<Variant, { travel: number; hero: number; min: number; heroRest: number; close: number }>> = {
  desktop: { travel: 0.75, hero: 0.5, min: 0, heroRest: 0, close: 1 },
  phone: { travel: 0.5, hero: 0.5, min: 0.5, heroRest: 0.1, close: 1 },
};

/** The hero's scroll cue fades over the first CUE_FADE_PX of scroll: it has done its job once the visitor scrolls, and
 *  the lowest callout, which moves with the spine, reached it by 144 px on desktop (W18-E, review-w17 N1). */
export const CUE_FADE_PX = 64;

/** How much of the hero's scroll cue shows at this scroll position, 1 at the top of the page to 0. */
export const scrollCueOpacity = (scrollY: number): number => clamp01(1 - scrollY / CUE_FADE_PX);

/** A section's top and bottom in page px (window.scrollY + its rect). */
export interface Span {
  top: number;
  bottom: number;
}

/** A travel takes at most this share of the scroll between two arrivals, so every keyframe rests while its section is
 *  read even where the sections are shorter than the travel (W17-S: the plan's run about 800-940 px on desktop). */
export const MAX_TRAVEL_OF_GAP = 0.8;

/**
 * The scroll anchors for the keyframes: the hero's from the top of the page, then one per section after it (block 2,
 * each stop, the close). A keyframe is reached as its section's top meets the reading line (`line` px from the top of
 * the screen) and held until `travel` px of scroll before the next one's, so the camera rests while a section is read
 * and moves over the last `travel` px. The travel from the hero into block 2 takes `heroTravel` px instead (W17-S:
 * block 2 arrives about half a screen down, so a screen's travel would leave the hero no rest). No travel is shorter
 * than `minTravel` px: where the 80 % cap would squeeze one under it, the travel starts as early as it can and arrives
 * a little after its section meets the line (W18-E: a phone's block 2 arrives 400 px down, and its 1.5x zoom ran in
 * 140 px). The hero holds for at least `heroRest` px first. The pull-back to the close runs at least `closeTravel` px:
 * it leaves the last stop when the cap lets it and arrives late, so the stop keeps its rest (final review L1), but
 * lands by `closeLatest` (W20-STOPS: a tablet's band leaves early). Anchors never run backwards.
 */
export function stageAnchors(
  keys: readonly StageKey[],
  spans: readonly Span[],
  line: number,
  travel: number,
  heroTravel = travel,
  minTravel = 0,
  heroRest = 0,
  closeTravel = 0,
  closeLatest = Number.POSITIVE_INFINITY,
): StageAnchor[] {
  const count = Math.min(spans.length, keys.length - 1);
  const arrivals = spans.slice(0, count).map((span) => span.top - line);
  const anchors: StageAnchor[] = [];
  const last = () => anchors.at(-1)?.at ?? 0;
  const push = (at: number, key: StageKey) => anchors.push({ at: Math.max(at, last()), key });
  push(0, keys[0]);
  arrivals.forEach((arrival, i) => {
    const gap = arrival - (i === 0 ? 0 : arrivals[i - 1]);
    const span = Math.max(Math.min(i === 0 ? heroTravel : travel, gap * MAX_TRAVEL_OF_GAP), minTravel);
    push(Math.max(arrival - span, i === 0 ? heroRest : 0), keys[i]);
    const toClose = i + 1 === keys.length - 1;
    const lands = Math.max(arrival, last() + (toClose ? Math.max(span, closeTravel) : span));
    push(toClose ? Math.min(lands, closeLatest) : lands, keys[i + 1]);
  });
  return anchors;
}
