// (C) W14-F part 2: everything laid over the live spine, from the viewer API.
// - Keyboard: one real button per department disc (§6.2 "Opening a disc"), in spine order from the top, each named
//   with sp.disc.aria and placed over the disc's hit area (tap.ts). Pointer input passes through to the canvas, so a
//   drag on a disc still turns the spine; the canvas reports taps and hovers through onDiscPick.
// - The disc panel: hover, tap or focus opens it; a tap or Enter moves focus into it; Escape gives focus back to the
//   disc's button (returnFocusTo).
// - Pinned callouts (§6.7): one per lit disc, re-laid from onDiscBoxes at most once per animation frame.
// - The lit and quiet legend (sp.legend.*), headed by the hover hint once on desktop (sp.hint.hover), in a strip at
//   the bottom that the callouts keep out of. On a phone it is LegendRow, under the band (W15-B4 L1).
// Before the 3D is live (the still, or a fallback) it renders nothing: the still has no panels.
import { createRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type RefObject } from "react";
import { copy } from "../../data";
import type { AgentId, DiscId } from "../../data/contract";
import type { DiscBox, SpineViewerApi } from "../api";
import { CROSSFADE_MS, RINGS_IN_MS } from "../SpineViewer";
import { DiscPanel } from "./DiscPanel";
import { departmentForDisc, discAria } from "./discCopy";
import { layoutLabels, type PlacedLabel } from "./labels";
import { clipBox, hitArea, type ScreenBox } from "./tap";
import type { Variant } from "./targets";
import { byFocus, calloutInputs, CALLOUT_RIGHT_MARGIN_PX, LEGEND_STRIP_PX, screenDisc, spineBands, type Callout } from "./tour";

/** The department discs from the top of the spine down: the keyboard's order. */
const BUTTON_DISCS: readonly DiscId[] = ["G07", "G06", "G05", "G04", "G03", "G02", "G01"];
const MICRO = "font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--funnel-muted)]";
/** Small print over the spine needs a backing to stay readable on its bright discs. */
const BACKED = "rounded-md bg-[color:color-mix(in_srgb,var(--funnel-bg)_82%,transparent)] px-2 py-1";

type OpenedBy = "hover" | "focus" | "tap" | "key";
interface Opened {
  disc: DiscId;
  by: OpenedBy;
}

export interface SpineOverlayProps {
  api: SpineViewerApi | null;
  /** The lit discs' callouts, in plan order (tour.ts calloutsFor). */
  callouts: readonly Callout[];
  planAgentIds: readonly AgentId[];
  variant: Variant;
  /** The viewer's size in CSS px. */
  view: { width: number; height: number };
  /** The disc in close-up, whose callout gets the first claim on space; null in the overview. */
  focus?: DiscId | null;
  /** Px at the stage's right that callouts keep clear of: the plan's text column once the spine is left (W15-B2). */
  clearRight?: number;
  /** Which side of the stage the spine stands on. The desktop disc panel docks on that side, so it never opens under
   *  the words beside the spine: the hero's on the left, the text column on the right (W15-B4 H1). */
  spineSide?: "left" | "right";
  /** W18-A: the guest's sample plan, every disc lit: guest disc labels, panel rows and legend (sp.legend.guest). */
  guest?: boolean;
}

