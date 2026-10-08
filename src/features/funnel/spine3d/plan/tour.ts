// (C) W14-F part 2: the plan tour's pure parts, between the viewer API (api.ts) and the part-1 modules.
// - Scroll flights: which camera targets to fly when the stop in view changes. Between two close-ups the camera pulls
//   back to the full spine first (D30, §6.2 block 3); under reduced motion it cuts straight (§11.8).
// - The API's DiscBox as tap.ts's ScreenDisc, for the keyboard buttons laid over the discs.
// - One pinned callout per lit disc (§6.7) as labels.ts input, kept off its own disc.
import { departments } from "../../data";
import { DISCS, type AgentId, type DepartmentId, type DiscId } from "../../data/contract";
import type { CameraTarget, DiscBox, SpineViewerApi } from "../api";
import { baseFraming, visibleTan, type Framing } from "../camera";
import { GAPS } from "../gaps";
import { LOOK } from "../look";
import type { MeshSize } from "../rules";
import { discCallout } from "./discCopy";
import type { LabelInput } from "./labels";
import { boxOfDisc as boxOf, screenDisc, type ScreenBox } from "./tap";
import type { Variant } from "./targets";
import { add, length, normalize, scale, sub, type Vec3 } from "./vec";

/** The disc in close-up, or null for the overview (block 2, and above the tour). */
export type Stop = DiscId | null;

export const targetFor = (stop: Stop): CameraTarget => (stop ? { kind: "disc", disc: stop } : { kind: "overview" });

/** Model units past each end gap that the overview keeps in frame: the end vertebrae. */
export const END_MARGIN = 0.12;
/**
 * Model height a stop shows (W14-M). W14-F's close-ups showed 0.36 units on the desktop column and 0.2 in the phone
 * window, so the vertebrae filled the stage as blobs and the lit disc's glow sat at its edge. Each is now twice that:
 * the lit disc with a vertebra or two either side.
 */
export const STOP_HEIGHT: Readonly<Record<MeshSize, number>> = { desktop: 0.72, phone: 0.4 };

const mid = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5);

/** tan of half the vertical angle the canvas shows, as applyCamera (look-three.ts) sets it up. */
function shownTan(size: MeshSize, lensMm: number, view: { width: number; height: number }): number {
  if (size === "phone") return visibleTan(LOOK.camera.phone, lensMm);
  const tanLong = LOOK.camera.desktop.sensorMm / 2 / lensMm;
  return view.height >= view.width ? tanLong : (tanLong * view.height) / view.width;
}

/** The vertical lens shift that puts the frame's centre `fromTop` of the way down the canvas (applyCamera's maths). */
function shiftYFor(size: MeshSize, view: { width: number; height: number }, fromTop: number): number {
  if (size === "phone") {
    const { full, view: window } = LOOK.camera.phone;
    return (window[1] + fromTop * window[3] - full[1] / 2) / Math.max(full[0], full[1]);
  }
  const long = Math.max(view.width, view.height);
  return long > 0 ? ((fromTop - 0.5) * view.height) / long : 0;
}

/**
 * The tour's own camera for a stop on its real canvas (W14-M). It keeps r17's view direction, roll and lens, aims at
 * the stop's gap (or the middle of the spine for the overview) and sits it centred across and in the middle of the
 * canvas above the legend strip. The overview fits the whole spine, end vertebrae included, above that strip; a stop
 * shows STOP_HEIGHT. The hero's sideways shift is dropped: it parks the spine for the hero's words-on-the-left layout.
 */
export function tourFraming(stop: Stop, size: MeshSize, view: { width: number; height: number }, stripPx: number): Framing {
  const base = baseFraming(size);
  const share = view.height > 0 ? Math.min(0.5, stripPx / view.height) : 0;
  const first = GAPS[0].centre;
  const last = GAPS[GAPS.length - 1].centre;
  const target = stop ? GAPS[DISCS.indexOf(stop)].centre : mid(first, last);
  const height = stop ? STOP_HEIGHT[size] : (length(sub(last, first)) + 2 * END_MARGIN) / (1 - share);
  const distance = height / (2 * shownTan(size, base.lensMm, view));
  const back = normalize(sub(base.position, base.target));
  return { ...base, target, position: add(target, scale(back, distance)), shift: [0, shiftYFor(size, view, (1 - share) / 2)] };
}

