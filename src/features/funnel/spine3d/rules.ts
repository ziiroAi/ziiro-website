// (C) W14-C §4: when the live spine gives way to the r17 still. The still is always painted first, so a fallback
// only means the 3D never replaces it. Pure, so the rules are tested without a browser.

import type { StillReason } from "../data/contract";

/** "software-gl": no viewer's 3D runs on a software renderer (W14-R for S0, W14-X for the plan's hero and tour). "timeout": the 3D took too long to draw
 *  its first frame (a stalled mesh fetch or worker), so the still stays (W14-V T6). */
export type FallbackReason =
  | "save-data"
  | "slow-connection"
  | "no-webgl2"
  | "software-gl"
  | "context-lost"
  | "mesh-failed"
  | "timeout"
  | "error";
export type MeshSize = "phone" | "desktop";

/** The still's own split (HeroPicture.tsx): the phone band under 600 px, the landscape still from 600 px. */
export const PHONE_MAX_WIDTH = 599;

const RUNTIME_REASONS: readonly FallbackReason[] = ["no-webgl2", "context-lost", "mesh-failed"];

/** navigator.connection's Save-Data and effective type. W22-LOAD: neither keeps the still any more (a busy network reads
 *  as "3g" on a phone with a real GPU); the 3D loads in the background and fades in when ready. Shown by ?why3d=1. */
export interface Connection {
  saveData: boolean;
  /** navigator.connection.effectiveType, where the browser has it. */
  effectiveType?: string;
}

export interface Preflight {
  webgl2: boolean;
}

/** Checked before any 3D code loads: only a browser with no WebGL2 at all keeps the still, and the 3D chunk and mesh
 *  are never fetched. A browser that has WebGL2 but can't make a context fails later, in the scene (W22-LOAD: once on
 *  the worker path, then again on the main thread). "save-data" and "slow-connection" stay as recorded reasons. */
export function preflight({ webgl2 }: Preflight): FallbackReason | null {
  return webgl2 ? null : "no-webgl2";
}

/** W22-LOAD: a lost context, a mesh that didn't arrive or a worker that died starts the 3D again this many times, after
 *  these waits, before the still stays. A worker that never drew first gets an immediate second try on the main thread. */
export const MAX_RETRIES = 2;
export const RETRY_DELAYS_MS: readonly number[] = [2000, 5000];
/** W22-LOAD: failures no second try can mend: no WebGL2 on the main thread either, or a software renderer. */
export const FINAL_REASONS: readonly FallbackReason[] = ["no-webgl2", "software-gl"];

/** The reason as the plan_view record stores it (§9, contract STILL_REASONS). */
export function stillReasonOf(reason: FallbackReason): StillReason {
  if (reason === "save-data") return "save_data";
  if (reason === "slow-connection") return "slow_connection";
  return reason === "no-webgl2" || reason === "software-gl" ? "unsupported" : "failed";
}

export const hasWebGL2 = (scope: object): boolean => "WebGL2RenderingContext" in scope;

/** A failure the viewer reported, as a reason. Anything unknown is "error": the still comes back either way. */
export function reasonFor(raw: unknown): FallbackReason {
  return RUNTIME_REASONS.find((reason) => reason === raw) ?? "error";
}

export const meshFor = (width: number): MeshSize => (width <= PHONE_MAX_WIDTH ? "phone" : "desktop");

/** The worker path: the canvas moves to a worker, so the renderer, the mesh parse and the shaders stay off the
 *  main thread. It needs OffscreenCanvas, a canvas that can hand itself over, and Worker. */
export function canOffscreen(scope: object, canvas: object): boolean {
  return "OffscreenCanvas" in scope && "Worker" in scope && "transferControlToOffscreen" in canvas;
}

/** navigator.connection's Save-Data and effective type, where the browser has them. */
export function readConnection(nav: Navigator | undefined): Connection {
  const connection = (nav as (Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }) | undefined)
    ?.connection;
  return { saveData: connection?.saveData === true, effectiveType: connection?.effectiveType };
}
