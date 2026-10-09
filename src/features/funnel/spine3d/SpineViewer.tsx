// (C) W14-C: the owner's spine, live and drag-rotatable (D2 vetoed 8 Oct). The r17 still renders first and stays the
// LCP. After the first paint, in idle time, the 3D code loads as its own chunk, draws its first frame on a canvas
// over the still, and only then swaps the still out. Save-Data, no WebGL2, a lost context or a mesh that won't load
// leave the still on screen (§4 of W14-C): never a blank box.
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { DepartmentId, Theme } from "../data/contract";
import { useHtmlTheme } from "../plan/useHtmlTheme";
import type { SpineViewerApi } from "./api";
import { createDrive, type Drive } from "./drive";
import type { SpineHandle } from "./host";
import { discLevels, type DiscLevels } from "./levels";
import { baseFraming, easeInOut, type Framing } from "./camera";
import { sharedSoftwareGl } from "./first-screen";
import { shouldRelease } from "./gpu";
import { MESH_URLS } from "./mesh-urls";
import { takeWarmMesh } from "./mesh-warm";
import type { Motion } from "./orbit";
import { isSoftwareRenderer } from "./pace";
import { hasWebGL2, meshFor, preflight, readConnection, type FallbackReason } from "./rules";

export { MESH_URLS } from "./mesh-urls";

/** requestIdleCallback's deadline, so the 3D still starts on a page that is never idle. */
const IDLE_TIMEOUT_MS = 2000;
/** Where requestIdleCallback is missing (Safari), the 3D starts this long after the first paint. */
const IDLE_FALLBACK_MS = 300;
const FRAME_FALLBACK_MS = 16;
/** W14-V T6: a 3D with no first frame by now (a stalled mesh fetch or worker) gives way to the still, and the visit
 *  still gets its plan_view record. */
export const LOAD_TIMEOUT_MS = 20_000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const CANVAS_CLASS = "absolute inset-0 h-full w-full";
/** W18-C: the 3D's first frame fades in over the still this long; the still stays under it till the fade ends, so the
 *  page never shows between them. */
export const CROSSFADE_MS = 500;
/** W18-C: after the crossfade, a viewer with ringsIn fades its discs' light in from none (its still's look) this long. */
export const RINGS_IN_MS = 700;

/** "asleep": off screen while another viewer is live, so its 3D was given back and its still shows (W14-K). */
export type SpinePhase = "still" | "loading" | "live" | "asleep" | "fallback";

/** How far off screen a viewer still counts as near: it starts again this early when scrolled back to. */
const NEAR_MARGIN = "50% 0px";

/** The viewers whose 3D is live. A viewer off screen gives its GPU memory back once another one is in here. */
const liveViewers = new Set<object>();
const presenceListeners = new Set<() => void>();

function markLive(viewer: object, isLive: boolean): void {
  if (liveViewers.has(viewer) === isLive) return;
  if (isLive) liveViewers.add(viewer);
  else liveViewers.delete(viewer);
  presenceListeners.forEach((listener) => listener());
}

export interface SpineViewerProps {
  /** The still's alt text, given to the canvas once it replaces the still. */
  label: string;
  /** The plan's departments, whose discs stay lit (D28). Without it all nine glow. */
  lit?: readonly DepartmentId[];
  className?: string;
  /** The r17 still: the first paint and the fallback. */
  children: ReactNode;
  /** The viewer API once the 3D is live, and null if the still comes back (W14-F builds on it). */
  onApi?(api: SpineViewerApi | null): void;
  /** Once live, and on a fallback with its reason: the plan_view record (§9). */
  onPhase?(phase: "live" | "fallback", reason: FallbackReason | null): void;
  /** W18-C: the framing the 3D starts at, asked when it starts: the one its still shows. r17's when absent or null. */
  startFraming?(): Framing | null;
  /** W18-C: the still shows the discs unlit, so the 3D starts unlit too and fades their light in after the handover. */
  ringsIn?: boolean;
}

