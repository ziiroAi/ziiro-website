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
import { baseFraming } from "./camera";
import { afterLcpThenIdle, isSoftwareGl, onOptionPress, prefetchMesh, probesOffThread, type MeshPrefetch } from "./first-screen";
import { shouldRelease } from "./gpu";
import type { Motion } from "./orbit";
import { isSoftwareRenderer } from "./pace";
import { hasWebGL2, meshFor, preflight, readConnection, type FallbackReason, type MeshSize } from "./rules";

/** W14-A's crunched meshes: 1.5 MB or less on a phone, 3 MB or less on desktop. /spine is cached immutable for a
 *  year (vercel.json, tests/media/immutable.json), so a re-crunched mesh goes in a new folder: m2, m3… */
export const MESH_URLS: Readonly<Record<MeshSize, string>> = {
  phone: "/spine/3d/m1/spine-phone.glb",
  desktop: "/spine/3d/m1/spine-desktop.glb",
};
/** W16-A: the owner's close-up for the plan stage's dive, crunched by worker-3 like m1 (W16-C): 1.2 MB or less on a
 *  phone, 2.5 MB or less on desktop. Its placement on the full spine is closeup.ts. */
export const CLOSEUP_URLS: Readonly<Record<MeshSize, string>> = {
  phone: "/spine/3d/closeup/phone.glb",
  desktop: "/spine/3d/closeup/desktop.glb",
};

/** requestIdleCallback's deadline, so the 3D still starts on a page that is never idle. */
const IDLE_TIMEOUT_MS = 2000;
/** Where requestIdleCallback is missing (Safari), the 3D starts this long after the first paint. */
const IDLE_FALLBACK_MS = 300;
const FRAME_FALLBACK_MS = 16;
/** W14-V T6: a 3D with no first frame by now (a stalled mesh fetch or worker) gives way to the still, and the visit
 *  still gets its plan_view record. */
export const LOAD_TIMEOUT_MS = 20_000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const CANVAS_CLASS = "absolute inset-0 h-full w-full transition-opacity duration-300";

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
  /**
   * S0 (W14-R): the first tap must never wait on the 3D. A start a second past the LCP in idle time, and none at all
   * if the visitor presses one of S1's options before its first frame, even before this viewer mounts (W14-X).
   */
  firstScreen?: boolean;
  /** W16-A: also loads the owner's close-up (CLOSEUP_URLS) after the first frame, for the plan stage's dive. */
  closeup?: boolean;
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
  firstScreen?: boolean;
  closeup?: boolean;
  theme: Theme;
  levels: DiscLevels;
  onApi?: (api: SpineViewerApi | null) => void;
  onPhase?: (phase: "live" | "fallback", reason: FallbackReason | null) => void;
}