/** The latest disc boxes, at most one update per animation frame. */
function useDiscBoxes(api: SpineViewerApi | null): readonly DiscBox[] {
  const [boxes, setBoxes] = useState<readonly DiscBox[]>(() => api?.boxes() ?? []);
  useEffect(() => {
    if (!api) return undefined;
    setBoxes(api.boxes());
    let latest: readonly DiscBox[] | null = null;
    let frame: number | null = null;
    const unsubscribe = api.onDiscBoxes((next) => {
      latest = next;
      frame ??= requestAnimationFrame(() => {
        frame = null;
        if (latest) setBoxes(latest);
      });
    });
    return () => {
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [api]);
  return boxes;
}

/** Where a disc's button sits: its hit area, else its visible box, else nowhere (then it is visually hidden). */
function buttonArea(box: DiscBox | undefined, variant: Variant, view: SpineOverlayProps["view"]): ScreenBox | null {
  if (!box || !box.onScreen) return null;
  const disc = screenDisc(box);
  return hitArea(disc, variant, view) ?? clipBox(disc.box, view);
}

function Callouts({ labels, callouts }: { labels: readonly PlacedLabel[]; callouts: readonly Callout[] }): JSX.Element {
  const shown = labels.filter((l) => !l.hidden);
  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
        {shown.map((l) => (
          <line key={l.disc} x1={l.leader.x1} y1={l.leader.y1} x2={l.leader.x2} y2={l.leader.y2}
            stroke="var(--funnel-line)" strokeWidth={1} />
        ))}
      </svg>
      {shown.map((l) => {
        const callout = callouts.find((c) => c.disc === l.disc)!;
        return (
          <div key={l.disc} data-callout={l.disc} aria-hidden="true"
            className="pointer-events-none absolute overflow-hidden rounded-lg bg-[color:var(--funnel-card)] px-2 py-1.5 text-xs shadow-sm"
            style={{ left: l.x, top: l.y, width: l.width, height: l.height }}>
            <p className="font-medium">{callout.head}</p>
            {!l.compact && callout.lines.map((line) => <p key={line} className="text-[color:var(--funnel-muted)]">{line}</p>)}
          </div>
        );
      })}
    </>
  );
}

/** W15-B2: the legend stands under the spine and follows it across the stage (its container sets --spine-across, 0
 *  to 1): at the right edge when the spine is there, at the left when it is left, so it never sits on the plan's text
 *  column or its call to action. Without the variable it sits at the bottom right, as before. W15-B4 M1: it shows as
 *  much as --legend-shown says, which PlanStage drops to 0 while the spine travels past block 2's rising words. */
const FOLLOW_SPINE: CSSProperties = {
  left: "calc(12px + var(--spine-across, 1) * (100% - 24px))",
  transform: "translateX(calc(var(--spine-across, 1) * -100%))",
  opacity: "var(--legend-shown, 1)",
};

/** How far left of the spine's line the m5b foot reaches, as a share of the framed spine's height (the stage less the
 *  legend's strip): 168 of 732 px at 1440 x 900, measured on the hero. */
const FOOT_REACH_SHARE = 0.23;
const FOOT_GAP_PX = 24;

/** FINAL-B (review-final L2): with the spine on the right (the hero) the legend stands left of its foot, right edge
 *  clear of the bone, so its box never prints over the bottom vertebrae. With the spine on the left (the close) the
 *  spine is framed small and the legend under it is already clear. */
function besideFoot(viewHeight: number): CSSProperties {
  const reach = FOOT_REACH_SHARE * (viewHeight - LEGEND_STRIP_PX.desktop) + FOOT_GAP_PX;
  return {
    left: `calc(var(--spine-across, 1) * 100% - ${Number(reach.toFixed(1))}px)`,
    transform: "translateX(-100%)",
    opacity: "var(--legend-shown, 1)",
  };
}

/** The legend, with the hover hint on top of it until the first panel opens. Callouts keep out of its strip. */
function Legend({ hint, guest, spineSide, viewHeight }: { hint: boolean; guest: boolean; spineSide: "left" | "right"; viewHeight: number }): JSX.Element {
  const style = spineSide === "right" ? besideFoot(viewHeight) : FOLLOW_SPINE;
  return (
    <ul data-legend style={style} className={`pointer-events-none absolute bottom-3 flex flex-col gap-1 ${MICRO} ${BACKED}`}>
      {hint && <li>{copy("sp.hint.hover")}</li>}
      <LegendLines guest={guest} />
    </ul>
  );
}

/** Lit and quiet; the guest's spine has every disc lit, so one line says so (W18-A). */
function LegendLines({ guest }: { guest: boolean }): JSX.Element {
  if (guest) return <li><span aria-hidden="true" className="text-[color:var(--funnel-accent)]">●</span> {copy("sp.legend.guest")}</li>;
  return (
    <>
      <li><span aria-hidden="true" className="text-[color:var(--funnel-accent)]">●</span> {copy("sp.legend.today")}</li>
      <li><span aria-hidden="true">○</span> {copy("sp.legend.later")}</li>
    </>
  );
}

/** W15-B4 L1: a phone's legend, in a row under the band (PlanStage), so it never covers the spine's lower vertebrae. */
/** W18-C: what the live 3D brings (callouts, the legend) comes in with the discs' light, after the 3D has faded in over
 *  the still, never at once. A ref callback, so it runs as the element mounts. */
function fadeIn(el: HTMLElement | null): void {
  if (el && typeof el.animate === "function") {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: RINGS_IN_MS, delay: CROSSFADE_MS, easing: "ease-in-out", fill: "backwards" });
  }
}

export function LegendRow({ guest = false }: { guest?: boolean }): JSX.Element {
  return (
    <ul
      ref={fadeIn}
      data-legend
      // W16-A, W17-S: PlanStage's --zoomed-out fades it at a zoomed department stop, where the whole spine isn't in view.
      style={{ opacity: "var(--zoomed-out, 1)" }}
      className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--funnel-muted)]"
    >
      <LegendLines guest={guest} />
    </ul>
  );
}