/** Runs after two frames (the first paint is on screen), then in idle time. Returns a cancel. */
function afterFirstPaint(run: () => void): () => void {
  let cancelled = false;
  let idle: number | null = null;
  const whenIdle = (go: () => void): number =>
    typeof requestIdleCallback === "function" ? requestIdleCallback(go, { timeout: IDLE_TIMEOUT_MS }) : window.setTimeout(go, IDLE_FALLBACK_MS);
  const nextFrame = (go: () => void) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(go) : window.setTimeout(go, FRAME_FALLBACK_MS);
  nextFrame(() =>
    nextFrame(() => {
      if (!cancelled) idle = whenIdle(() => !cancelled && run());
    }),
  );
  return () => {
    cancelled = true;
    if (idle === null) return;
    if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
    else clearTimeout(idle);
  };
}

function readMotion(): Motion {
  const reduce = typeof matchMedia === "function" && matchMedia(REDUCED_MOTION).matches;
  return { spin: !reduce, inertia: !reduce };
}

function makeCanvas(label: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.dataset.testid = "spine-canvas";
  canvas.className = CANVAS_CLASS;
  canvas.style.opacity = "0";
  canvas.style.transition = `opacity ${CROSSFADE_MS}ms ease-in-out`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", label);
  canvas.setAttribute("aria-hidden", "true");
  return canvas;
}

interface Live {
  handle: SpineHandle;
  drive: Drive | null;
  canvas: HTMLCanvasElement;
}

interface Inputs {
  label: string;
  theme: Theme;
  levels: DiscLevels;
  onApi?: (api: SpineViewerApi | null) => void;
  onPhase?: (phase: "live" | "fallback", reason: FallbackReason | null) => void;
  startFraming?: () => Framing | null;
  ringsIn?: boolean;
}

