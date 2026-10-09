// (C) W14-R: S0's live spine never competes with the first tap, the site's most important interaction. It gets no 3D
// on a software renderer (a low-end phone with weak or no GL), starts a second past its LCP and then only in idle
// time, and gives up if the visitor presses one of S1's options before its first frame: they are leaving S0.
import { gpuNameOf, isSoftwareRenderer, type NamedGl } from "./pace";

/** W14-X: the press is recorded from the entry bundle on (option-press.ts). */
export { onOptionPress, S1_OPTION } from "./option-press";

/** How long after its LCP S0's 3D waits before it asks for idle time. A timer, not a measure of quiet. W15-D2: 300 ms,
 *  down from a second; the 3D builds and draws in a worker, so what it costs the main thread is small. */
export const WAIT_AFTER_LCP_MS = 300;
/** W14-U L5: a page loaded in a background tab reports no LCP, so after this long the first paint stands in for it. */
export const NO_LCP_MS = 3000;
/** requestIdleCallback's deadline, so the 3D still starts on a page that is never idle. */
const IDLE_TIMEOUT_MS = 2000;
const FRAME_FALLBACK_MS = 16;
const LCP = "largest-contentful-paint";

/**
 * True when the browser's WebGL runs on a software renderer. A 1×1 context on the main thread, read and given back at
 * once, before any 3D code loads. A browser that can't make one is left to the viewer's own failure path.
 */
export function probeSoftwareGl(makeCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")): boolean {
  const canvas = makeCanvas();
  canvas.width = 1;
  canvas.height = 1;
  const gl = canvas.getContext("webgl2") as (NamedGl & WebGL2RenderingContext) | null;
  if (!gl) return false;
  const software = isSoftwareRenderer(gpuNameOf(gl));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return software;
}

/** True where the probe runs in a worker. Elsewhere it is a context on the main thread, so it waits for idle time. */
export function probesOffThread(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

/** How long the probe worker gets to answer before the 3D is let try anyway (its own fallbacks still apply). */
export const PROBE_TIMEOUT_MS = 5000;

/**
 * W14-X: true when the browser's WebGL runs on a software renderer, asked off the main thread where a worker can make
 * a context (gl-probe.worker.ts), so the first context's cold start never blocks a tap. Elsewhere (older Safari, which
 * has no software GL fallback to speak of) the main-thread probe answers.
 */
export function isSoftwareGl(makeCanvas?: () => HTMLCanvasElement, signal?: AbortSignal): Promise<boolean> {
  if (!probesOffThread()) return Promise.resolve(probeSoftwareGl(makeCanvas));
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    const answer = (software: boolean) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", stop);
      worker?.terminate();
      resolve(software);
    };
    /** W15-D2: the visitor left S0 before it answered, so the probe worker ends now. Nothing waits on the answer. */
    const stop = () => answer(false);
    signal?.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(() => answer(false), PROBE_TIMEOUT_MS);
    try {
      worker = new Worker(new URL("./gl-probe.worker.ts", import.meta.url), { type: "module", name: "gl-probe" });
      worker.onmessage = ({ data }: MessageEvent<{ software?: unknown }>) => answer(data?.software === true);
      worker.onerror = () => answer(false);
    } catch {
      answer(false);
    }
  });
}

/** Calls `go` after the first paint (two frames; none come while the tab is hidden). Returns a cancel. */
function afterFirstPaint(go: () => void): () => void {
  let cancelled = false;
  const nextFrame = (run: () => void) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(run) : setTimeout(run, FRAME_FALLBACK_MS);
  nextFrame(() => nextFrame(() => !cancelled && go()));
  return () => {
    cancelled = true;
  };
}

/** Calls `go` once the LCP is reported, or after the first paint where the browser reports none (or none within
 *  NO_LCP_MS). Returns a cancel. */
function whenLcp(go: () => void): () => void {
  const types = typeof PerformanceObserver === "undefined" ? [] : PerformanceObserver.supportedEntryTypes ?? [];
  if (!types.includes(LCP)) return afterFirstPaint(go);
  let fired = false;
  let stopPaint: () => void = () => undefined;
  const once = () => {
    if (fired) return;
    fired = true;
    observer.disconnect();
    clearTimeout(noLcp);
    go();
  };
  const observer = new PerformanceObserver(once);
  observer.observe({ type: LCP, buffered: true });
  const noLcp = setTimeout(() => {
    observer.disconnect();
    stopPaint = afterFirstPaint(once);
  }, NO_LCP_MS);
  return () => {
    fired = true;
    observer.disconnect();
    clearTimeout(noLcp);
    stopPaint();
  };
}

/** Runs `run` in idle time, WAIT_AFTER_LCP_MS past the LCP. `atLcp` runs at the LCP itself, for network-only work
 *  that should be under way while the wait runs (W15-D2: the mesh and the probe). Returns a cancel for both. */
export function afterLcpThenIdle(run: () => void, atLcp?: () => void): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const whenIdle = (go: () => void) =>
    typeof requestIdleCallback === "function" ? requestIdleCallback(go, { timeout: IDLE_TIMEOUT_MS }) : setTimeout(go, 0);
  const stopLcp = whenLcp(() => {
    if (cancelled) return;
    atLcp?.();
    timer = setTimeout(() => whenIdle(() => !cancelled && run()), WAIT_AFTER_LCP_MS);
  });
  return () => {
    cancelled = true;
    stopLcp();
    if (timer !== null) clearTimeout(timer);
  };
}

/** W15-D2: S0's mesh, asked for on the main thread as soon as the probe says the GPU is real, so it downloads while
 *  the wait and the worker's script run instead of after them. Its bytes go to the worker (host.ts) in one transfer. */
export interface MeshPrefetch {
  readonly url: string;
  /** The mesh's bytes, or null when the download failed: the 3D then fetches the mesh itself. */
  readonly bytes: Promise<ArrayBuffer | null>;
}

/** Starts downloading the mesh at `url`. Network only: no parse, no decode, no GPU. */
export function prefetchMesh(url: string): MeshPrefetch {
  const bytes = fetch(url)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .catch(() => null);
  return { url, bytes };
}