export function SpineOverlay({ api, callouts, planAgentIds, variant, view, focus = null, clearRight = 0, spineSide = "left", guest = false }: SpineOverlayProps): JSX.Element | null {
  const boxes = useDiscBoxes(api);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [hintSeen, setHintSeen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useMemo(
    () => Object.fromEntries(BUTTON_DISCS.map((disc) => [disc, createRef<HTMLButtonElement>()])) as Record<DiscId, RefObject<HTMLButtonElement>>,
    [],
  );

  const open = useCallback((disc: DiscId, by: OpenedBy) => {
    if (!departmentForDisc(disc)) return;
    setOpened({ disc, by });
    setHintSeen(true);
  }, []);
  /** Set while the panel hands focus back to a disc's button, so that focus doesn't reopen it. */
  const returning = useRef(false);
  const close = useCallback(() => {
    returning.current = true;
    setOpened(null);
    setTimeout(() => {
      returning.current = false;
    }, 0);
  }, []);
  const onButtonFocus = (disc: DiscId) => {
    if (returning.current) returning.current = false;
    else open(disc, "focus");
  };

  useEffect(() => {
    if (!api) return undefined;
    return api.onDiscPick(({ disc, via }) => {
      if (via === "tap") {
        if (disc) open(disc, "tap");
        return;
      }
      setOpened((current) => {
        const sticky = current && (current.by === "tap" || current.by === "key");
        if (sticky) return current;
        if (!disc) return current?.by === "hover" ? null : current;
        return departmentForDisc(disc) ? { disc, by: "hover" } : current;
      });
      if (disc && departmentForDisc(disc)) setHintSeen(true);
    });
  }, [api, open]);

  useEffect(() => {
    if (!api) setOpened(null);
  }, [api]);

  const labels = useMemo(() => {
    const above = {
      width: view.width, height: Math.max(0, view.height - LEGEND_STRIP_PX[variant]),
      marginRight: Math.max(CALLOUT_RIGHT_MARGIN_PX[variant], clearRight), avoid: spineBands(boxes),
    };
    return layoutLabels(calloutInputs(boxes, byFocus(callouts, focus), variant), above).labels;
  }, [boxes, callouts, variant, view, focus, clearRight]);

  const onButtonBlur = (event: FocusEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget as Node | null;
    const stays = next !== null && (panelRef.current?.contains(next) || BUTTON_DISCS.some((d) => buttonRefs[d].current === next));
    if (!stays) setOpened((current) => (current?.by === "focus" ? null : current));
  };

  if (!api) return null;
  return (
    <div ref={fadeIn} className="pointer-events-none absolute inset-0">
      <Callouts labels={labels} callouts={callouts} />
      {BUTTON_DISCS.map((disc) => {
        const department = departmentForDisc(disc)!;
        const area = buttonArea(boxes.find((b) => b.disc === disc), variant, view);
        return (
          <button
            key={disc}
            ref={buttonRefs[disc]}
            type="button"
            data-disc={disc}
            aria-label={discAria(department, planAgentIds, guest)}
            aria-expanded={opened?.disc === disc}
            className={`pointer-events-none rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--funnel-accent)] ${area ? "absolute" : "sr-only"}`}
            style={area ? { left: area.x0, top: area.y0, width: area.x1 - area.x0, height: area.y1 - area.y0 } : undefined}
            onFocus={() => onButtonFocus(disc)}
            onClick={() => open(disc, "key")}
            onBlur={onButtonBlur}
          />
        );
      })}
      {opened && (
        <div
          ref={panelRef}
          className={
            variant === "desktop"
              // On the right (the hero) it sits above the hero's scroll cue at the bottom right (W16-H).
              ? `pointer-events-auto absolute ${spineSide === "right" ? "bottom-32 right-4" : "bottom-16 left-4"} flex max-h-[70%] w-80 flex-col`
              : "pointer-events-auto absolute inset-x-2 top-full mt-2 flex max-h-[50vh] flex-col"
          }
        >
          {/* The panel scrolls its own list, so its rounded frame always ends whole inside the dock (W16-R M2). */}
          <DiscPanel
            disc={opened.disc}
            planAgentIds={planAgentIds}
            onClose={close}
            focusOnOpen={opened.by === "tap" || opened.by === "key"}
            returnFocusTo={buttonRefs[opened.disc]}
            className="min-h-0 overflow-y-auto"
            guest={guest}
          />
        </div>
      )}
      {variant === "desktop" && <Legend hint={!hintSeen} guest={guest} spineSide={spineSide} viewHeight={view.height} />}
    </div>
  );
}