/** Calls step(t) once a frame with t from 0 to 1 over ms, ending on 1. Returns a cancel. */
function rampOver(ms: number, step: (t: number) => void): () => void {
  if (typeof requestAnimationFrame !== "function") {
    step(1);
    return () => undefined;
  }
  let frame = 0;
  let from: number | null = null;
  const tick = (now: number) => {
    from ??= now;
    const t = Math.min((now - from) / ms, 1);
    step(t);
    frame = t < 1 ? requestAnimationFrame(tick) : 0;
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

function useSpine(boxRef: RefObject<HTMLDivElement>, inputs: Inputs) {
  const [state, setState] = useState<{ phase: SpinePhase; reason: FallbackReason | null }>({ phase: "still", reason: null });
  /** True while a theme change draws: the still (already in the new theme) covers for the canvas (W14-J F1). */
  const [restyling, setRestyling] = useState(false);
  /** W18-C: the canvas has faded all the way in over the still, so the still can go. */
  const [covered, setCovered] = useState(false);
  /** False where the idle spin is off: reduced motion, a software renderer, or a GPU too slow for it (W14-O). */
  const [spin, setSpin] = useState(true);
  const latest = useRef(inputs);
  latest.current = inputs;
  const live = useRef<Live | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const blocked = preflight({ ...readConnection(navigator), webgl2: hasWebGL2(window) });
    if (blocked) {
      setState({ phase: "fallback", reason: blocked });
      latest.current.onPhase?.("fallback", blocked);
      return;
    }
    let cancelled = false;
    let failed = false;
    let asleep = false;
    let nearScreen = true;
    let reportedLive = false;
    /** W14-O: the idle spin is off on this GPU (software, or too slow), whatever the visitor's motion setting. */
    let paceSpin = true;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    /** W18-C: the crossfade's end, then the discs' light coming in. */
    let handover: ReturnType<typeof setTimeout> | null = null;
    let stopRamp: (() => void) | null = null;
    const me = {};
    const stopLoadTimer = () => {
      if (loadTimer !== null) clearTimeout(loadTimer);
      loadTimer = null;
    };
    const teardown = () => {
      stopLoadTimer();
      if (handover !== null) clearTimeout(handover);
      handover = null;
      stopRamp?.();
      stopRamp = null;
      if (!cancelled) setCovered(false);
      const current = live.current;
      live.current = null;
      markLive(me, false);
      current?.drive?.dispose();
      current?.handle.dispose();
      current?.canvas.remove();
    };
    const fail = (reason: FallbackReason) => {
      if (cancelled) return;
      failed = true;
      teardown();
      setState({ phase: "fallback", reason });
      latest.current.onApi?.(null);
      latest.current.onPhase?.("fallback", reason);
    };
    const begin = async () => {
      if (cancelled) return;
      try {
        const { startSpine } = await import("./host");
        if (cancelled) return;
        const canvas = makeCanvas(latest.current.label);
        box.append(canvas);
        const { width, height } = box.getBoundingClientRect();
        const size = meshFor(window.innerWidth);
        const meshUrl = MESH_URLS[size];
        // W15-M6: a mesh this page already downloaded during the questions
        // goes to the first build only; its bytes move to that worker, so a later build fetches, from the HTTP cache.
        const meshBytes = takeWarmMesh(meshUrl);
        const framing = latest.current.startFraming?.() ?? baseFraming(size);
        const ringsIn = latest.current.ringsIn === true;
        /** A late message from a handle this viewer has let go (asleep, then started again) is ignored (W14-V T2). */
        const mine = () => !cancelled && live.current?.handle === handle;
        const handle: SpineHandle = startSpine(canvas, {
          width, height, dpr: devicePixelRatio || 1, size, meshUrl, meshBytes,
          theme: latest.current.theme, levels: latest.current.levels, glow: ringsIn ? 0 : 1, view: { yaw: 0, pitch: 0, framing },
          onReady: (boxes, gpu) => {
            if (!mine() || !live.current) return;
            stopLoadTimer();
            canvas.style.opacity = "1";
            canvas.removeAttribute("aria-hidden");
            const motion = readMotion();
            const idleSpin = !isSoftwareRenderer(gpu);
            paceSpin = idleSpin;
            setSpin(motion.spin && idleSpin);
            const onSpinOff = () => {
              paceSpin = false;
              if (!cancelled) setSpin(false);
            };
            const drive = createDrive(box, handle, size, motion, { idleSpin, onSpinOff, framing });
            live.current = { ...live.current, drive };
            drive.takeBoxes(boxes);
            setState({ phase: "live", reason: null });
            markLive(me, true);
            latest.current.onApi?.(drive);
            handover = setTimeout(() => {
              handover = null;
              if (!mine()) return;
              setCovered(true);
              if (!ringsIn) return;
              stopRamp = rampOver(RINGS_IN_MS, (t) => {
                if (!mine()) return;
                handle.setGlow(easeInOut(t));
                drive.wake();
              });
            }, CROSSFADE_MS);
            // Once per plan: waking from asleep is not a new plan_view.
            if (!reportedLive) latest.current.onPhase?.("live", null);
            reportedLive = true;
          },
          onBoxes: (boxes, frameMs) => {
            if (mine()) live.current?.drive?.takeBoxes(boxes, frameMs);
          },
          onFail: (reason) => {
            if (mine()) fail(reason);
          },
        });
        live.current = { handle, drive: null, canvas };
        loadTimer = setTimeout(() => fail("timeout"), LOAD_TIMEOUT_MS);
        setState({ phase: "loading", reason: null });
      } catch {
        fail("error");
      }
    };
    /** W14-K: off screen while another viewer is live, give the context back; near the screen again, start over. */
    const settle = () => {
      if (cancelled || failed) return;
      if (asleep) {
        if (!nearScreen) return;
        asleep = false;
        void begin();
        return;
      }
      const othersLive = [...liveViewers].some((viewer) => viewer !== me);
      if (!live.current || !shouldRelease({ nearScreen, othersLive })) return;
      teardown();
      asleep = true;
      setState({ phase: "asleep", reason: null });
      latest.current.onApi?.(null);
    };
    const near =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              nearScreen = entry.isIntersecting;
              settle();
            },
            { rootMargin: NEAR_MARGIN },
          );
    near?.observe(box);
    presenceListeners.add(settle);
    /** The probe's answer, asked once, when the 3D starts. */
    let probe: Promise<boolean> | null = null;
    const stopProbe = new AbortController();
    const askProbe = () => (probe ??= sharedSoftwareGl(stopProbe.signal));
    /** W14-X: no viewer runs its 3D on a software renderer; the still stays (worker-2's W14-S, SwiftShader phone tour
     *  taps of 3-10 s). The probe is a 1×1 context in a worker, read and given back before any 3D code loads. */
    const start = () =>
      void askProbe().then((software) => {
        if (cancelled || failed) return;
        if (software) fail("software-gl");
        else void begin();
      });
    const cancelStart = afterFirstPaint(start);
    /** W14-V T8: Reduce Motion turned on or off while the 3D runs stops or starts the idle spin and the flights. */
    const motionQuery = typeof matchMedia === "function" ? matchMedia(REDUCED_MOTION) : null;
    const onMotionChange = () => {
      const drive = live.current?.drive;
      if (cancelled || !drive) return;
      const motion = readMotion();
      drive.setMotion(motion);
      setSpin(motion.spin && paceSpin);
    };
    motionQuery?.addEventListener?.("change", onMotionChange);
    return () => {
      cancelled = true;
      cancelStart();
      stopProbe.abort();
      motionQuery?.removeEventListener?.("change", onMotionChange);
      near?.disconnect();
      presenceListeners.delete(settle);
      teardown();
    };
  }, [boxRef]);

  useEffect(() => {
    const current = live.current;
    if (!current) return;
    // While loading, the worker puts the change on its first frame, which the still covers for anyway.
    if (!current.drive) {
      void current.handle.setTheme(inputs.theme);
      return;
    }
    let stale = false;
    let faded: ReturnType<typeof setTimeout> | null = null;
    current.canvas.style.opacity = "0";
    setRestyling(true);
    void current.handle.setTheme(inputs.theme).then(() => {
      if (stale || live.current !== current) return;
      current.canvas.style.opacity = "1";
      // W18-C: the still (already in the new theme) stays under the canvas till it has faded all the way in.
      faded = setTimeout(() => setRestyling(false), CROSSFADE_MS);
    });
    current.drive.wake();
    return () => {
      stale = true;
      if (faded !== null) clearTimeout(faded);
      setRestyling(false);
    };
  }, [inputs.theme]);

  // W14-V T7: the canvas reads the theme it is in now, as the still's alt text does.
  useEffect(() => {
    live.current?.canvas.setAttribute("aria-label", inputs.label);
  }, [inputs.label]);

  useEffect(() => {
    live.current?.handle.setLevels(inputs.levels);
    live.current?.drive?.wake();
  }, [inputs.levels]);

  return { ...state, restyling, covered, spin };
}

export function SpineViewer({ label, lit, className = "", children, onApi, onPhase, startFraming, ringsIn }: SpineViewerProps): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const theme = useHtmlTheme();
  const litKey = lit?.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the departments' names, not the array's identity
  const levels = useMemo(() => discLevels(lit), [litKey]);
  const { phase, reason, restyling, covered, spin } = useSpine(boxRef, { label, theme, levels, onApi, onPhase, startFraming, ringsIn });
  const live = phase === "live";
  return (
    <div
      ref={boxRef}
      data-testid="spine-viewer"
      data-spine={phase}
      data-spine-reason={reason ?? undefined}
      data-spine-spin={live ? (spin ? "on" : "off") : undefined}
      className={`relative ${live ? "cursor-grab select-none" : ""} ${className}`}
      style={live ? { touchAction: "pan-y" } : undefined}
    >
      <div data-testid="spine-still" className={live && covered && !restyling ? "invisible" : undefined}>
        {children}
      </div>
    </div>
  );
}
