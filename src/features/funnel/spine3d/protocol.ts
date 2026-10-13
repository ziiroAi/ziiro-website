// (C) Messages between host.ts (main thread) and spine.worker.ts. The worker owns the canvas, the renderer and the
// mesh. The main thread sends one View per frame (rotation and camera framing) and gets every disc's screen box back.
import type { DiscId, Theme } from "../data/contract";
import type { ThemeFade } from "../flow/themeFade";
import type { View } from "./camera";
import type { DiscLevels } from "./levels";
import type { MeshSize } from "./rules";
import type { DiscBox } from "./scene";

export interface SpineStart {
  width: number;
  height: number;
  dpr: number;
  theme: Theme;
  size: MeshSize;
  meshUrl: string;
  levels: DiscLevels;
  /** W18-C: the discs' light, 0 to 1 (scene.ts SceneOptions.glow); 1 when absent. */
  glow?: number;
  view: View;
  /** W15-D2: S0 already has the mesh on its way; its bytes follow as a "mesh" message, so the worker doesn't fetch. */
  meshFromHost?: boolean;
}

export type ToWorker =
  | ({ type: "init"; canvas: OffscreenCanvas } & SpineStart)
  | { type: "view"; view: View }
  | { type: "pick"; id: number; x: number; y: number }
  | { type: "resize"; width: number; height: number; dpr: number }
  | { type: "theme"; theme: Theme; fade?: ThemeFade | null }
  | { type: "levels"; levels: DiscLevels }
  | { type: "glow"; glow: number }
  /** W15-D2: the bytes promised by meshFromHost, moved (not copied); null when S0's download failed. */
  | { type: "mesh"; buffer: ArrayBuffer | null }
  | { type: "dispose" };

/** "boxes" carries the worker's own frame time (W14-U M1): the time since its last frame when views piled up meanwhile
 *  (the GPU is behind), else the wait from the view to its frame. "ready" once the first frame is drawn, with the renderer's name (W14-O: a software one never spins); "themed" once a
 *  theme change's first frame is drawn; "fail" with a FallbackReason name, or an error message. */
export type FromWorker =
  | { type: "ready"; boxes: DiscBox[]; gpu: string }
  | { type: "themed"; theme: Theme }
  | { type: "boxes"; boxes: DiscBox[]; frameMs?: number }
  | { type: "picked"; id: number; disc: DiscId | null }
  | { type: "fail"; reason: string };

const FROM_WORKER = new Set(["ready", "themed", "boxes", "picked", "fail"]);

/** W14-V T6: a message the viewer can act on. Anything else (null, no type, a ready without boxes) is a failure. */
export function isFromWorker(data: unknown): data is FromWorker {
  if (typeof data !== "object" || data === null) return false;
  const { type, boxes } = data as { type?: unknown; boxes?: unknown };
  if (typeof type !== "string" || !FROM_WORKER.has(type)) return false;
  return (type !== "ready" && type !== "boxes") || Array.isArray(boxes);
}
