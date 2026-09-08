import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

import {
  coreOrbVertex,
  coreOrbFragment,
  heartbeatAt,
} from "./coreOrbShaders";

/**
 * The WebGL half of the intelligence core.
 *
 * This component owns a canvas and nothing else — no layout, no copy, no
 * chrome. It fills its parent, paints a transparent background, and draws one
 * ring into it. The soft halo, the label and the role rotation all stay in the
 * DOM around it, which is what keeps the type sharp and the glow cheap.
 *
 * Four inputs drive the surface, and they are deliberately never allowed to
 * touch each other:
 *
 *   time    — the material flow and the orbiting highlight. Monotonic, never
 *             reset, so a click can't make the ring jump.
 *   energy  — one accumulating scalar that clicks add into and that decays on
 *             its own. It drives the ripple amplitude and the rotation.
 *   pulse   — the heartbeat. Independent of everything, always running.
 *   scroll  — where the hero is on screen. Recedes the ring as it leaves.
 *
 * Keeping them separate is what makes the interaction robust: clicking during
 * a scroll cannot reset the scroll position, scrolling cannot cancel a ripple,
 * and the heartbeat continues through both.
 */

export interface CoreOrbHandle {
  /**
   * Inject an activation impulse. `client` is a viewport-space point (a real
   * click or tap); omit it for keyboard activation. The ring's ripple is
   * radially symmetric, so the point is used for the recoil direction rather
   * than as a wave origin.
   */
  activate(client?: { x: number; y: number }): void;
}

export interface CoreOrbProps {
  /** Fires once the first frame is on screen, so the poster can fade out. */
  onReady?: () => void;
  /** Fires if WebGL never starts or the context is lost — poster stays up. */
  onFail?: () => void;
  /** Static, colour-only response. No ripple, no rotation, no idle loop. */
  reducedMotion?: boolean;
}

/* ── Tuning ────────────────────────────────────────────────────────────────
   Every number the look depends on, in one block, so the ring can be re-tuned
   without reading the shader. */
