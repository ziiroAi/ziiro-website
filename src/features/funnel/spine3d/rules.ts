// (C) W14-C §4: when the live spine gives way to the r17 still. The still is always painted first, so a fallback
// only means the 3D never replaces it. Pure, so the rules are tested without a browser.

export type FallbackReason = "save-data" | "no-webgl2" | "context-lost" | "mesh-failed" | "error";
export type MeshSize = "phone" | "desktop";

/** The still's own split (HeroPicture.tsx): the phone band under 600 px, the landscape still from 600 px. */
export const PHONE_MAX_WIDTH = 599;

const RUNTIME_REASONS: readonly FallbackReason[] = ["no-webgl2", "context-lost", "mesh-failed"];

/** Checked before any 3D code loads. Save-Data, or a browser with no WebGL2 at all, keeps the still, and the 3D
 *  chunk and mesh are never fetched. A browser that has WebGL2 but can't make a context fails later, in the scene. */
export function preflight({ saveData, webgl2 }: { saveData: boolean; webgl2: boolean }): FallbackReason | null {
  if (saveData) return "save-data";
  return webgl2 ? null : "no-webgl2";
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

/** navigator.connection.saveData, where the browser has it. */
export function readSaveData(nav: Navigator | undefined): boolean {
  const connection = (nav as (Navigator & { connection?: { saveData?: boolean } }) | undefined)?.connection;
  return connection?.saveData === true;
}
