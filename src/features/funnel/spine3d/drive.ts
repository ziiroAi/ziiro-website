// (C) W14-C §2: what moves the live spine, on the main thread. A drag turns it (orbit.ts), a flight moves the camera
// (camera.ts), and each animation frame sends one View to the renderer. The loop runs only while something moves and
// the viewer is on screen in a visible tab (render on demand). It also implements the viewer API (api.ts).
import type { DiscId } from "../data/contract";
import type { DiscPickEvent, SpineViewerApi } from "./api";
import { blendFraming, easeInOut, FLIGHT_MS, framingFor, type Framing } from "./camera";
import type { SpineHandle } from "./host";
import { discLevels } from "./levels";
import { dragBy, grab, release, REST, step, type Motion } from "./orbit";
import type { DiscBox } from "./scene";

/** §11.3: a touch target is 44 × 44 px or more. */
export const MIN_TAP_PX = 44;
/** A press that moved less than this and lasted less than TAP_MS is a tap, not a drag. */
const TAP_SLOP_PX = 8;
const TAP_MS = 500;
const FRAME_MS = 16;
/** A long gap between frames (a stalled tab) counts as this, so nothing jumps. */
const MAX_FRAME_MS = 64;

export interface Drive extends SpineViewerApi {
  /** Feeds the boxes the renderer returned for the frame it drew. */
  takeBoxes(boxes: readonly DiscBox[]): void;
  /** Draws a frame if nothing else will, after a resize or a theme change. */
  wake(): void;
  dispose(): void;
}

interface Press {
  id: number;
  type: string;
  x: number;
  y: number;
  t: number;
  startX: number;
  startY: number;
  startT: number;
}

interface Flight {
  from: Framing;
  to: Framing;
  start: number | null;
  resolve(): void;
}

export function createDrive(el: HTMLElement, handle: SpineHandle, base: Framing, motion: Motion): Drive {
  let orbit = REST;
  let framing = base;
  let flight: Flight | null = null;
  let press: Press | null = null;
  let hovered: DiscId | null = null;
  let hoverPending = false;
  let boxes: readonly DiscBox[] = [];
  let raf = 0;
  let last = 0;
  let visible = true;
  const boxListeners = new Set<(boxes: readonly DiscBox[]) => void>();
  const pickListeners = new Set<(event: DiscPickEvent) => void>();

  const running = () => visible && document.visibilityState !== "hidden";
  const schedule = () => {
    if (!raf && running()) raf = requestAnimationFrame(tick);
  };

  function advanceFlight(now: number): boolean {
    if (!flight) return false;
    flight.start ??= now;
    const t = Math.min((now - flight.start) / FLIGHT_MS, 1);
    framing = blendFraming(flight.from, flight.to, easeInOut(t));
    if (t < 1) return true;
    flight.resolve();
    flight = null;
    return false;
  }

  function tick(now: number): void {
    raf = 0;
    const dt = last ? Math.min(now - last, MAX_FRAME_MS) : FRAME_MS;
    last = now;
    const stepped = step(orbit, dt, motion);
    orbit = stepped.orbit;
    const flying = advanceFlight(now);
    handle.render({ yaw: orbit.yaw, pitch: orbit.pitch, framing });
    if (stepped.moving || flying || orbit.held) schedule();
    else last = 0;
  }

  const local = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const boxOf = (disc: DiscId | null) => boxes.find((box) => box.disc === disc) ?? null;
  const emit = (event: DiscPickEvent) => pickListeners.forEach((listener) => listener(event));

  async function tapAt(x: number, y: number, pointerType: string): Promise<void> {
    const disc = await handle.pick(x, y);
    const box = boxOf(disc);
    if (!disc || !box) return;
    if (pointerType === "touch" && (box.width < MIN_TAP_PX || box.height < MIN_TAP_PX)) return;
    emit({ disc, via: "tap", box });
  }

  async function hoverAt(x: number, y: number): Promise<void> {
    if (hoverPending || !pickListeners.size) return;
    hoverPending = true;
    const disc = await handle.pick(x, y);
    hoverPending = false;
    if (disc === hovered) return;
    hovered = disc;
    emit({ disc, via: "hover", box: boxOf(disc) });
  }

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button > 0) return;
    const { x, y } = local(event);
    press = { id: event.pointerId, type: event.pointerType, x, y, t: event.timeStamp, startX: x, startY: y, startT: event.timeStamp };
    orbit = grab(orbit);
    el.setPointerCapture?.(event.pointerId);
    schedule();
  };

  const onMove = (event: PointerEvent) => {
    const { x, y } = local(event);
    if (!press || event.pointerId !== press.id) {
      if (event.pointerType === "mouse") void hoverAt(x, y);
      return;
    }
    orbit = dragBy(orbit, x - press.x, y - press.y, event.timeStamp - press.t);
    press = { ...press, x, y, t: event.timeStamp };
    schedule();
  };

  const onUp = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;
    const { x, y } = local(event);
    const still = Math.hypot(x - press.startX, y - press.startY) < TAP_SLOP_PX;
    if (event.type === "pointerup" && still && event.timeStamp - press.startT < TAP_MS) void tapAt(x, y, press.type);
    orbit = release(orbit, motion);
    press = null;
    schedule();
  };

  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || hovered === null) return;
    hovered = null;
    emit({ disc: null, via: "hover", box: null });
  };

  const onVisibility = () => (running() ? schedule() : cancelAnimationFrame(raf));
  const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    onVisibility();
  });
  io?.observe(el);
  const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(([entry]) => {
    handle.resize(entry.contentRect.width, entry.contentRect.height, devicePixelRatio || 1);
    schedule();
  });
  ro?.observe(el);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  schedule();

  return {
    reducedMotion: !motion.spin,
    flyTo: (target, options) => {
      flight?.resolve();
      const to = framingFor(target, base);
      if (options?.animate === false || !motion.spin) {
        flight = null;
        framing = to;
        schedule();
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        flight = { from: framing, to, start: null, resolve };
        schedule();
      });
    },
    setLit: (lit) => handle.setLevels(discLevels(lit ?? undefined)),
    onDiscBoxes: (listener) => {
      boxListeners.add(listener);
      return () => boxListeners.delete(listener);
    },
    onDiscPick: (listener) => {
      pickListeners.add(listener);
      return () => pickListeners.delete(listener);
    },
    pick: (x, y) => handle.pick(x, y),
    boxes: () => boxes,
    takeBoxes: (next) => {
      boxes = next;
      boxListeners.forEach((listener) => listener(next));
    },
    wake: schedule,
    dispose: () => {
      cancelAnimationFrame(raf);
      flight?.resolve();
      io?.disconnect();
      ro?.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
