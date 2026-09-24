/**
 * The brain's turn: one clock for the Spline scene and the department orbit.
 *
 * The brain reads its pose from here every animation frame, and HeroBrain
 * scrubs the orbit from the same turn in the same frame, so the two cannot
 * drift apart. The scene's own baked motion is switched off in SplineBrain for
 * the same reason. This module owns the numbers and the input, and knows
 * nothing about Spline or the DOM it is drawn into.
 *
 * - Auto-turn: one slow revolution about the vertical axis per `lapS`.
 * - Drag: the pointer turns it (yaw, plus pitch clamped to ±PITCH_MAX). On
 *   release it keeps the flick's speed, then eases back into the auto-turn.
 * - Hover: a few degrees of tilt toward the cursor, eased.
 * - `animate: false` (prefers-reduced-motion): no auto-turn, no inertia, no
 *   hover tilt. A drag still turns it, and it stays where it is left.
 *
 * Angles are radians. Yaw is the scene's rotation about its vertical axis.
 * Positive yaw carries the front of the brain to the viewer's right.
 */

export interface BrainPose {
  /** The brain's yaw, hover tilt included. */
  yaw: number;
  pitch: number;
  /** The turn alone, without the hover tilt: what the orbit follows, so a
   *  moving cursor does not nudge the departments back and forth. */
  turn: number;
}

export interface BrainMotion {
  /** Run the loop, if this is a context that should be moving. */
  start(): void;
  /** Stop the loop; the pose holds. */
  stop(): void;
  dispose(): void;
}

interface Options {
  /** The element that takes drags: the brain's hit area. */
  surface: HTMLElement;
  /** The element whose area gets the hover tilt. */
  stage: HTMLElement;
  startYaw: number;
  /** One revolution of the auto-turn, in seconds. */
  lapS: number;
  /** Start already turning at the auto-turn's speed, rather than easing in
   *  from rest: for taking over something that is already moving. */
  startMoving?: boolean;
  /** false under prefers-reduced-motion. */
  animate: boolean;
  onFrame: (pose: BrainPose) => void;
}

const deg = (d: number) => (d * Math.PI) / 180;

/** How quickly a flick's speed hands back to the auto-turn (time constant). */
const SETTLE_S = 1.1;
/** Drag sensitivity: 400px of travel is half a turn. */
const RAD_PER_PX = Math.PI / 400;
const PITCH_MAX = deg(20);
/** The fastest a flick can leave it spinning: half a turn per second. With
 *  SETTLE_S that lets the hardest flick coast about 200° before it settles,
 *  enough to feel thrown and not so much that it reads as a slot machine. */
const FLICK_MAX = Math.PI;
const HOVER_YAW = deg(5);
const HOVER_PITCH = deg(4);
/** Time constant for the hover tilt and for pitch settling back to level. */
const HOVER_S = 0.35;
const PITCH_SETTLE_S = 0.9;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Frame-rate-independent exponential approach. */
const approach = (from: number, to: number, dt: number, tau: number) =>
  from + (to - from) * (1 - Math.exp(-dt / tau));

export function createBrainMotion({
  surface,
  stage,
  startYaw,
  lapS,
  startMoving = false,
  animate,
  onFrame,
}: Options): BrainMotion {
  const autoRate = (2 * Math.PI) / lapS;
  let yaw = startYaw;
  let yawRate = animate && startMoving ? autoRate : 0;
  let pitch = 0;
  let hoverYaw = 0;
  let hoverPitch = 0;
  let hoverYawTarget = 0;
  let hoverPitchTarget = 0;

  let drag: { id: number; x: number; y: number; t: number; rate: number } | null = null;
  let raf = 0;
  let last = 0;
  let running = false;

  const emit = () =>
    onFrame({
      yaw: yaw + hoverYaw,
      pitch: clamp(pitch + hoverPitch, -PITCH_MAX, PITCH_MAX),
      turn: yaw,
    });

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    // Clamped, so a stall (a long task, a backgrounded tab) is not replayed
    // as one big jump.
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!drag) {
      yawRate = approach(yawRate, animate ? autoRate : 0, dt, SETTLE_S);
      yaw += yawRate * dt;
      if (animate) pitch = approach(pitch, 0, dt, PITCH_SETTLE_S);
    }
    hoverYaw = approach(hoverYaw, hoverYawTarget, dt, HOVER_S);
    hoverPitch = approach(hoverPitch, hoverPitchTarget, dt, HOVER_S);
    emit();
  };

  const start = () => {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // ── Drag ────────────────────────────────────────────────────────────────
  // The surface carries `touch-action: pan-y` (index.css), so on touch the
  // browser keeps every vertical swipe for the page scroll and only a clearly
  // sideways one reaches here. A scroll that wins sends pointercancel.
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, rate: 0 };
    surface.setPointerCapture(e.pointerId);
    surface.dataset.dragging = "";
    yawRate = 0;
    hoverYawTarget = hoverPitchTarget = 0;
    // Reduced motion runs no loop, so a drag drives the frames itself.
    if (!animate) emit();
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const dt = Math.max(1, e.timeStamp - drag.t) / 1000;
    yaw += dx * RAD_PER_PX;
    pitch = clamp(pitch + dy * RAD_PER_PX * 0.6, -PITCH_MAX, PITCH_MAX);
    // A smoothed rate, so the release speed is the flick, not the last
    // sample's jitter.
    drag.rate = drag.rate * 0.6 + ((dx * RAD_PER_PX) / dt) * 0.4;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.t = e.timeStamp;
    if (!animate) emit();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    // A pointer that paused before letting go has no flick left in it.
    const stale = e.timeStamp - drag.t > 80;
    yawRate = animate && !stale ? clamp(drag.rate, -FLICK_MAX, FLICK_MAX) : 0;
    drag = null;
    delete surface.dataset.dragging;
  };

  // ── Hover tilt ──────────────────────────────────────────────────────────
  const onHover = (e: PointerEvent) => {
    if (!animate || drag || e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    // Toward the cursor: the near side turns to face it.
    hoverYawTarget = nx * HOVER_YAW;
    hoverPitchTarget = ny * HOVER_PITCH;
  };
  const onLeave = () => {
    hoverYawTarget = hoverPitchTarget = 0;
  };

  surface.addEventListener("pointerdown", onDown);
  surface.addEventListener("pointermove", onMove);
  surface.addEventListener("pointerup", onUp);
  surface.addEventListener("pointercancel", onUp);
  surface.addEventListener("lostpointercapture", onUp);
  stage.addEventListener("pointermove", onHover);
  stage.addEventListener("pointerleave", onLeave);

  return {
    start() {
      if (animate) start();
    },
    stop,
    dispose() {
      stop();
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      surface.removeEventListener("pointercancel", onUp);
      surface.removeEventListener("lostpointercapture", onUp);
      stage.removeEventListener("pointermove", onHover);
      stage.removeEventListener("pointerleave", onLeave);
    },
  };
}
