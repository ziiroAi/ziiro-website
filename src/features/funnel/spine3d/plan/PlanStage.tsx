// (C) W15-B, re-choreographed by W16-A and W17-S: the plan's one 3D stage. One SpineViewer, one WebGL context, one
// model: the big spine (wave17.md: the close-up is dropped).
// - Desktop: a full screen under the site's bar, sticky behind the whole plan. The words sit over it: the hero's on
//   the left with the full spine on the right; block 2 on the right with the spine on the left; then each department
//   on the side the zoomed spine isn't on (it alternates, left first); the close on the right.
// - Phone: a sticky band in the phone lens window's shape, placed after the hero's words (D34), with the text below.
// - The scroll scrubs the camera through stagePath's keyframes: the hero, block 2, the zoom into each department's
//   disc, the pull back out at the close. It holds each keyframe while its section is read and moves over the
//   last half screen before the next; under reduced motion it cuts. While the still shows, it slides with the model.
//   When the 3D arrives it eases once from its first frame (r17's) to where the scroll has the stage, then scrubs.
// - The plan's discs are lit (setLit, D28); SpineOverlay adds the full spine's buttons, panels, callouts and legend,
//   hidden at a zoomed department stop.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { copy, departments as allDepartments } from "../../data";
import type { AgentId, DepartmentId, DiscId, PlanProgress } from "../../data/contract";
import { HeroPicture } from "../../plan/HeroPicture";
import { useHtmlTheme } from "../../plan/useHtmlTheme";
import type { SpineViewerApi } from "../api";
import { meshFor, stillReasonOf, type FallbackReason } from "../rules";
import { SpineViewer } from "../SpineViewer";
import { LegendRow, SpineOverlay } from "./SpineOverlay";
import {
  ACROSS, heroWordsOpacity, legendOpacity, needWordsOpacity, stageAnchors, stageAt, stageKeys, stageShown, wordsLeftOpacity,
  type Span, type StageAnchor,
} from "./stagePath";
import { DESKTOP_QUERY, type Variant } from "./targets";
import { calloutsFor, LEGEND_STRIP_PX } from "./tour";

/** The still fills the stage: under 1024 px a band in the phone lens window's shape (look.ts: 1290 × 1356), so the
 *  3D isn't stretched (W14-M); from 1024 px the screen under the bar. */
const STILL = "block w-full object-cover max-lg:aspect-[1290/1356] lg:h-[calc(100vh-var(--nav-h,84px))]";
/** The canvas fades into the page at every edge, instead of showing its background as a hard rectangle (W14-M). */
const FADE = "linear-gradient(to right, transparent, #000 10%, #000 92%, transparent), " +
  "linear-gradient(to bottom, transparent, #000 8%, #000 90%, transparent)";
const SOFT_EDGES: CSSProperties = {
  maskImage: FADE, WebkitMaskImage: FADE, maskComposite: "intersect", WebkitMaskComposite: "source-in",
};
/** W15-B4 M5 + L2: while the still shows it slides with the spine, so it carries its own soft edges on its own layer.
 *  Inside a masked box, each frame of the slide repainted the box on a software renderer, and the still's edge showed
 *  as a hard seam. */
const MOVING_STILL: CSSProperties = { ...SOFT_EDGES, willChange: "transform" };
/** Hidden, buttons included (no focus, no pointer), at a zoomed department stop. */
const HIDDEN: CSSProperties = { visibility: "hidden" };
/** On a phone the band covers the top of the screen, so a section is read this far into the space left below it. */
const PHONE_LINE_SHARE = 1 / 3;
/** The share of the reading space the camera travels over before the next keyframe: a whole screen, so a zoom into a
 *  department reads as a move at normal scroll speed (W16-R: over 71 px the close-up dive passed in about 50 ms). */
const TRAVEL_SHARE = 1;
/** Over this much zoom into a department the whole spine's overlay is hidden: its callouts and panels are laid out
 *  for the whole spine, and at a stop the spine may stand on the words' usual side. */
const OVERLAY_GONE_AT = 0.01;
/** From 1024 px, the share of the width PlanPage gives blocks 2 to 4 on the right (its lg:[&>section]:w-[46%]), plus
 *  a gap: the callouts keep out of it while the spine is on the left (W15-B2). */
const TEXT_COLUMN_SHARE = 0.46;
const TEXT_COLUMN_GAP_PX = 16;

