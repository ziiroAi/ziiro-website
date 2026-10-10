// (C) W14-C §2: what moves the live spine, on the main thread. A drag turns it (orbit.ts), a flight moves the camera
// (camera.ts), and each animation frame sends one View to the renderer. The loop runs only while something moves and
// the viewer is on screen in a visible tab (render on demand). It also implements the viewer API (api.ts).
// W14-O: the idle spin runs only in a focused page, at 30 fps at most on a phone, and stops for good on a GPU whose
// first frames come too slowly (pace.ts); a drag, a fling or a flight still draws.
// W15-C4: the idle motion is a sweep across the side and front (sweep.ts), never a full turn: from behind the model
// reads as lumps. A drag still turns it freely all the way round.
// W23-C: the sway comes to rest a few seconds after the last scroll, drag or hover, so an idle page draws nothing; the
// phone's 30 fps cap holds for the sway alone, a scroll draws every display frame; and a phone scroll whose frames miss
// their budget draws at 1 device pixel per CSS pixel until it rests (full quality at rest, always).
import type { DiscId } from "../data/contract";
import { themeFadeNow } from "../flow/theme";
import type { DiscPickEvent, SpineViewerApi, StagePose } from "./api";
import { baseFraming, blendFraming, easeInOut, FLIGHT_MS, framingFor, type Framing } from "./camera";
import type { SpineHandle } from "./host";
import { discLevels } from "./levels";
import { dragBy, grab, release, REST, step, type Motion } from "./orbit";
import { isTooSlow, median, SAMPLE_FRAMES, spinFrameMsFor } from "./pace";
import { pickDisc, screenDisc } from "./plan/tap";
import { variantNow } from "./plan/targets";
import type { MeshSize } from "./rules";
import type { DiscBox } from "./scene";
import { enterSweep, settleSweep, stepSweep, type Sweep } from "./sweep";

/** A press that moved less than this and lasted less than TAP_MS is a tap, not a drag. */
const TAP_SLOP_PX = 8;
const TAP_MS = 500;
const FRAME_MS = 16;
/** A long gap between frames (a stalled tab) counts as this, so nothing jumps. */
const MAX_FRAME_MS = 64;
/** A capped spin draws a frame this much early rather than skip a whole display frame for a millisecond's jitter. */
const CAP_SLACK_MS = 4;
/** W23-C: the sway sets off for its rest this long after the last input; it rests one leg and a half later at most. */
export const SWAY_REST_AFTER_MS = 8_000;
/** W23-C: a phone scroll whose median frame over the last BUDGET_FRAMES is over SCROLL_BUDGET_MS draws at LOW_DPR. */
const SCROLL_BUDGET_MS = 20;
const BUDGET_FRAMES = 8;
const LOW_DPR = 1;
/** W23-C, W23-C3 M2: no scroll frame for this long is rest, and the full pixel ratio comes back. Long enough to hold the
 *  low ratio through a train of short scrolls, so each switch (a whole composer rebuilt) happens once a train, not a burst. */
export const SCROLL_REST_MS = 1_500;

export interface DrivePace {
  /** False where the idle spin must never run (a software renderer). */
  idleSpin: boolean;
  /** The idle spin has stopped for good: its first frames came too slowly. */
  onSpinOff?(): void;
  /** W18-C: the framing the first frame was drawn at (the plan's hero, which its still shows); r17's when absent. */
  framing?: Framing;
}

