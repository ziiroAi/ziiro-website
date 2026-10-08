// (C) W14-R: S0's live spine never competes with the first tap, the site's most important interaction. It gets no 3D
// on a software renderer (a low-end phone with weak or no GL), starts a second past its LCP and then only in idle
// time, and gives up if the visitor presses one of S1's options before its first frame: they are leaving S0.
import { gpuNameOf, isSoftwareRenderer, type NamedGl } from "./pace";

/** How long after its LCP S0's 3D waits before it asks for idle time. A timer, not a measure of quiet. */
export const WAIT_AFTER_LCP_MS = 1000;
/** W14-U L5: a page loaded in a background tab reports no LCP, so after this long the first paint stands in for it. */
export const NO_LCP_MS = 3000;
/** W14-U L1: S1's options (Landing.tsx). A press on one, or Enter or Space on one, is the visitor leaving S0. */
export const S1_OPTION = ".f-s1 .f-options button";
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

/** Runs `run` in idle time, WAIT_AFTER_LCP_MS past the LCP. Returns a cancel. */
export function afterLcpThenIdle(run: () => void): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const whenIdle = (go: () => void) =>
    typeof requestIdleCallback === "function" ? requestIdleCallback(go, { timeout: IDLE_TIMEOUT_MS }) : setTimeout(go, 0);
  const stopLcp = whenLcp(() => {
    timer = setTimeout(() => whenIdle(() => !cancelled && run()), WAIT_AFTER_LCP_MS);
  });
  return () => {
    cancelled = true;
    stopLcp();
    if (timer !== null) clearTimeout(timer);
  };
}

const ACTIVATING_KEYS = new Set(["Enter", " "]);

/** True for a press of one of S1's options, or Enter or Space on one. A Tab, a screen-reader key, a drag in the
 *  gutter or a scroll is not the visitor leaving S0. */
function isOptionPress(event: Event): boolean {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(S1_OPTION)) return false;
  return event.type === "pointerdown" || ACTIVATING_KEYS.has((event as KeyboardEvent).key);
}

/** Calls `run` once, when the visitor presses one of S1's options. Returns a stop. */
export function onOptionPress(run: () => void): () => void {
  const events = ["pointerdown", "keydown"] as const;
  const stop = () => events.forEach((type) => window.removeEventListener(type, fire, true));
  function fire(event: Event) {
    if (!isOptionPress(event)) return;
    stop();
    run();
  }
  events.forEach((type) => window.addEventListener(type, fire, true));
  return stop;
}
