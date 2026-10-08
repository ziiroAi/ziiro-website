// (C) W14-O: how hard the idle spin may drive the GPU. On a software renderer (SwiftShader, llvmpipe: what a low-end
// phone with weak or no GL falls back to) a spin that never stops starves the page's own frames, so the spine there
// draws only when moved. A phone spins at 30 fps at most. Pure, so the rules are tested without a browser.
import type { MeshSize } from "./rules";

/** How many frames the viewer times before it judges the GPU. */
export const SAMPLE_FRAMES = 30;
/** A median frame over this (under 30 fps) means the GPU can't keep a spin going. */
const SLOW_FRAME_MS = 33;
const SPIN_FPS: Readonly<Record<MeshSize, number | null>> = { phone: 30, desktop: null };
/** SwiftShader, llvmpipe, Mesa softpipe, Windows WARP ("Microsoft Basic Render Driver"), and any "software" one. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render driver|software/i;

/** The parts of a WebGL context that name its renderer. */
export interface NamedGl {
  readonly RENDERER: number;
  getExtension(name: "WEBGL_debug_renderer_info"): { readonly UNMASKED_RENDERER_WEBGL: number } | null;
  getParameter(name: number): unknown;
}

/** The renderer's name: the unmasked one (WEBGL_debug_renderer_info) where the browser gives it. */
export function gpuNameOf(gl: NamedGl): string {
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const name = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return typeof name === "string" ? name : "";
}

export const isSoftwareRenderer = (gpu: string): boolean => SOFTWARE.test(gpu);

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** True once SAMPLE_FRAMES frame times are in and their median is over SLOW_FRAME_MS. */
export const isTooSlow = (frameMs: readonly number[]): boolean =>
  frameMs.length >= SAMPLE_FRAMES && median(frameMs) > SLOW_FRAME_MS;

/** The idle spin's shortest gap between frames, in ms; 0 means every display frame. */
export function spinFrameMsFor(size: MeshSize): number {
  const fps = SPIN_FPS[size];
  return fps ? 1000 / fps : 0;
}
