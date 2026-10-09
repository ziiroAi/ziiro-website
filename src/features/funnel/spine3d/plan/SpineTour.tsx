// (C) W14-F part 2: the plan's 3D tour around blocks 2 and 3 (§6.2), on the owner's locked layout (wave14.md):
// - Desktop: the canvas is sticky beside the words. Phone: a sticky band above them, in the phone lens window's shape.
//   Both sit under the site's bar, and the canvas fades into the page at its edges.
// - Its own SpineViewer, started only once the tour reaches the screen, so the hero's viewer has the page to itself
//   until then. Until the 3D is live the r17 still shows, and it stays as the fallback.
// - The stop in view is the section crossing the reading line (mid-screen; on a phone, below the band): block 2
//   (plan_depth 0) holds the overview, each stop flies into its department's disc, with a pull-back to the full spine
//   between two stops (D30) and a straight cut under reduced motion (§11.8).
// - The plan's discs are lit (setLit, D28); SpineOverlay adds the buttons, panels, callouts and legend.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { copy, departments as allDepartments } from "../../data";
import type { AgentId, DepartmentId, DiscId } from "../../data/contract";
import { HeroPicture } from "../../plan/HeroPicture";
import { useHtmlTheme } from "../../plan/useHtmlTheme";
import type { CameraTarget, SpineViewerApi } from "../api";
import { meshFor } from "../rules";
import { SpineViewer } from "../SpineViewer";
import { SpineOverlay } from "./SpineOverlay";
import { DESKTOP_QUERY, type Variant } from "./targets";
import { calloutsFor, flightTargets, LEGEND_STRIP_PX, runFlights, stopForDepth, tourFraming, type Stop } from "./tour";

/** The still fills the stage. Under 1024 px it is a band with the phone lens window's own shape (look.ts: 1290 ×
 *  1356), so the 3D isn't stretched (W14-M). From 1024 px it fills the screen under the bar beside the words; the r17
 *  frame has its spine at x ≈ 0.75, and 95 % brings it near the middle, where the tour's camera centres it. */
const STILL =
  "block w-full object-cover max-lg:aspect-[1290/1356] lg:h-[calc(100vh-var(--nav-h,84px))] lg:object-[95%_50%]";
/** The canvas fades into the page at every edge, instead of showing its background as a hard rectangle (W14-M). */
const FADE = "linear-gradient(to right, transparent, #000 10%, #000 92%, transparent), " +
  "linear-gradient(to bottom, transparent, #000 8%, #000 90%, transparent)";
const SOFT_EDGES: CSSProperties = {
  maskImage: FADE, WebkitMaskImage: FADE, maskComposite: "intersect", WebkitMaskComposite: "source-in",
};
/**
 * W14-X: in light, r17's background renders (235, 234, 232) against the page's (250, 250, 248), so the stage showed
 * as a grey card. This lift puts it on the page colour; the dark background already matches its page.
 */
const LIGHT_LIFT = 250 / 235;
const LIFTED: CSSProperties = { ...SOFT_EDGES, filter: `brightness(${LIGHT_LIFT.toFixed(3)})` };

export interface SpineTourProps {
  /** The plan's departments in stop order (§5.5). */
  departments: readonly DepartmentId[];
  planAgentIds: readonly AgentId[];
  /** Block 2 and the stops, each a section with data-depth. */
  children: ReactNode;
}

const desktopQuery = (): MediaQueryList | null => (typeof matchMedia === "function" ? matchMedia(DESKTOP_QUERY) : null);

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

/** True once the element has reached the screen (at once without IntersectionObserver). */
function useReached(ref: RefObject<HTMLElement>): boolean {
  const [reached, setReached] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (reached || !el) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setReached(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, reached]);
  return reached;
}

/** On a phone the band covers the top of the screen, so the stop is read this far into the words left below it. */
const PHONE_LINE_SHARE = 1 / 3;

/**
 * Where the stop in view is read: the screen's middle line beside the desktop stage. On a phone it is a third of the
 * way down the space under the sticky band (W14-M2), so a stop is in view while its heading still shows under the band.
 */
function readingLine(variant: Variant, stage: HTMLElement | null): number {
  if (variant === "desktop" || !stage) return window.innerHeight / 2;
  const bottom = stage.getBoundingClientRect().bottom;
  return bottom + (window.innerHeight - bottom) * PHONE_LINE_SHARE;
}

