// (C) W14-F part 2: the plan tour's pure parts, between the viewer API (api.ts) and the part-1 modules.
// - Scroll flights: which camera targets to fly when the stop in view changes. Between two close-ups the camera pulls
//   back to the full spine first (D30, §6.2 block 3); under reduced motion it cuts straight (§11.8).
// - The API's DiscBox as tap.ts's ScreenDisc, for the keyboard buttons laid over the discs.
// - One pinned callout per lit disc (§6.7) as labels.ts input, kept off its own disc.
import { departments } from "../../data";
import type { AgentId, DepartmentId, DiscId } from "../../data/contract";
import type { CameraTarget, DiscBox, SpineViewerApi } from "../api";
import { framingFor } from "../camera";
import type { MeshSize } from "../rules";
import { discCallout } from "./discCopy";
import type { LabelInput } from "./labels";
import type { ScreenBox, ScreenDisc } from "./tap";
import type { Variant } from "./targets";

/** The disc in close-up, or null for the overview (block 2, and above the tour). */
export type Stop = DiscId | null;

export const targetFor = (stop: Stop): CameraTarget => (stop ? { kind: "disc", disc: stop } : { kind: "overview" });

/**
 * The stop as the tour frames it: r17's pose for the overview or the close-up (camera.ts), without the hero's
 * sideways lens shift. That shift parks the spine at x ≈ 0.75 for the hero's words-on-the-left layout; in the tour's
 * own column it pushed the spine and each disc's callout anchor off the canvas, so the tour centres it.
 */
export function centredTarget(stop: Stop, size: MeshSize): CameraTarget {
  const framing = framingFor(targetFor(stop), size);
  return { kind: "framing", framing: { ...framing, shift: [0, framing.shift[1]] } };
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

const boxOf = (box: DiscBox): ScreenBox => ({ x0: box.left, y0: box.top, x1: box.left + box.width, y1: box.top + box.height });

/** A DiscBox as tap.ts reads it. A disc the API marks off screen is treated as behind the camera: never a target. */
export const screenDisc = (box: DiscBox): ScreenDisc => ({ disc: box.disc, box: boxOf(box), inFront: true, behindCamera: !box.onScreen });

export interface Callout {
  disc: DiscId;
  head: string;          // sp.disc.call
  lines: string[];       // one sp.vert.title per plan agent in the department
}

/** The strip at the bottom of the stage that the legend (and the hover hint) keeps; callouts stay above it. */
export const LEGEND_STRIP_PX: Readonly<Record<Variant, number>> = { desktop: 84, phone: 56 };

/** A callout's rendered size: fixed width, padding plus one line per row of text. */
export const CALLOUT_SIZE: Readonly<Record<Variant, { width: number; pad: number; line: number }>> = {
  desktop: { width: 230, pad: 16, line: 20 },
  phone: { width: 160, pad: 12, line: 18 },
};

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
      keepOut: boxOf(box),
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
