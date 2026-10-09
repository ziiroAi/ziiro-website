// (C) W14-C §1: the spine in a worker, on the OffscreenCanvas the viewer handed over. The renderer, the mesh fetch
// and parse, the meshopt decode and the shader compile all run here, so a tap on the page while the 3D loads never
// waits on them (the INP gate).
import type { Theme } from "../data/contract";
import type { View } from "./camera";
import type { DiscLevels } from "./levels";
import type { FromWorker, ToWorker } from "./protocol";
import { createSpineScene, type SpineScene } from "./scene";

const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  close(): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
  location: { href: string; origin: string };
};

/** W14-V T6: the only meshes the worker fetches, and the sizes it will make a canvas. */
const MESH_PATH = "/spine/3d/";
const MAX_SIDE = 8192;
const MAX_DPR = 3;
/** Where a worker has no requestAnimationFrame, it draws at most this often. */
const FALLBACK_FRAME_MS = 16;

const clamp = (value: number, low: number, high: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(Math.max(value, low), high) : fallback;

function isOurMesh(url: string): boolean {
  try {
    const { origin, pathname } = new URL(url, scope.location.href);
    return origin === scope.location.origin && pathname.startsWith(MESH_PATH);
  } catch {
    return false;
  }
}

const nextFrame = (draw: () => void): void => {
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(draw);
  else setTimeout(draw, FALLBACK_FRAME_MS);
};

let spine: SpineScene | null = null;
let disposed = false;
/** W15-D2: hands the scene the bytes the page moves over (a "mesh" message), or null so it fetches the mesh itself. */
let meshArrived: ((buffer: ArrayBuffer | null) => void) | null = null;
/** W16-A with W15-M6: the same for the close-up's bytes (a "closeup" message). */
let closeupArrived: ((buffer: ArrayBuffer | null) => void) | null = null;
/** Set while the scene is built, so dispose can stop the download and close once the half-built scene is let go. */
let building: { abort: AbortController; done: Promise<void> } | null = null;
/** W14-U M1: the latest view not yet drawn. Views that arrive faster than the GPU draws are dropped, not queued, so a
 *  slow GPU answers late and the drive's frame judge sees it. */
let unseen: View | null = null;
/** For the frame time it reports (W14-U M1): when it last drew, when the oldest undrawn view came, and whether newer
 *  views replaced it before the frame came (the GPU is behind the spin). */
let drawnAt = 0;
let unseenSince = 0;
let piledUp = false;
/** What arrived while the scene was still being built, applied before its first frame (W14-J F1). */
let latest: {
  view: View | null;
  size: [number, number, number] | null;
  theme: Theme | null;
  levels: DiscLevels | null;
} = { view: null, size: null, theme: null, levels: null };

async function init(message: Extract<ToWorker, { type: "init" }>, signal: AbortSignal): Promise<void> {
  try {
    if (!isOurMesh(message.meshUrl)) throw new Error("mesh-failed");
    // W16-A: a close-up from anywhere else is dropped; the full spine stays.
    const closeupUrl = message.closeupUrl && isOurMesh(message.closeupUrl) ? message.closeupUrl : undefined;
    const closeupBytes = closeupUrl && message.closeupFromHost
      ? new Promise<ArrayBuffer | null>((resolve) => (closeupArrived = resolve))
      : undefined;
    const meshBytes = message.meshFromHost
      ? new Promise<ArrayBuffer | null>((resolve) => (meshArrived = resolve))
      : undefined;
    const built = await createSpineScene({
      ...message,
      closeupUrl,
      closeupBytes,
      meshBytes,
      width: clamp(message.width, 0, MAX_SIDE, 0),
      height: clamp(message.height, 0, MAX_SIDE, 0),
      dpr: clamp(message.dpr, 0.5, MAX_DPR, 1),
      signal,
      onContextLost: () => scope.postMessage({ type: "fail", reason: "context-lost" }),
    });
    if (disposed) return built.dispose();
    spine = built;
    if (latest.size) spine.resize(...latest.size);
    if (latest.theme) spine.setTheme(latest.theme);
    if (latest.levels) spine.setLevels(latest.levels);
    scope.postMessage({ type: "ready", boxes: spine.render(latest.view ?? message.view), gpu: spine.gpu });
  } catch (error) {
    if (!disposed) scope.postMessage({ type: "fail", reason: error instanceof Error ? error.message : "error" });
  }
}

function draw(): void {
  const view = unseen;
  const now = performance.now();
  const frameMs = piledUp && drawnAt ? now - drawnAt : now - unseenSince;
  unseen = null;
  piledUp = false;
  if (!spine || !view) return;
  drawnAt = now;
  scope.postMessage({ type: "boxes", boxes: spine.render(view), frameMs });
}

function handle(data: ToWorker): void {
  switch (data.type) {
    case "init": {
      const abort = new AbortController();
      const done = init(data, abort.signal).finally(() => (building = null));
      building = { abort, done };
      return;
    }
    case "view":
      latest = { ...latest, view: data.view };
      if (!spine) return;
      if (unseen) piledUp = true;
      else {
        unseenSince = performance.now();
        nextFrame(draw);
      }
      unseen = data.view;
      return;
    case "pick":
      scope.postMessage({ type: "picked", id: data.id, disc: spine?.pick(data.x, data.y) ?? null });
      return;
    case "resize":
      latest = { ...latest, size: [data.width, data.height, data.dpr] };
      spine?.resize(data.width, data.height, data.dpr);
      return;
    case "theme":
      if (!spine) {
        latest = { ...latest, theme: data.theme };
        return;
      }
      spine.setTheme(data.theme);
      scope.postMessage({ type: "themed", theme: data.theme });
      return;
    case "levels":
      if (!spine) latest = { ...latest, levels: data.levels };
      spine?.setLevels(data.levels);
      return;
    case "mesh":
      meshArrived?.(data.buffer);
      meshArrived = null;
      return;
    case "closeup":
      closeupArrived?.(data.buffer);
      closeupArrived = null;
      return;
    case "dispose":
      disposed = true;
      // A build still waiting for the page's bytes gets none, so it ends and the worker can close.
      meshArrived?.(null);
      meshArrived = null;
      closeupArrived?.(null);
      closeupArrived = null;
      spine?.dispose();
      spine = null;
      // A scene still being built holds a context already: stop its download and close once it has let go (W14-U L2).
      if (!building) return scope.close();
      building.abort.abort();
      void building.done.then(() => scope.close());
  }
}

/** A frame, theme or resize that throws would leave a stale picture: report it, and the viewer brings the still back. */
scope.onmessage = ({ data }) => {
  try {
    handle(data);
  } catch (error) {
    scope.postMessage({ type: "fail", reason: error instanceof Error ? error.message : "error" });
  }
};