export interface Drive extends SpineViewerApi {
  /** Feeds the boxes the renderer returned for the frame it drew, with the worker's own frame time off the main
   *  thread (W14-U M1). */
  takeBoxes(boxes: readonly DiscBox[], frameMs?: number): void;
  /** Draws a frame if nothing else will, after a resize or a theme change. */
  wake(): void;
  /** Reduced motion turned on or off while it runs (W14-V T8). */
  setMotion(next: Motion): void;
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

const TURN = 2 * Math.PI;

/** A held flight's turn back to the side view: from where the spin left it to the nearest whole turn (W14-X). */
interface Turn {
  fromYaw: number;
  fromPitch: number;
  toYaw: number;
}

interface Flight {
  from: Framing;
  to: Framing;
  start: number | null;
  turn: Turn | null;
  resolve(): void;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function createDrive(
  el: HTMLElement,
  handle: SpineHandle,
  size: MeshSize,
  initialMotion: Motion,
  pace: DrivePace = { idleSpin: true },
): Drive {
  let motion = initialMotion;
  let orbit = REST;
  let framing: Framing = pace.framing ?? baseFraming(size);
  let flight: Flight | null = null;
  let press: Press | null = null;
  let hovered: DiscId | null = null;
  let boxes: readonly DiscBox[] = [];
  let raf = 0;
  let last = 0;
  let visible = true;
  /** W23-C: the stage's own say (setShown): a faded-out stage draws nothing. */
  let shown = true;
  /** Set once the GPU proved too slow for the idle spin: it stays off for good (W14-O). */
  let tooSlow = false;
  const spinAllowed = () => motion.spin && pace.idleSpin && !tooSlow;
  let spin = spinAllowed();
  /** At a tour stop: the model holds its side view, with no idle spin, until a flight without hold (W14-X). */
  let holding = false;
  /** The idle sweep under way; null while anything else moves it, so it starts again from where that left it. */
  let sweep: Sweep | null = null;
  /** W15-B, scrubbed by the scroll: how far the model is turned to its side view (0 to 1), and the turn that takes,
   *  fixed when the hold began so a drag while held still turns it. */
  let scrubHold = 0;
  let holdTurn = 0;
  /** W16-A, W17-S: the plan stage's extra turn (setPose). */
  let pose: StagePose = { turn: 0 };
  let focused = document.hasFocus();
  /** The previous animation frame while the loop runs, and the frame times until the GPU is judged. */
  let lastFrame = 0;
  let frameMs: number[] = [];
  /** Judged only where the spin can ever run; a reader may turn reduced motion off later (T8). */
  let judged = !pace.idleSpin;
  const spinFrameMs = spinFrameMsFor(size);
  /** W23-C: the last input (scroll, drag, hover, focus), when the sway rested, and whether this frame was asked for by
   *  something other than the sway (the phone's cap is for the sway alone). */
  let lastInput = performance.now();
  let rested = false;
  let moved = false;
  /** W23-C: a phone scroll's frame times, and whether it draws at LOW_DPR now. */
  let scrollMs: number[] = [];
  let lowRes = false;
  let restTimer: ReturnType<typeof setTimeout> | null = null;
  let px = (() => {
    const { width, height } = el.getBoundingClientRect();
    return { width, height };
  })();
  const fullDpr = () => devicePixelRatio || 1;
  const boxListeners = new Set<(boxes: readonly DiscBox[]) => void>();
  const pickListeners = new Set<(event: DiscPickEvent) => void>();

  const running = () => visible && shown && document.visibilityState !== "hidden";
  const schedule = () => {
    if (!raf && running()) raf = requestAnimationFrame(tick);
  };

  function advanceFlight(now: number): boolean {
    if (!flight) return false;
    flight.start ??= now;
    const t = Math.min((now - flight.start) / FLIGHT_MS, 1);
    framing = blendFraming(flight.from, flight.to, easeInOut(t));
    const { turn } = flight;
    if (turn && !orbit.held) {
      orbit = { ...orbit, yaw: lerp(turn.fromYaw, turn.toYaw, easeInOut(t)), pitch: lerp(turn.fromPitch, 0, easeInOut(t)) };
    }
    if (t < 1) return true;
    flight.resolve();
    flight = null;
    return false;
  }

  /** W23-C: an input: the sway, if rested, sets off again from where it is. */
  function poke(): void {
    lastInput = performance.now();
    // W23-C3 L1: a settling sway too: it carries on from where it is (re-entry is smooth), and rests a while later.
    if (rested || sweep?.settling) sweep = null;
    rested = false;
  }

  /** W23-C: the pixel ratio back to full once the scroll rests. */
  function restore(): void {
    restTimer = null;
    scrollMs = [];
    if (!lowRes) return;
    // W23-C3 L2: a resize would cut a running theme crossfade; come back once it is over.
    if (themeFadeNow()) {
      restTimer = setTimeout(restore, SCROLL_REST_MS);
      return;
    }
    lowRes = false;
    handle.resize(px.width, px.height, fullDpr());
  }

  /** W23-C: a scroll frame's time. A phone scroll over budget drops to LOW_DPR once, till it rests. */
  function budget(ms: number): void {
    if (size !== "phone" || !restTimer || lowRes || fullDpr() <= LOW_DPR || themeFadeNow()) return;
    scrollMs = [...scrollMs, ms].slice(-BUDGET_FRAMES);
    if (scrollMs.length < BUDGET_FRAMES || median(scrollMs) <= SCROLL_BUDGET_MS) return;
    lowRes = true;
    handle.resize(px.width, px.height, LOW_DPR);
  }

  /** W23-C: a frame the scroll asked for; the rest timer runs from the last one. */
  function scrolled(): void {
    moved = true;
    poke();
    if (restTimer !== null) clearTimeout(restTimer);
    restTimer = setTimeout(restore, SCROLL_REST_MS);
  }

  /** One frame's time; the spin turns off for good once the first SAMPLE_FRAMES are too slow. */
  function judge(ms: number): void {
    if (judged) return;
    frameMs = [...frameMs, ms];
    if (frameMs.length < SAMPLE_FRAMES) return;
    judged = true;
    if (!isTooSlow(frameMs)) return;
    tooSlow = true;
    spin = false;
    pace.onSpinOff?.();
  }

  /**
   * On the main thread a frame's time is the gap between animation frames. Off it (the worker), those gaps stay near
   * 16 ms however slow the GPU is, so the worker reports its own frame time with its boxes (takeBoxes).
   */
  function timeFrame(now: number): void {
    if (!handle.offThread && lastFrame) {
      judge(now - lastFrame);
      budget(now - lastFrame);
    }
    lastFrame = now;
  }

  /** Stops the loop where it is, so the next schedule() starts it again (W14-V T1: a cancelled id once blocked it). */
  function stopLoop(): void {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    lastFrame = 0;
  }

  /** Only the idle spin is moving it: nobody holds it, it isn't flung and no flight runs. */
  const spinOnly = () => !orbit.held && !flight && !orbit.yawSpeed && !orbit.pitchSpeed;

  function tick(now: number): void {
    raf = 0;
    timeFrame(now);
    const idle = spin && focused && !holding && !rested;
    const askedFor = moved;
    moved = false;
    if (idle && !askedFor && spinOnly() && last && now - last < spinFrameMs - CAP_SLACK_MS) {
      schedule();
      return;
    }
    const dt = last ? Math.min(now - last, MAX_FRAME_MS) : FRAME_MS;
    last = now;
    const stepped = step(orbit, dt, { ...motion, spin: false });
    orbit = stepped.orbit;
    const flying = advanceFlight(now);
    const sweeping = idle && spinOnly();
    if (sweeping) {
      const from = sweep ?? enterSweep(orbit.yaw);
      const settle = !from.settling && performance.now() - lastInput >= SWAY_REST_AFTER_MS;
      const next = stepSweep(settle ? settleSweep(from) : from, dt);
      sweep = next.rested ? null : next.sweep;
      rested = next.rested;
      orbit = { ...orbit, yaw: next.yaw };
    } else if (!rested) sweep = null;
    handle.render({
      yaw: orbit.yaw + holdTurn * scrubHold + pose.turn,
      pitch: orbit.pitch * (1 - scrubHold),
      framing,
    });
    if (stepped.moving || (sweeping && !rested) || flying || orbit.held) schedule();
    else {
      last = 0;
      lastFrame = 0;
    }
  }

  const local = (event: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const boxOf = (disc: DiscId | null) => boxes.find((box) => box.disc === disc) ?? null;
  const emit = (event: DiscPickEvent) => pickListeners.forEach((listener) => listener(event));

  /** W14-V T3: one tap rule, tap.ts's: a phone takes only a disc 44 px or more on screen, desktop pads every disc to
   *  44 × 44 around its centre (§6.2, §11.3), for a mouse, a pen or a touch alike. */
  function discAt(x: number, y: number): DiscId | null {
    const { width, height } = el.getBoundingClientRect();
    return pickDisc({ x, y }, boxes.map(screenDisc), variantNow(), { width, height });
  }

  function tapAt(x: number, y: number): void {
    const disc = discAt(x, y);
    const box = boxOf(disc);
    if (disc && box) emit({ disc, via: "tap", box });
  }

  function hoverAt(x: number, y: number): void {
    if (!pickListeners.size) return;
    const disc = discAt(x, y);
    if (disc === hovered) return;
    hovered = disc;
    emit({ disc, via: "hover", box: boxOf(disc) });
  }

  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button > 0) return;
    const { x, y } = local(event);
    press = { id: event.pointerId, type: event.pointerType, x, y, t: event.timeStamp, startX: x, startY: y, startT: event.timeStamp };
    orbit = grab(orbit);
    poke();
    el.setPointerCapture?.(event.pointerId);
    schedule();
  };