function useSpine(boxRef: RefObject<HTMLDivElement>, inputs: Inputs) {
  const [state, setState] = useState<{ phase: SpinePhase; reason: FallbackReason | null }>({ phase: "still", reason: null });
  /** True while a theme change draws: the still (already in the new theme) covers for the canvas (W14-J F1). */
  const [restyling, setRestyling] = useState(false);
  /** False where the idle spin is off: reduced motion, a software renderer, or a GPU too slow for it (W14-O). */
  const [spin, setSpin] = useState(true);
  /** S0: the visitor has left, so this viewer's 3D will never start (W14-X). */
  const [left, setLeft] = useState(false);
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
    /** S0: the visitor pressed an S1 option before the first frame, so the 3D never comes (W14-R, W14-X). */
    let interrupted = false;
    let asleep = false;
    let nearScreen = true;
    let reportedLive = false;
    /** W14-O: the idle spin is off on this GPU (software, or too slow), whatever the visitor's motion setting. */
    let paceSpin = true;
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    const me = {};
    const stopLoadTimer = () => {
      if (loadTimer !== null) clearTimeout(loadTimer);
      loadTimer = null;
    };
    const teardown = () => {
      stopLoadTimer();
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
      if (cancelled || interrupted) return;
      try {
        const { startSpine } = await import("./host");
        if (cancelled || interrupted) return;
        const canvas = makeCanvas(latest.current.label);
        box.append(canvas);
        const { width, height } = box.getBoundingClientRect();
        const size = meshFor(window.innerWidth);
        const meshUrl = MESH_URLS[size];
        // W15-D2: S0's download goes to the first build only; its bytes move to that worker, so a later build fetches.
        const meshBytes = prefetch?.url === meshUrl ? prefetch.bytes : undefined;
        prefetch = null;
        /** A late message from a handle this viewer has let go (asleep, then started again) is ignored (W14-V T2). */
        const mine = () => !cancelled && live.current?.handle === handle;
        const handle: SpineHandle = startSpine(canvas, {
          width, height, dpr: devicePixelRatio || 1, size, meshUrl, meshBytes,
          closeupUrl: latest.current.closeup ? CLOSEUP_URLS[size] : undefined,
          theme: latest.current.theme, levels: latest.current.levels, view: { yaw: 0, pitch: 0, framing: baseFraming(size) },
          onReady: (boxes, gpu) => {
            if (!mine() || !live.current) return;
            stopLoadTimer();
            stopWatching();
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
            const drive = createDrive(box, handle, size, motion, { idleSpin, onSpinOff });
            live.current = { ...live.current, drive };
            drive.takeBoxes(boxes);
            setState({ phase: "live", reason: null });
            markLive(me, true);
            latest.current.onApi?.(drive);
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
      if (cancelled || failed || interrupted) return;
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
    const firstScreen = latest.current.firstScreen === true;
    /** W15-D2: S0's mesh, on its way from the probe's answer while the wait and the worker's script run. */
    let prefetch: MeshPrefetch | null = null;
    /** The probe's answer, asked once: at S0's LCP where it runs in a worker, else when the 3D starts. */
    let probe: Promise<boolean> | null = null;
    const stopProbe = new AbortController();
    const askProbe = () => (probe ??= isSoftwareGl(undefined, stopProbe.signal));
    /** W15-D2: at S0's LCP, where the probe runs off the main thread, ask it now; on a real GPU start the mesh
     *  download at once. A software renderer gets no request at all. Nothing here parses, decodes or touches the GPU. */
    const atLcp = () => {
      if (cancelled || interrupted || failed || !probesOffThread()) return;
      void askProbe().then((software) => {
        if (cancelled || interrupted || failed || software) return;
        prefetch = prefetchMesh(MESH_URLS[meshFor(window.innerWidth)]);
      });
    };
    /** W14-X: no viewer runs its 3D on a software renderer; the still stays (worker-2's W14-S, SwiftShader phone tour
     *  taps of 3-10 s). The probe is a 1×1 context in a worker, read and given back before any 3D code loads. */
    const start = () =>
      void askProbe().then((software) => {
        if (cancelled || interrupted || failed) return;
        if (software) fail("software-gl");
        else void begin();
      });
    const cancelStart = firstScreen ? afterLcpThenIdle(start, atLcp) : afterFirstPaint(start);
    /** S0: an option pressed before the first frame means the visitor is leaving, so the 3D stops wherever it got to. */
    const interrupt = () => {
      if (cancelled || failed || live.current?.drive) return;
      interrupted = true;
      cancelStart();
      stopProbe.abort();
      // A download under way may finish (network only, and the plan page shows the same mesh next, from the HTTP
      // cache), but nothing is built from it.
      prefetch = null;
      teardown();
      setLeft(true);
      setState({ phase: "still", reason: null });
    };
    const stopWatching = firstScreen ? onOptionPress(interrupt) : () => undefined;
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
      stopWatching();
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
    current.canvas.style.opacity = "0";
    setRestyling(true);
    void current.handle.setTheme(inputs.theme).then(() => {
      if (stale || live.current !== current) return;
      current.canvas.style.opacity = "1";
      setRestyling(false);
    });
    current.drive.wake();
    return () => {
      stale = true;
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

  return { ...state, restyling, spin, left };
}

export function SpineViewer({ label, lit, className = "", children, onApi, onPhase, firstScreen, closeup }: SpineViewerProps): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const theme = useHtmlTheme();
  const litKey = lit?.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the departments' names, not the array's identity
  const levels = useMemo(() => discLevels(lit), [litKey]);
  const { phase, reason, restyling, spin, left } = useSpine(boxRef, { label, theme, levels, onApi, onPhase, firstScreen, closeup });
  const live = phase === "live";
  return (
    <div
      ref={boxRef}
      data-testid="spine-viewer"
      data-spine={phase}
      data-spine-reason={reason ?? undefined}
      data-spine-left={left ? "" : undefined}
      data-spine-spin={live ? (spin ? "on" : "off") : undefined}
      className={`relative ${live ? "cursor-grab select-none" : ""} ${className}`}
      style={live ? { touchAction: "pan-y" } : undefined}
    >
      <div data-testid="spine-still" className={live && !restyling ? "invisible" : undefined}>
        {children}
      </div>
    </div>
  );
}
