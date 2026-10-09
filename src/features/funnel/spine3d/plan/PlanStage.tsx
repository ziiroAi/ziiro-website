// (C) W15-B: the plan's one 3D stage (wave15.md item 5). The owner: "when i scroll down, the big spine is not
// transitioning". It replaces the hero's viewer and the W14 tour's second one: one SpineViewer, one WebGL context.
// - Desktop: a full screen under the site's bar, sticky behind the whole plan. The words sit over it: the hero's on
//   the left with the spine on the right, then blocks 2 and 3 and the close on the right with the spine on the left.
// - Phone: a sticky band in the phone lens window's shape, placed after the hero's words (D34), with the text below.
// - The scroll scrubs the camera through stagePath's keyframes: the hero, block 2 (left and zooming in), each stop's
//   disc, the close (pulled back). It holds each keyframe while its section is read and moves over the last half
//   screen before the next; under reduced motion it cuts. While the still shows, the still slides with the spine.
//   When the 3D arrives it eases once from its first frame (r17's) to where the scroll has the stage, then scrubs.
// - The plan's discs are lit (setLit, D28); SpineOverlay adds the buttons, panels, callouts and legend.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { copy, departments as allDepartments } from "../../data";
import type { AgentId, DepartmentId, DiscId, PlanProgress } from "../../data/contract";
import { HeroPicture } from "../../plan/HeroPicture";
import { useHtmlTheme } from "../../plan/useHtmlTheme";
import type { SpineViewerApi } from "../api";
import { meshFor, stillReasonOf, type FallbackReason } from "../rules";
import { SpineViewer } from "../SpineViewer";
import { SpineOverlay } from "./SpineOverlay";
import { ACROSS, heroWordsOpacity, needWordsOpacity, stageAnchors, stageAt, stageKeys, type Span } from "./stagePath";
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
/** On a phone the band covers the top of the screen, so a section is read this far into the space left below it. */
const PHONE_LINE_SHARE = 1 / 3;
/** The camera moves over this share of the reading space's height before the next keyframe. */
const TRAVEL_SHARE = 0.5;
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

  // The scroll, read at most once a frame: the sections are measured each time, so late layout never strands a key.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const { line, travel } = readingSpace(variant, bandRef.current);
      const anchors = stageAnchors(path.keys, spansOf(root), line, travel);
      const reduced = api?.reducedMotion ?? prefersReducedMotion();
      const key = stageAt(anchors, window.scrollY, reduced, path.pulled);
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
      // W15-B3: the spine never crosses words. The hero's fade as it sets off left, and are hidden once gone (they hold
      // buttons); block 2's wait for it to clear their column, by opacity only, so a screen reader still reaches them.
      const heroWords = Number(heroWordsOpacity(key.across, variant).toFixed(3));
      const needWords = Number(needWordsOpacity(key.across, variant).toFixed(3));
      root.style.setProperty("--hero-words", String(heroWords));
      root.style.setProperty("--need-words", String(needWords));
      root.toggleAttribute("data-hero-hidden", heroWords === 0);
      if (bandRef.current) bandRef.current.dataset.scrolled = String(Math.round(window.scrollY));
      setStop(key.stop);
      setSpineLeft(key.across < 0.5);
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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
        <div data-soft-edges style={SOFT_EDGES}>
          <SpineViewer label={copy(theme === "dark" ? "hx.alt.dark" : "hx.alt.light")} lit={departments} onApi={onApi} onPhase={onPhase}>
            <div ref={stillRef} data-stage-still>
              <HeroPicture className={STILL} />
            </div>
          </SpineViewer>
        </div>
        <SpineOverlay
          api={api}
          callouts={callouts}
          planAgentIds={planAgentIds}
          variant={variant}
          view={view}
          focus={stop}
          clearRight={variant === "desktop" && spineLeft ? view.width * TEXT_COLUMN_SHARE + TEXT_COLUMN_GAP_PX : 0}
        />
      </div>
    </div>
  );
  return (
    <div ref={rootRef} className="group/stage relative">
      {children(stage)}
    </div>
  );
}
