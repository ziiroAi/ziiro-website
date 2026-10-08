// (C) W14-C §1: starts the live spine on a canvas. Where OffscreenCanvas runs, the canvas moves to spine.worker.ts and
// the main thread only sends one View per frame. Elsewhere (older Safari) three.js runs here, loaded with import().
// This file is its own lazy chunk and imports no three.js itself.
import type { DiscId, Theme } from "../data/contract";
import type { View } from "./camera";
import type { DiscLevels } from "./levels";
import type { FromWorker, SpineStart, ToWorker } from "./protocol";
import { canOffscreen, reasonFor, type FallbackReason } from "./rules";
import type { DiscBox, SpineScene } from "./scene";

export interface SpineHandle {
  /** Draws a frame. Its disc boxes arrive through onBoxes. */
  render(view: View): void;
  pick(x: number, y: number): Promise<DiscId | null>;
  resize(width: number, height: number, dpr: number): void;
  setTheme(theme: Theme): void;
  setLevels(levels: DiscLevels): void;
  dispose(): void;
}

export interface StartOptions extends SpineStart {
  onReady(boxes: DiscBox[]): void;
  onBoxes(boxes: DiscBox[]): void;
  onFail(reason: FallbackReason): void;
}

function inWorker(canvas: HTMLCanvasElement, { onReady, onBoxes, onFail, ...start }: StartOptions): SpineHandle {
  const worker = new Worker(new URL("./spine.worker.ts", import.meta.url), { type: "module", name: "spine" });
  const send = (message: ToWorker, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
  const picks = new Map<number, (disc: DiscId | null) => void>();
  let nextPick = 0;
  worker.onmessage = ({ data }: MessageEvent<FromWorker>) => {
    if (data.type === "ready") onReady(data.boxes);
    else if (data.type === "boxes") onBoxes(data.boxes);
    else if (data.type === "picked") {
      picks.get(data.id)?.(data.disc);
      picks.delete(data.id);
    } else onFail(reasonFor(data.reason));
  };
  worker.onerror = () => onFail("error");
  const offscreen = canvas.transferControlToOffscreen();
  send({ type: "init", canvas: offscreen, ...start }, [offscreen]);
  return {
    render: (view) => send({ type: "view", view }),
    pick: (x, y) =>
      new Promise((resolve) => {
        const id = nextPick++;
        picks.set(id, resolve);
        send({ type: "pick", id, x, y });
      }),
    resize: (width, height, dpr) => send({ type: "resize", width, height, dpr }),
    setTheme: (theme) => send({ type: "theme", theme }),
    setLevels: (levels) => send({ type: "levels", levels }),
    dispose: () => {
      send({ type: "dispose" });
      worker.terminate();
      picks.forEach((resolve) => resolve(null));
    },
  };
}

function inline(canvas: HTMLCanvasElement, { onReady, onBoxes, onFail, ...start }: StartOptions): SpineHandle {
  let disposed = false;
  let spine: SpineScene | null = null;
  let latest = start.view;
  void Promise.all([import("./scene"), import("./look")])
    .then(([{ createSpineScene }, { LOOK }]) =>
      createSpineScene({ ...start, canvas, look: LOOK, onContextLost: () => onFail("context-lost") }))
    .then((built) => {
      if (disposed) return built.dispose();
      spine = built;
      onReady(spine.render(latest));
    })
    .catch((error: unknown) => {
      if (!disposed) onFail(reasonFor(error instanceof Error ? error.message : error));
    });
  return {
    render: (view) => {
      latest = view;
      if (spine) onBoxes(spine.render(view));
    },
    pick: async (x, y) => spine?.pick(x, y) ?? null,
    resize: (width, height, dpr) => spine?.resize(width, height, dpr),
    setTheme: (theme) => spine?.setTheme(theme),
    setLevels: (levels) => spine?.setLevels(levels),
    dispose: () => {
      disposed = true;
      spine?.dispose();
      spine = null;
    },
  };
}

export function startSpine(canvas: HTMLCanvasElement, options: StartOptions): SpineHandle {
  return canOffscreen(globalThis, canvas) ? inWorker(canvas, options) : inline(canvas, options);
}
