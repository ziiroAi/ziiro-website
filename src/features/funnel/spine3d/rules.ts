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

/** §6.6: on these the mesh would take too long, so the still stays. */
const SLOW_CONNECTIONS = ["slow-2g", "2g", "3g"];

export interface Preflight {
  saveData: boolean;
  /** navigator.connection.effectiveType, where the browser has it. */
  effectiveType?: string;
  webgl2: boolean;
}

/** Checked before any 3D code loads. Save-Data, a 2G or 3G connection, or a browser with no WebGL2 at all keeps the
 *  still, and the 3D chunk and mesh are never fetched. A browser that has WebGL2 but can't make a context fails
 *  later, in the scene. */
export function preflight({ saveData, effectiveType, webgl2 }: Preflight): FallbackReason | null {
  if (saveData) return "save-data";
  if (effectiveType && SLOW_CONNECTIONS.includes(effectiveType)) return "slow-connection";
  return webgl2 ? null : "no-webgl2";
}

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
export function readConnection(nav: Navigator | undefined): Pick<Preflight, "saveData" | "effectiveType"> {
  const connection = (nav as (Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }) | undefined)
    ?.connection;
  return { saveData: connection?.saveData === true, effectiveType: connection?.effectiveType };
}