/**
 * The plan_depth of the section crossing the reading line, read on scroll and resize at most once a frame; it holds
 * the last one while the line is between sections, and 0 at first. Not an IntersectionObserver: with a negative
 * rootMargin, Chromium missed the scroll to stop 1 in 6 of 12 runs, while a fresh observer saw it (W14-M probe).
 */
function useDepthInView(ref: RefObject<HTMLElement>, stageRef: RefObject<HTMLElement>, variant: Variant): number {
  const [depth, setDepth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sections = [...el.querySelectorAll<HTMLElement>("[data-depth]")];
    let frame: number | null = null;
    const measure = () => {
      frame = null;
      const line = readingLine(variant, stageRef.current);
      const crossing = sections.find((section) => {
        const { top, bottom } = section.getBoundingClientRect();
        return top <= line && bottom > line;
      });
      if (crossing) setDepth(Number(crossing.dataset.depth));
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ref, stageRef, variant]);
  return depth;
}

/**
 * Flies the camera whenever the stop changes; `aim` turns a stop into the camera target for the stage's current size.
 * The first target after the 3D arrives is a cut, and so is a re-frame of the same stop when the stage resizes.
 */
function useFlights(api: SpineViewerApi | null, stop: Stop, aim: (stop: Stop) => CameraTarget): void {
  const previous = useRef<Stop | undefined>(undefined);
  const lastAim = useRef(aim);
  const sequence = useRef(0);
  useEffect(() => {
    if (!api) {
      previous.current = undefined;
      return;
    }
    const from = previous.current;
    const reframed = lastAim.current !== aim;
    previous.current = stop;
    lastAim.current = aim;
    const moving = from !== undefined && from !== stop;
    const stops = from === stop
      ? (reframed ? [stop] : [])
      : flightTargets(from, stop, api.reducedMotion).map((t) => (t.kind === "disc" ? t.disc : null));
    if (stops.length === 0) return;
    const mine = ++sequence.current;
    void runFlights(api, stops, aim, () => sequence.current === mine, moving);
  }, [api, stop, aim]);
}

export function SpineTour({ departments, planAgentIds, children }: SpineTourProps): JSX.Element {
  const theme = useHtmlTheme();
  const tourRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<SpineViewerApi | null>(null);
  const reached = useReached(tourRef);
  const variant = useVariant();
  const view = useSize(stageRef);
  const depth = useDepthInView(wordsRef, bandRef, variant);

  const discs = useMemo(
    () => departments.flatMap((id): DiscId[] => allDepartments.filter((d) => d.id === id).map((d) => d.disc)),
    [departments],
  );
  const stop = stopForDepth(depth, discs);
  const callouts = useMemo(() => calloutsFor(departments, planAgentIds), [departments, planAgentIds]);
  const onApi = useCallback((next: SpineViewerApi | null) => setApi(next), []);
  const width = Math.round(view.width);
  const height = Math.round(view.height);
  const aim = useCallback(
    (at: Stop): CameraTarget =>
      ({ kind: "framing", framing: tourFraming(at, meshFor(window.innerWidth), { width, height }, LEGEND_STRIP_PX[variant]) }),
    [width, height, variant],
  );

  useEffect(() => {
    api?.setLit(departments);
  }, [api, departments]);
  useFlights(api, stop, aim);

  const still = <HeroPicture className={STILL} />;
  return (
    <div ref={tourRef} data-testid="spine-tour" className="relative lg:grid lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      <div
        ref={bandRef}
        data-testid="spine-tour-stage"
        data-stop={stop ?? "overview"}
        className="sticky top-[var(--nav-h,84px)] z-20 bg-[color:var(--funnel-bg)] lg:order-2 lg:self-start"
      >
        <div ref={stageRef} className="relative">
          <div data-soft-edges style={theme === "light" ? LIFTED : SOFT_EDGES}>
            {reached ? (
              <SpineViewer label={copy(theme === "dark" ? "hx.alt.dark" : "hx.alt.light")} lit={departments} onApi={onApi}>
                {still}
              </SpineViewer>
            ) : (
              still
            )}
          </div>
          <SpineOverlay api={api} callouts={callouts} planAgentIds={planAgentIds} variant={variant} view={view} focus={stop} />
        </div>
      </div>
      <div ref={wordsRef} className="lg:order-1">
        {children}
      </div>
    </div>
  );
}
