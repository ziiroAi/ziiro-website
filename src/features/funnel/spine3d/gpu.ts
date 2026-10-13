// (C) W14-K: the live spine's GPU budget. A phone tab that holds two full contexts can be killed, so each viewer draws
// at a capped pixel ratio, and one that is off screen while another is live gives its context back.
import type { MeshSize } from "./rules";

/** Device pixels per CSS pixel, at most. */
const MAX_DPR: Readonly<Record<MeshSize, number>> = { phone: 1.5, desktop: 2 };

/** MSAA samples on the scene's target. */
const SAMPLES: Readonly<Record<MeshSize, number>> = { phone: 4, desktop: 4 };

/** The bloom's working size in CSS pixels per CSS pixel, as worker-3 tuned the glow (lookdev, desktop at DPR 2). */
const BLOOM_CSS_SCALE = 4;

/** W23-C: a phone's bloom runs at this share of the tuned size. The 1:1 gate frames (hero, stops 1 and 2, light and
 *  dark, 390 @3 on Metal) came out identical, and its targets drop from about 18.7 to 4.7 MiB. */
const PHONE_BLOOM_SHARE = 0.5;

/**
 * The bloom's size as a multiple of the canvas, at most. A phone runs it at PHONE_BLOOM_SHARE of the tuned glow's size
 * at its capped ratio. Desktop never exceeds its size before W14-K (the canvas times the ratio), so a DPR 1 screen
 * pays no more than it did.
 */
const maxBloomScale = (size: MeshSize, ratio: number): number =>
  size === "phone" ? (BLOOM_CSS_SCALE / MAX_DPR.phone) * PHONE_BLOOM_SHARE : ratio;

/** The bloom's size as a multiple of the canvas (device pixels), so the glow keeps its tuned width where it can. */
export const bloomScaleFor = (size: MeshSize, ratio: number): number =>
  Math.min(BLOOM_CSS_SCALE / ratio, maxBloomScale(size, ratio));

export const maxDprFor = (size: MeshSize): number => MAX_DPR[size];

export const samplesFor = (size: MeshSize): number => SAMPLES[size];

/** An off-screen viewer keeps its 3D while it is the only one live, and lets go once another one is. */
export function shouldRelease({ nearScreen, othersLive }: { nearScreen: boolean; othersLive: boolean }): boolean {
  return !nearScreen && othersLive;
}

/** W14-V T5: a scene whose mesh or shaders fail mid-build gives its context back now, not at garbage collection
 *  (iOS Safari caps live contexts, so a leaked one can starve the next viewer). */
export async function releaseOnThrow<T>(release: () => void, build: () => Promise<T>): Promise<T> {
  try {
    return await build();
  } catch (error) {
    release();
    throw error;
  }
}
