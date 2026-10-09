// (C) W14-R: no 3D on a software renderer (a low-end phone with weak or no GL), asked before any 3D code loads. W16-B: S0
// has no spine any more; the probe and the mesh prefetch stay, for the plan's 3D (worker-2's W15-M6 warms it during
// the questions).
import { gpuNameOf, isSoftwareRenderer, type NamedGl } from "./pace";

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
    /** W15-D2: the viewer closed before it answered, so the probe worker ends now. Nothing waits on the answer. */
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

/** The page's one probe, while anyone still wants its answer or once it has one (W16-R L2). */
let shared: { answer: Promise<boolean>; settled: boolean; waiting: number; stop: AbortController } | null = null;

/**
 * W16-R L2: isSoftwareGl asked once per page. The questions' prefetch and the plan's viewer share one probe worker
 * and its answer. A part that leaves (`signal`) before the answer is told "hardware" so nothing waits on it; the probe
 * ends only when every part waiting on it has left, and the next ask then probes afresh.
 */
export function sharedSoftwareGl(signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  if (!shared) {
    const stop = new AbortController();
    const fresh = { answer: isSoftwareGl(undefined, stop.signal), settled: false, waiting: 0, stop };
    void fresh.answer.then(() => {
      fresh.settled = true;
    });
    shared = fresh;
  }
  const probe = shared;
  if (probe.settled) return probe.answer;
  probe.waiting += 1;
  return new Promise((resolve) => {
    const leave = () => {
      probe.waiting -= 1;
      if (probe.waiting === 0 && !probe.settled) {
        probe.stop.abort();
        if (shared === probe) shared = null;
      }
      resolve(false);
    };
    signal?.addEventListener("abort", leave, { once: true });
    void probe.answer.then((software) => {
      signal?.removeEventListener("abort", leave);
      resolve(software);
    });
  });
}

/** Forgets the page's probe answer (tests). */
export function forgetSoftwareGl(): void {
  shared = null;
}

/** W15-D2: a mesh asked for on the main thread ahead of the 3D, so it downloads while the worker's script runs instead
 *  of after it. Its bytes go to the worker (host.ts) in one transfer. */
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
