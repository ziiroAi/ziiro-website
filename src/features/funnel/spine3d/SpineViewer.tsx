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

/** requestIdleCallback's deadline, so the 3D still starts on a page that is never idle. */
const IDLE_TIMEOUT_MS = 2000;
/** Where requestIdleCallback is missing (Safari), the 3D starts this long after the first paint. */
const IDLE_FALLBACK_MS = 300;
const FRAME_FALLBACK_MS = 16;
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
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    const me = {};
    const teardown = () => {
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
      try {
        const { startSpine } = await import("./host");
        if (cancelled) return;
        const canvas = makeCanvas(latest.current.label);
        box.append(canvas);
        const { width, height } = box.getBoundingClientRect();
        const size = meshFor(window.innerWidth);
        const handle = startSpine(canvas, {
          width, height, dpr: devicePixelRatio || 1, size, meshUrl: MESH_URLS[size],
          theme: latest.current.theme, levels: latest.current.levels, view: { yaw: 0, pitch: 0, framing: baseFraming(size) },
          onReady: (boxes, gpu) => {
            if (cancelled || !live.current) return;
            canvas.style.opacity = "1";
            canvas.removeAttribute("aria-hidden");
            const motion = readMotion();
            const idleSpin = !isSoftwareRenderer(gpu);
            setSpin(motion.spin && idleSpin);
            const drive = createDrive(box, handle, size, motion, { idleSpin, onSpinOff: () => !cancelled && setSpin(false) });
            live.current = { ...live.current, drive };
            drive.takeBoxes(boxes);
            setState({ phase: "live", reason: null });
            markLive(me, true);
            latest.current.onApi?.(drive);
            // Once per plan: waking from asleep is not a new plan_view.
            if (!reportedLive) latest.current.onPhase?.("live", null);
            reportedLive = true;
          },
          onBoxes: (boxes) => live.current?.drive?.takeBoxes(boxes),
          onFail: fail,
        });
        live.current = { handle, drive: null, canvas };
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
    const cancelStart = afterFirstPaint(() => void begin());
    return () => {
      cancelled = true;
      cancelStart();
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

  useEffect(() => {
    live.current?.handle.setLevels(inputs.levels);
    live.current?.drive?.wake();
  }, [inputs.levels]);

  return { ...state, restyling, spin };
}

export function SpineViewer({ label, lit, className = "", children, onApi, onPhase }: SpineViewerProps): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const theme = useHtmlTheme();
  const litKey = lit?.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the departments' names, not the array's identity
  const levels = useMemo(() => discLevels(lit), [litKey]);
  const { phase, reason, restyling, spin } = useSpine(boxRef, { label, theme, levels, onApi, onPhase });
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
      <div data-testid="spine-still" className={live && !restyling ? "invisible" : undefined}>
        {children}
      </div>
    </div>
  );
}
