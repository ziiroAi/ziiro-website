// (C) W14-C §1: starts the live spine on a canvas. Where OffscreenCanvas runs, the canvas moves to spine.worker.ts and
// the main thread only sends one View per frame. Elsewhere (older Safari) three.js runs here, loaded with import().
// This file is its own lazy chunk and imports no three.js itself.
import type { DiscId, Theme } from "../data/contract";
import type { View } from "./camera";
import type { DiscLevels } from "./levels";
import { isFromWorker, type SpineStart, type ToWorker } from "./protocol";
import { canOffscreen, reasonFor, type FallbackReason } from "./rules";
import type { DiscBox, SpineScene } from "./scene";

/** How long a disposed worker gets to give its WebGL context back before it is terminated. */
const DISPOSE_GRACE_MS = 1000;

export interface SpineHandle {
  /** True when frames are drawn off the main thread (the worker), so the main thread's frame gaps say nothing about
   *  the GPU, and the drive judges it by how long each frame takes to come back (W14-U M1). */
  readonly offThread?: boolean;
  /** Draws a frame. Its disc boxes arrive through onBoxes. */
  render(view: View): void;
  pick(x: number, y: number): Promise<DiscId | null>;
  resize(width: number, height: number, dpr: number): void;
  /** Settles once a frame in the new look is drawn (or the 3D stops), so the viewer can hold the still till then. */
  setTheme(theme: Theme): Promise<void>;
  setLevels(levels: DiscLevels): void;
  dispose(): void;
}

export interface StartOptions extends SpineStart {
  /** The first frame is drawn. `gpu` is the renderer's name, so the viewer can pace its idle spin (W14-O). */
  onReady(boxes: DiscBox[], gpu: string): void;
  /** `frameMs`: the worker's own frame time, so the drive can judge a GPU it can't time from the main thread. */
  onBoxes(boxes: DiscBox[], frameMs?: number): void;
  onFail(reason: FallbackReason): void;
}

function inWorker(canvas: HTMLCanvasElement, { onReady, onBoxes, onFail, ...start }: StartOptions): SpineHandle {
  const worker = new Worker(new URL("./spine.worker.ts", import.meta.url), { type: "module", name: "spine" });
  const send = (message: ToWorker, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
  const picks = new Map<number, (disc: DiscId | null) => void>();
  /** Until the first frame, dispose ends the worker at once (W14-X). */
  let drawn = false;
  let nextPick = 0;
  /** Theme changes in the order they were sent, each settled once the worker has drawn it. */
  let themed: { theme: Theme; settle: () => void }[] = [];
  const settleThemes = (upTo = themed.length) => {
    themed.slice(0, upTo).forEach(({ settle }) => settle());
    themed = themed.slice(upTo);
  };
  const fail = () => {
    settleThemes();
    onFail("error");
  };
  worker.onmessage = ({ data }: MessageEvent<unknown>) => {
    if (!isFromWorker(data)) return fail();
    // The first frame wears the latest theme sent while loading, so it settles every change made before it.
    if (data.type === "ready") {
      drawn = true;
      settleThemes();
    }
    if (data.type === "themed") settleThemes(themed.findIndex(({ theme }) => theme === data.theme) + 1);
    if (data.type === "ready") onReady(data.boxes, data.gpu);
    else if (data.type === "themed") return;
    else if (data.type === "boxes") onBoxes(data.boxes, data.frameMs);
    else if (data.type === "picked") {
      picks.get(data.id)?.(data.disc);
      picks.delete(data.id);
    } else {
      settleThemes();
      onFail(reasonFor(data.reason));
    }
  };
  worker.onerror = fail;
  worker.onmessageerror = fail;
  const offscreen = canvas.transferControlToOffscreen();
  send({ type: "init", canvas: offscreen, ...start }, [offscreen]);
  return {
    offThread: true,
    render: (view) => send({ type: "view", view }),
    pick: (x, y) =>
      new Promise((resolve) => {
        const id = nextPick++;
        picks.set(id, resolve);
        send({ type: "pick", id, x, y });
      }),
    resize: (width, height, dpr) => send({ type: "resize", width, height, dpr }),
    setTheme: (theme) =>
      new Promise<void>((settle) => {
        themed = [...themed, { theme, settle }];
        send({ type: "theme", theme });
      }),
    setLevels: (levels) => send({ type: "levels", levels }),
    dispose: () => {
      // A ready or fail already on its way must reach no one: the viewer may be on a new handle by then (W14-V T2).
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      // The worker loses its context and closes itself; terminate is the backstop if it is stuck (W14-K). Before the
      // first frame the visitor is leaving (S0's early tap): end it now, so its script, its mesh download and any
      // context stop at once (W14-X).
      send({ type: "dispose" });
      if (drawn) setTimeout(() => worker.terminate(), DISPOSE_GRACE_MS);
      else worker.terminate();
      picks.forEach((resolve) => resolve(null));
      settleThemes();
    },
  };
}

function inline(canvas: HTMLCanvasElement, { onReady, onBoxes, onFail, ...start }: StartOptions): SpineHandle {
  let disposed = false;
  /** Stops the mesh download when the viewer leaves before the scene is built (W14-U L2). */
  const abort = new AbortController();
  let spine: SpineScene | null = null;
  let latest = start.view;
  /** Asked for while the scene is built, applied before its first frame (W14-J F1). */
  let pending: { theme?: Theme; levels?: DiscLevels; size?: [number, number, number] } = {};
  let themed: (() => void)[] = [];
  const settleThemes = () => {
    themed.forEach((settle) => settle());
    themed = [];
  };
  void Promise.all([import("./scene")])
    .then(([{ createSpineScene }]) => createSpineScene({ ...start, canvas, signal: abort.signal, onContextLost: () => onFail("context-lost") }))
    .then((built) => {
      if (disposed) return built.dispose();
      spine = built;
      if (pending.size) spine.resize(...pending.size);
      if (pending.theme) spine.setTheme(pending.theme);
      if (pending.levels) spine.setLevels(pending.levels);
      onReady(spine.render(latest), spine.gpu);
      settleThemes();
    })
    .catch((error: unknown) => {
      settleThemes();
      if (!disposed) onFail(reasonFor(error instanceof Error ? error.message : error));
    });
  return {
    render: (view) => {
      latest = view;
      if (spine) onBoxes(spine.render(view));
    },
    pick: async (x, y) => spine?.pick(x, y) ?? null,
    resize: (width, height, dpr) => {
      if (spine) spine.resize(width, height, dpr);
      else pending = { ...pending, size: [width, height, dpr] };
    },
    setTheme: (theme) => {
      if (spine) {
        spine.setTheme(theme); // draws the new look before it returns
        return Promise.resolve();
      }
      pending = { ...pending, theme };
      return new Promise<void>((settle) => themed.push(settle));
    },
    setLevels: (levels) => {
      if (spine) spine.setLevels(levels);
      else pending = { ...pending, levels };
    },
    dispose: () => {
      disposed = true;
      abort.abort();
      spine?.dispose();
      spine = null;
      settleThemes();
    },
  };
}

export function startSpine(canvas: HTMLCanvasElement, options: StartOptions): SpineHandle {
  return canOffscreen(globalThis, canvas) ? inWorker(canvas, options) : inline(canvas, options);
}