const TUNING = {
  /** Ring thinness. 0.4-0.9; higher is thinner. The reference ships 0.72. */
  innerRadius: 0.72,
  /** Ripple amplitude at full energy.
   *
   *  The reference ships 0.5, but it ripples on *hover* — a continuous state
   *  you can sit in and study. A click is a single discrete event that has to
   *  land, be understood, and be gone inside two seconds, so it has to be
   *  louder to read at all. Measured: 0.5 gives the ring silhouette a 1.4%
   *  deviation, which is visible only if you already know to look for it;
   *  this gives ~3%, which is unmistakable and still nowhere near the point
   *  where the ring stops reading as a ring. */
  hoverAmp: 1.15,
  glow: 1,
  colorStrength: 1,

  /** Energy added per activation, and its decay constant in seconds.
   *  0.62s puts the ripple at ~2% of peak by 2.4s — a smooth settle with no
   *  reset, which is what the brief asks for. */
  energyPerHit: 0.9,
  energyDecay: 0.52,
  /** How fast the shader's ripple follows the energy. The reference eases its
   *  hover with a ~158ms time constant; matching it keeps the build-in around
   *  the 120-200ms the brief specifies rather than snapping on. */
  energyFollow: 6.32,

  /** Radians per second the ring turns while it has energy in it. */
  rotateRate: 0.42,

  /** Recoil: a small bodily shove, applied to the canvas element rather than
   *  in the shader, so it composes with the scroll transform instead of
   *  fighting the ring's own coordinate space. */
  recoilPx: 7,
  recoilStiffness: 120,
  recoilDamping: 0.8,

  /** The hero-to-next-section handoff. `hold` is the fraction of the travel
   *  the ring stays put for while the hero copy clears — without it the ring
   *  starts receding the instant a reader nudges the wheel, which reads as the
   *  page being unstable rather than as a camera move. */
  scrollHold: 0.18,

  maxDpr: 2,
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const CoreOrb = forwardRef<CoreOrbHandle, CoreOrbProps>(function CoreOrb(
  { onReady, onFail, reducedMotion = false },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const activateRef = useRef<
    ((client?: { x: number; y: number }) => void) | null
  >(null);

  useImperativeHandle(
    ref,
    () => ({ activate: (client) => activateRef.current?.(client) }),
    [],
  );

  // Callbacks are read through refs so changing an inline arrow prop can never
  // tear the scene down and rebuild it.
  const onReadyRef = useRef(onReady);
  const onFailRef = useRef(onFail);
  onReadyRef.current = onReady;
  onFailRef.current = onFail;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // ogl throws rather than returning a null context when WebGL is
    // unavailable, but it does so a line *after* assigning it — so guard both.
    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: false, // a full-screen fragment shader has no edges to alias
        dpr: Math.min(window.devicePixelRatio || 1, TUNING.maxDpr),
      });
      if (!renderer.gl) throw new Error("no webgl context");
    } catch {
      onFailRef.current?.();
      return;
    }

    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    gl.clearColor(0, 0, 0, 0);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const geometry = new Triangle(gl);

    let program: Program;
    try {
      program = new Program(gl, {
        vertex: coreOrbVertex,
        fragment: coreOrbFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: [1, 1, 1] },
          uHover: { value: 0 },
          uHoverAmp: { value: reducedMotion ? 0 : TUNING.hoverAmp },
          uRot: { value: 0 },
          uPulse: { value: 0 },
          uGlow: { value: TUNING.glow },
          uColorStrength: { value: TUNING.colorStrength },
          uInnerRadius: { value: TUNING.innerRadius },
          uOpacity: { value: 1 },
          uScroll: { value: 0 },
          // Ziiro's duotone, not the reference's green and gold.
          uColorA: { value: hexToRgb("#8c6aff") },
          uColorB: { value: hexToRgb("#ff8a3d") },
          uCore: { value: hexToRgb("#0a0711") },
        },
      });
    } catch {
      geometry.remove();
      if (canvas.parentNode === host) host.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      onFailRef.current?.();
      return;
    }

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      program.uniforms.iResolution.value = [
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        1,
      ];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ── Activation ────────────────────────────────────────────────────────
    let energy = 0;
    let hover = 0;
    let rotation = 0;
    const recoil = { x: 0, y: 0, vx: 0, vy: 0 };

    const activate = (client?: { x: number; y: number }) => {
      // Diminishing returns while the ring is already hot: a rapid tapper adds
      // motion but can never drive it anywhere near instability.
      energy = Math.min(1, energy + TUNING.energyPerHit * (1 - 0.45 * energy));

      if (!reducedMotion && client) {
        // The shove is away from the point of contact. The ripple stays the
        // loudest part of the response; this is a garnish.
        const r = canvas.getBoundingClientRect();
        const dx = (client.x - (r.left + r.width / 2)) / (r.width / 2 || 1);
        const dy = (client.y - (r.top + r.height / 2)) / (r.height / 2 || 1);
        const m = Math.min(1, Math.hypot(dx, dy)) || 0;
        const n = m > 0 ? 1 / (Math.hypot(dx, dy) || 1) : 0;
        recoil.vx += -dx * n * m * TUNING.recoilPx * 26;
        recoil.vy += -dy * n * m * TUNING.recoilPx * 26;
      }

      if (!running) start();
    };
    activateRef.current = activate;

    // ── Scroll handoff ────────────────────────────────────────────────────
    // Computed in the scroll handler, not the frame loop: getBoundingClientRect
    // forces layout, and doing that every frame is exactly how a smooth scene
    // becomes a stuttering one.
    let scrollP = 0;
    const readScroll = () => {
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const raw = Math.min(1, Math.max(0, -rect.top / (vh * 0.85)));
      const h = TUNING.scrollHold;
      const t = raw <= h ? 0 : (raw - h) / (1 - h);
      scrollP = t * t * (3 - 2 * t);
    };
    readScroll();

    // ── Frame driver ──────────────────────────────────────────────────────
    let raf = 0;
    let running = false;
    let last = 0;
    let clock = 2.2; // the reference starts mid-cycle, so the ring opens lit
    let ready = false;
    let visible = true;
    let onScreen = true;

    const stiffness = TUNING.recoilStiffness;
    const damp = 2 * Math.sqrt(stiffness) * TUNING.recoilDamping;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      // Clamped: a backgrounded tab that comes back must not integrate a
      // ten-second step through the spring.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (dt <= 0) return;

      if (!reducedMotion) clock += dt;

      // Energy decays; the shader's ripple eases toward it rather than
      // tracking it exactly, which is what gives the 120-200ms build-in.
      energy *= Math.exp(-dt / TUNING.energyDecay);
      if (energy < 0.001) energy = 0;
      hover += (energy - hover) * (1 - Math.exp(-TUNING.energyFollow * dt));
      if (hover < 0.0005 && energy === 0) hover = 0;

      if (!reducedMotion) {
        rotation += TUNING.rotateRate * dt * hover;

        // Recoil spring, semi-implicit Euler. On the canvas element, not in
        // the shader, so it composes with the scroll transform.
        const step = (p: number, v: number) => {
          const nv = v + (-stiffness * p - damp * v) * dt;
          return [p + nv * dt, nv] as const;
        };
        [recoil.x, recoil.vx] = step(recoil.x, recoil.vx);
        [recoil.y, recoil.vy] = step(recoil.y, recoil.vy);
        canvas.style.transform =
          Math.abs(recoil.x) + Math.abs(recoil.y) > 0.05
            ? `translate3d(${recoil.x.toFixed(2)}px, ${recoil.y.toFixed(2)}px, 0)`
            : "";
      }

      program.uniforms.iTime.value = clock;
      program.uniforms.uHover.value = reducedMotion ? 0 : hover;
      program.uniforms.uRot.value = rotation;
      program.uniforms.uPulse.value = reducedMotion
        ? 0
        : heartbeatAt(clock);
      program.uniforms.uScroll.value = scrollP;
      // Under reduced motion the only response to a click is a brightness
      // lift — no wobble, no recoil, no rotation.
      program.uniforms.uGlow.value = reducedMotion
        ? TUNING.glow * (1 + hover * 0.35)
        : TUNING.glow;

      renderer.render({ scene: mesh });

      if (!ready) {
        ready = true;
        onReadyRef.current?.();
      }

      // Reduced motion has nothing continuous to draw. Once the response has
      // settled, park the loop entirely rather than spinning on a still frame.
      if (reducedMotion && energy === 0 && hover === 0) stop();
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    /** Run only when the ring is both on screen and in a visible tab. */
    const sync = () => {
      const shouldRun =
        visible && onScreen && (!reducedMotion || energy > 0 || hover > 0);
      if (shouldRun) start();
      else if (running) stop();
    };

    const onScroll = () => {
      readScroll();
      if (!running) {
        // A parked scene still has to follow the scroll.
        program.uniforms.uScroll.value = scrollP;
        renderer.render({ scene: mesh });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    start();

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    io.observe(host);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      onFailRef.current?.();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      stop();
      activateRef.current = null;
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      geometry.remove();
      program.remove();
      if (canvas.parentNode === host) host.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Reduced motion changes the scene's whole character, so a change there
    // legitimately rebuilds it. Nothing else in this effect is reactive.
  }, [reducedMotion]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    />
  );
});

export default CoreOrb;
