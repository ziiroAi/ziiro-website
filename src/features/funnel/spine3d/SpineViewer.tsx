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
import type { Motion } from "./orbit";
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

export type SpinePhase = "still" | "loading" | "live" | "fallback";

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
    const teardown = () => {
      const current = live.current;
      live.current = null;
      current?.drive?.dispose();
      current?.handle.dispose();
      current?.canvas.remove();
    };
    const fail = (reason: FallbackReason) => {
      if (cancelled) return;
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
          onReady: (boxes) => {
            if (cancelled || !live.current) return;
            canvas.style.opacity = "1";
            canvas.removeAttribute("aria-hidden");
            const drive = createDrive(box, handle, size, readMotion());
            live.current = { ...live.current, drive };
            drive.takeBoxes(boxes);
            setState({ phase: "live", reason: null });
            latest.current.onApi?.(drive);
            latest.current.onPhase?.("live", null);
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
    const cancelStart = afterFirstPaint(() => void begin());
    return () => {
      cancelled = true;
      cancelStart();
      teardown();
    };
  }, [boxRef]);

  useEffect(() => {
    live.current?.handle.setTheme(inputs.theme);
    live.current?.drive?.wake();
  }, [inputs.theme]);

  useEffect(() => {
    live.current?.handle.setLevels(inputs.levels);
    live.current?.drive?.wake();
  }, [inputs.levels]);

  return state;
}

export function SpineViewer({ label, lit, className = "", children, onApi, onPhase }: SpineViewerProps): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const theme = useHtmlTheme();
  const litKey = lit?.join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the departments' names, not the array's identity
  const levels = useMemo(() => discLevels(lit), [litKey]);
  const { phase, reason } = useSpine(boxRef, { label, theme, levels, onApi, onPhase });
  const live = phase === "live";
  return (
    <div
      ref={boxRef}
      data-testid="spine-viewer"
      data-spine={phase}
      data-spine-reason={reason ?? undefined}
      className={`relative ${live ? "cursor-grab select-none" : ""} ${className}`}
      style={live ? { touchAction: "pan-y" } : undefined}
    >
      <div data-testid="spine-still" className={live ? "invisible" : undefined}>
        {children}
      </div>
    </div>
  );
}