export interface PlanStageProps {
  /** The plan's departments in stop order (§5.5). */
  departments: readonly DepartmentId[];
  planAgentIds: readonly AgentId[];
  onProgress(fields: PlanProgress): void;
  /** The plan, given the stage to place where the phone band sits: after the hero's words. Block 2, the stops and the
   *  close are its sections with data-depth. */
  children(stage: ReactNode): ReactNode;
}

const desktopQuery = (): MediaQueryList | null => (typeof matchMedia === "function" ? matchMedia(DESKTOP_QUERY) : null);
const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function useVariant(): Variant {
  const [desktop, setDesktop] = useState(() => desktopQuery()?.matches ?? true);
  useEffect(() => {
    const query = desktopQuery();
    if (!query) return undefined;
    const onChange = () => setDesktop(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return desktop ? "desktop" : "phone";
}

function useSize(ref: RefObject<HTMLElement>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const { width, height } = el.getBoundingClientRect();
    setSize({ width, height });
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * Where a section is read, in px from the top of the screen, and how far the camera travels before the next one.
 * Desktop: the screen's middle line. Phone: a third of the way down the space under the stuck band (W14-M2).
 */
function readingSpace(variant: Variant, band: HTMLElement | null): { line: number; travel: number } {
  const screen = window.innerHeight;
  if (variant === "desktop" || !band) return { line: screen / 2, travel: screen * TRAVEL_SHARE };
  const stuck = (Number.parseFloat(getComputedStyle(band).top) || 0) + band.getBoundingClientRect().height;
  const below = Math.max(screen - stuck, 1);
  return { line: stuck + below * PHONE_LINE_SHARE, travel: below * TRAVEL_SHARE };
}

/** The plan's sections in depth order, in page px. */
function spansOf(root: HTMLElement): Span[] {
  const y = window.scrollY;
  return [...root.querySelectorAll<HTMLElement>("[data-depth]")]
    .sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth))
    .map((section) => {
      const { top, bottom } = section.getBoundingClientRect();
      return { top: top + y, bottom: bottom + y };
    });
}

export function PlanStage({ departments, planAgentIds, onProgress, children }: PlanStageProps): JSX.Element {
  const theme = useHtmlTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<SpineViewerApi | null>(null);
  const [stop, setStop] = useState<DiscId | null>(null);
  const [spineLeft, setSpineLeft] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);
  /** The viewer whose first move has been made: an eased flight from its first frame (r17's), then scrubs (W15-B2). */
  const arrived = useRef<SpineViewerApi | null>(null);
  const variant = useVariant();
  const view = useSize(screenRef);
  const width = Math.round(view.width);
  const height = Math.round(view.height);

  const discs = useMemo(
    () => departments.flatMap((id): DiscId[] => allDepartments.filter((d) => d.id === id).map((d) => d.disc)),
    [departments],
  );
  const callouts = useMemo(() => calloutsFor(departments, planAgentIds), [departments, planAgentIds]);
  const path = useMemo(
    () => stageKeys(discs, meshFor(window.innerWidth), variant, { width, height }, LEGEND_STRIP_PX[variant]),
    [discs, variant, width, height],
  );
  const onApi = useCallback((next: SpineViewerApi | null) => setApi(next), []);
  // §9's plan_view: "motion" once the live spine runs, "still" with still_reason when it falls back.
  const onPhase = useCallback(
    (phase: "live" | "fallback", reason: FallbackReason | null) =>
      onProgress(phase === "live" || !reason ? { planView: "motion" } : { planView: "still", stillReason: stillReasonOf(reason) }),
    [onProgress],
  );

  useEffect(() => {
    api?.setLit(departments);
  }, [api, departments]);

  // The scroll, read at most once a frame. Only scrollY is read then: the sections are measured on a resize of the
  // window or of the plan (late layout, fonts), so a frame forces no style recalc (W15-B4 L3).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame: number | null = null;
    let anchors: StageAnchor[] = [];
    /** The plan's end in page px, where the stage stops; unmeasured (no layout yet), it never ends. */
    let end = Number.POSITIVE_INFINITY;
    const measure = () => {
      const { line, travel } = readingSpace(variant, bandRef.current);
      anchors = stageAnchors(path, spansOf(root), line, travel);
      const rect = root.getBoundingClientRect();
      end = rect.height > 0 ? rect.bottom + window.scrollY : Number.POSITIVE_INFINITY;
    };
    const update = () => {
      frame = null;
      const reduced = api?.reducedMotion ?? prefersReducedMotion();
      const key = stageAt(anchors, window.scrollY, reduced, path[0]);
      api?.setPose({ turn: key.turn });
      if (api && arrived.current !== api) {
        arrived.current = api;
        if (reduced) api.scrub(key.framing, key.hold);
        else void api.flyTo({ kind: "framing", framing: key.framing }, { animate: true, hold: key.hold >= 1 });
      } else {
        api?.scrub(key.framing, key.hold);
      }
      const slide = Number(((key.across - ACROSS[variant].hero) * 100).toFixed(2));
      if (stillRef.current) stillRef.current.style.transform = `translateX(${slide}%)`;
      screenRef.current?.style.setProperty("--spine-across", String(Number(key.across.toFixed(4))));
      const legend = legendOpacity(key.across, variant, key.zoomed) * stageShown(end - window.scrollY, window.innerHeight);
      screenRef.current?.style.setProperty("--legend-shown", String(Number(legend.toFixed(3))));
      // W15-B3, W16-A: the model never crosses words. The hero's fade as it sets off left, and are hidden once gone
      // (they hold buttons); the sections' words wait for it to clear their column, the right one or the left one, by
      // opacity only, so a screen reader still reaches them.
      const heroWords = Number(heroWordsOpacity(key.across, variant).toFixed(3));
      root.style.setProperty("--hero-words", String(heroWords));
      const wordsRight = Number(needWordsOpacity(key.across, variant).toFixed(3));
      const wordsLeft = Number(wordsLeftOpacity(key.across, variant).toFixed(3));
      root.style.setProperty("--words-right", String(wordsRight));
      root.style.setProperty("--words-left", String(wordsLeft));
      // W16-R M1: words not fully in let go of the pointer, so a faded section over the stage never takes the discs'
      // hover and click (at the close, the last department's invisible words sat over the spine).
      root.toggleAttribute("data-words-right-off", wordsRight < 1);
      root.toggleAttribute("data-words-left-off", wordsLeft < 1);
      root.toggleAttribute("data-hero-hidden", heroWords === 0);
      // W16-A, W17-S: the phone's legend row names the whole spine's discs, so it leaves at a zoomed stop.
      bandRef.current?.style.setProperty("--zoomed-out", String(Number((1 - key.zoomed).toFixed(3))));
      if (bandRef.current) bandRef.current.dataset.scrolled = String(Math.round(window.scrollY));
      setStop(key.stop);
      setSpineLeft(key.across < 0.5);
      setZoomedIn(key.zoomed > OVERLAY_GONE_AT);
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(update);
    };
    const remeasure = () => {
      measure();
      schedule();
    };
    remeasure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(remeasure);
    resized?.observe(root);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      resized?.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [api, path, variant]);

  const stage = (
    <div
      ref={bandRef}
      data-testid="spine-stage"
      data-stop={stop ?? "overview"}
      className="sticky top-[var(--nav-h,84px)] z-20 bg-[color:var(--funnel-bg)] lg:absolute lg:inset-0 lg:z-0 lg:bg-transparent"
    >
      <div
        ref={screenRef}
        data-stage-screen
        className="relative overflow-hidden lg:sticky lg:top-[var(--nav-h,84px)] lg:h-[calc(100vh-var(--nav-h,84px))]"
      >
        <div data-soft-edges style={api ? SOFT_EDGES : undefined}>
          <SpineViewer label={copy(theme === "dark" ? "hx.alt.dark" : "hx.alt.light")} lit={departments} onApi={onApi} onPhase={onPhase}>
            <div ref={stillRef} data-stage-still style={MOVING_STILL}>
              <HeroPicture className={STILL} />
            </div>
          </SpineViewer>
        </div>
        <div data-overlay className="contents" style={zoomedIn ? HIDDEN : undefined}>
          <SpineOverlay
            api={api}
            callouts={callouts}
            planAgentIds={planAgentIds}
            variant={variant}
            view={view}
            focus={stop}
            clearRight={variant === "desktop" && spineLeft ? view.width * TEXT_COLUMN_SHARE + TEXT_COLUMN_GAP_PX : 0}
            spineSide={spineLeft ? "left" : "right"}
          />
        </div>
      </div>
      {variant === "phone" && api && <LegendRow />}
    </div>
  );
  return (
    // Under 1024 px the padding ends the sticky band before the plan's end, so it never rides over the footer's top.
    <div ref={rootRef} className="group/stage relative max-lg:pb-24">
      {children(stage)}
    </div>
  );
}