/** The targets to fly, in order, from one stop to the next. `from` is undefined before the first flight. */
export function flightTargets(from: Stop | undefined, to: Stop, reducedMotion: boolean): CameraTarget[] {
  if (from === to) return [];
  if (from && to && !reducedMotion) return [{ kind: "overview" }, targetFor(to)];
  return [targetFor(to)];
}

/** plan_depth to the stop in view: 0 is block 2 (the overview), i is the i-th stop's disc. */
export const stopForDepth = (depth: number, discs: readonly DiscId[]): Stop =>
  depth >= 1 && depth <= discs.length ? discs[depth - 1] : null;

/**
 * Flies the targets one after another. `current` turns false once a newer sequence has started; a new flyTo also
 * resolves the one in flight, so the old sequence stops at its next step.
 */
export async function runFlights(
  api: SpineViewerApi,
  targets: readonly CameraTarget[],
  current: () => boolean,
  animate = true,
): Promise<void> {
  for (const target of targets) {
    if (!current()) return;
    await api.flyTo(target, { animate });
  }
}

const padBox = (b: ScreenBox, pad: number): ScreenBox => ({ x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad });
// W14-V: one tap rule. screenDisc lives in tap.ts beside pickDisc, so the drive uses it without the tour's data.
export { screenDisc };

export interface Callout {
  disc: DiscId;
  head: string;          // sp.disc.call
  lines: string[];       // one sp.vert.title per plan agent in the department
}

/** Callouts in priority order: the disc in close-up first, the rest in plan order (W14-M). */
export function byFocus(callouts: readonly Callout[], focus: DiscId | null): Callout[] {
  const first = callouts.filter((c) => c.disc === focus);
  return [...first, ...callouts.filter((c) => c.disc !== focus)];
}

/** The strip at the bottom of the stage that the legend (and the hover hint) keeps; callouts stay above it. */
export const LEGEND_STRIP_PX: Readonly<Record<Variant, number>> = { desktop: 84, phone: 56 };

/** A callout's rendered size: fixed width, padding plus one line per row of text. */
export const CALLOUT_SIZE: Readonly<Record<Variant, { width: number; pad: number; line: number }>> = {
  desktop: { width: 210, pad: 16, line: 20 },
  phone: { width: 150, pad: 12, line: 18 },
};
/** The keep-out area reaches this far past the disc's box, so a callout clears the glow round the disc too. */
export const KEEP_OUT_PAD_PX = 10;

/** The label inputs for the lit discs' callouts, in plan order (the first keeps its label longest). */
export function calloutInputs(boxes: readonly DiscBox[], callouts: readonly Callout[], variant: Variant): LabelInput[] {
  const { width, pad, line } = CALLOUT_SIZE[variant];
  return callouts.flatMap((callout) => {
    const box = boxes.find((b) => b.disc === callout.disc);
    if (!box) return [];
    return [{
      disc: callout.disc,
      anchor: box.anchor,
      width,
      height: pad + line * (1 + callout.lines.length),
      compactHeight: pad + line,
      visible: box.onScreen,
      keepOut: padBox(boxOf(box), KEEP_OUT_PAD_PX),
    }];
  });
}

/** §6.7's callout for each of the plan's departments, in plan order. */
export function calloutsFor(lit: readonly DepartmentId[], planAgentIds: readonly AgentId[]): Callout[] {
  return lit.flatMap((id) => {
    const department = departments.find((d) => d.id === id);
    if (!department) return [];
    const { head, lines } = discCallout(department, planAgentIds);
    return [{ disc: department.disc, head, lines }];
  });
}