  const onMove = (event: PointerEvent) => {
    const { x, y } = local(event);
    if (!press || event.pointerId !== press.id) {
      if (event.pointerType !== "mouse") return;
      hoverAt(x, y);
      // W23-C: a hover wakes a rested sway.
      poke();
      schedule();
      return;
    }
    poke();
    orbit = dragBy(orbit, x - press.x, y - press.y, event.timeStamp - press.t);
    press = { ...press, x, y, t: event.timeStamp };
    schedule();
  };

  const onUp = (event: PointerEvent) => {
    if (!press || event.pointerId !== press.id) return;
    const { x, y } = local(event);
    const still = Math.hypot(x - press.startX, y - press.startY) < TAP_SLOP_PX;
    if (event.type === "pointerup" && still && event.timeStamp - press.startT < TAP_MS) tapAt(x, y);
    orbit = release(orbit, motion);
    press = null;
    poke();
    schedule();
  };

  const onLeave = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || hovered === null) return;
    hovered = null;
    emit({ disc: null, via: "hover", box: null });
  };

  const onVisibility = () => {
    if (!running()) return stopLoop();
    poke();
    schedule();
  };
  // Out of focus the spin's next frame is its last; back in focus it carries on.
  const onBlur = () => (focused = false);
  const onFocus = () => {
    focused = true;
    poke();
    schedule();
  };
  const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    onVisibility();
  });
  io?.observe(el);
  const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(([entry]) => {
    px = { width: entry.contentRect.width, height: entry.contentRect.height };
    handle.resize(px.width, px.height, lowRes ? LOW_DPR : fullDpr());
    schedule();
  });
  ro?.observe(el);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  schedule();

  return {
    get reducedMotion() {
      return !motion.spin;
    },
    scrub: (next, hold) => {
      flight?.resolve();
      flight = null;
      framing = next;
      const weight = Math.min(1, Math.max(0, hold));
      if (weight > 0 && scrubHold === 0) {
        holdTurn = Math.round(orbit.yaw / TURN) * TURN - orbit.yaw;
        orbit = { ...orbit, yawSpeed: 0, pitchSpeed: 0 };
      }
      if (weight === 0) holdTurn = 0;
      scrubHold = weight;
      holding = weight > 0;
      scrolled();
      schedule();
    },
    setPose: (next) => {
      pose = { turn: next.turn };
      scrolled();
      schedule();
    },
    flyTo: (target, options) => {
      flight?.resolve();
      scrubHold = 0;
      holdTurn = 0;
      const to = framingFor(target, size);
      poke();
      holding = options?.hold === true;
      const turn = holding ? { fromYaw: orbit.yaw, fromPitch: orbit.pitch, toYaw: Math.round(orbit.yaw / TURN) * TURN } : null;
      if (turn) orbit = { ...orbit, yawSpeed: 0, pitchSpeed: 0 };
      if (options?.animate === false || !motion.spin) {
        flight = null;
        framing = to;
        if (turn) orbit = { ...orbit, yaw: turn.toYaw, pitch: 0 };
        schedule();
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        flight = { from: framing, to, start: null, turn, resolve };
        schedule();
      });
    },
    setShown: (next) => {
      if (next === shown) return;
      shown = next;
      onVisibility();
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
    takeBoxes: (next, frameMs) => {
      boxes = next;
      if (handle.offThread && frameMs !== undefined) {
        judge(frameMs);
        budget(frameMs);
      }
      boxListeners.forEach((listener) => listener(next));
    },
    wake: schedule,
    setMotion: (next) => {
      motion = next;
      spin = spinAllowed();
      poke();
      schedule();
    },
    dispose: () => {
      stopLoop();
      if (restTimer !== null) clearTimeout(restTimer);
      flight?.resolve();
      io?.disconnect();
      ro?.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    },
  };
}
