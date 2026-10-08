// (C) Messages between host.ts (main thread) and spine.worker.ts. The worker owns the canvas, the renderer and the
// mesh. The main thread sends one View per frame (rotation and camera framing) and gets every disc's screen box back.
import type { DiscId, Theme } from "../data/contract";
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
  view: View;
}

export type ToWorker =
  | ({ type: "init"; canvas: OffscreenCanvas } & SpineStart)
  | { type: "view"; view: View }
  | { type: "pick"; id: number; x: number; y: number }
  | { type: "resize"; width: number; height: number; dpr: number }
  | { type: "theme"; theme: Theme }
  | { type: "levels"; levels: DiscLevels }
  | { type: "dispose" };

/** "ready" once the first frame is drawn, with the renderer's name (W14-O: a software one never spins); "themed" once a
 *  theme change's first frame is drawn; "fail" with a FallbackReason name, or an error message. */
export type FromWorker =
  | { type: "ready"; boxes: DiscBox[]; gpu: string }
  | { type: "themed"; theme: Theme }
  | { type: "boxes"; boxes: DiscBox[] }
  | { type: "picked"; id: number; disc: DiscId | null }
  | { type: "fail"; reason: string };
