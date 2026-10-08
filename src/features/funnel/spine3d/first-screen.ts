// (C) W14-R: S0's live spine never competes with the first tap, the site's most important interaction. It gets no 3D
// on a software renderer (a low-end phone with weak or no GL), starts only once the page has been quiet for a second
// past its LCP, and gives up if the visitor taps before its first frame: they are leaving S0.
import { gpuNameOf, isSoftwareRenderer, type NamedGl } from "./pace";

/** How long the page must have been quiet after its LCP before S0's 3D starts. */
export const QUIET_AFTER_LCP_MS = 1000;
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

/** Calls `go` once the LCP is reported, or after the first paint where the browser reports no LCP. Returns a cancel. */
function whenLcp(go: () => void): () => void {
  const types = typeof PerformanceObserver === "undefined" ? [] : PerformanceObserver.supportedEntryTypes ?? [];
  if (types.includes(LCP)) {
    let fired = false;
    const observer = new PerformanceObserver(() => {
      if (fired) return;
      fired = true;
      observer.disconnect();
      go();
    });
    observer.observe({ type: LCP, buffered: true });
    return () => observer.disconnect();
  }
  let cancelled = false;
  const nextFrame = (run: () => void) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(run) : setTimeout(run, FRAME_FALLBACK_MS);
  nextFrame(() => nextFrame(() => !cancelled && go()));
  return () => {
    cancelled = true;
  };
}

/** Runs `run` in idle time once the page has been quiet for QUIET_AFTER_LCP_MS past its LCP. Returns a cancel. */
export function afterQuietLcp(run: () => void): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const whenIdle = (go: () => void) =>
    typeof requestIdleCallback === "function" ? requestIdleCallback(go, { timeout: IDLE_TIMEOUT_MS }) : setTimeout(go, 0);
  const stopLcp = whenLcp(() => {
    timer = setTimeout(() => whenIdle(() => !cancelled && run()), QUIET_AFTER_LCP_MS);
  });
  return () => {
    cancelled = true;
    stopLcp();
    if (timer !== null) clearTimeout(timer);
  };
}

/** Calls `run` once, on the visitor's first pointer press or key. Returns a stop. */
export function onFirstInput(run: () => void): () => void {
  const events = ["pointerdown", "keydown"] as const;
  const stop = () => events.forEach((type) => window.removeEventListener(type, fire, true));
  function fire() {
    stop();
    run();
  }
  events.forEach((type) => window.addEventListener(type, fire, true));
  return stop;
}
