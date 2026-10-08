// (C) W14-K: the live spine's GPU budget. A phone tab that holds two full contexts can be killed, so each viewer draws
// at a capped pixel ratio, and one that is off screen while another is live gives its context back.
import type { MeshSize } from "./rules";

/** Device pixels per CSS pixel, at most. */
const MAX_DPR: Readonly<Record<MeshSize, number>> = { phone: 1.5, desktop: 2 };

/** MSAA samples on the scene's target. */
const SAMPLES: Readonly<Record<MeshSize, number>> = { phone: 4, desktop: 4 };

/** The bloom's working size in CSS pixels per CSS pixel, as worker-3 tuned the glow (lookdev, desktop at DPR 2). */
const BLOOM_CSS_SCALE = 4;

/** The bloom's size as a multiple of the canvas, at most. Desktop: 2, as tuned at DPR 2, so a DPR 1 screen gets no 4x bloom. */
const MAX_BLOOM_SCALE: Readonly<Record<MeshSize, number>> = { phone: BLOOM_CSS_SCALE / MAX_DPR.phone, desktop: 2 };

/** The bloom's size as a multiple of the canvas (device pixels), so the glow keeps its tuned width where it can. */
export const bloomScaleFor = (size: MeshSize, ratio: number): number =>
  Math.min(BLOOM_CSS_SCALE / ratio, MAX_BLOOM_SCALE[size]);

export const maxDprFor = (size: MeshSize): number => MAX_DPR[size];

export const samplesFor = (size: MeshSize): number => SAMPLES[size];

/** An off-screen viewer keeps its 3D while it is the only one live, and lets go once another one is. */
export function shouldRelease({ nearScreen, othersLive }: { nearScreen: boolean; othersLive: boolean }): boolean {
  return !nearScreen && othersLive;
}
