import { useEffect, useRef } from "react";

/**
 * ── GRID LIFT ─────────────────────────────────────────────────────────
 * Meaning, per the motion system: "structure emerging."
 *
 * A quiet technical field of dots with the Ziiro mark standing in it. The mark
 * is always legible; moving a pointer across the field sharpens it to full ink
 * and lifts the dots under the cursor toward it.
 *
 * THE MARK IS NOT REDRAWN. public/logo/ziiro-mark.svg is rasterised once into
 * a small offscreen canvas at grid resolution and sampled for coverage, so the
 * dots that belong to the mark are decided by the real vector geometry. Change
 * the logo and this follows it. It costs the bundle nothing and is fetched
 * only when the section is near the viewport.
 *
 * ── WHAT THE FIRST VERSION GOT WRONG ──────────────────────────────────
 * It shipped as an even grey rectangle, and the complaint was simply "why so
 * plain". Two separate mistakes, both fixed here:
 *
 *   1. AT REST, A MARK DOT DIFFERED FROM A FIELD DOT BY ALPHA 0.3 VS 0.2 AND
 *      NOTHING ELSE. Same radius, a tenth of alpha apart, on dots barely two
 *      pixels wide. There was nothing to see until a pointer happened to cross
 *      it, which meant a reader saw a dead rectangle, a phone saw that forever
 *      because there is no hover, and a screenshot showed nothing. The mark now
 *      differs in SIZE as well as ink, which is what actually reads at this
 *      scale, and it is present before anyone touches it.
 *   2. COVERAGE WAS USED AS A CONTINUOUS MULTIPLIER. Every dot on the edge of
 *      the mark was drawn at half strength, so the shape had no edge and
 *      resolved into a soft radial cloud rather than a Z. Coverage is now put
 *      through a steep smoothstep, so a dot is essentially in the mark or out
 *      of it and the silhouette has a boundary.
 *
 * ── THE RESTING STATE: PERMANENT PRESENCE, PLUS ONE ENTRANCE ──────────
 * The mark is permanently legible at low contrast, and additionally resolves
 * once as the section first scrolls into view before settling back to that
 * resting presence.
 *
 * Permanent presence is the load-bearing half, chosen over a reveal alone
 * because it is the only option that is still true for a reader who never
 * hovers, never scrolls past slowly, or arrives at a screenshot. It also costs
 * nothing: no loop runs at rest, so an idle section on screen is zero CPU.
 * The one-shot entrance is on top of that because the idea of this component
 * is structure emerging from information, and performing it once says that
 * better than a static picture can. It fires a single time and decays; it is
 * NOT an oscillation, which is the thing the reduced-motion guidance warns
 * against, and it is skipped entirely under reduced motion.
 *
 * ── TOUCH ─────────────────────────────────────────────────────────────
 * A phone has no hover, so on a coarse pointer the resolution is driven by
 * SCROLL instead: the mark comes up as the section reaches the middle of the
 * viewport and eases back as it leaves. Same idea, same continuity, no
 * gesture required, and it degrades to the permanent presence if the reader
 * stops scrolling anywhere.
 *
 * ── APPLE RULES ───────────────────────────────────────────────────────
 *   - Continuous during the movement: every dot eases from its CURRENT value
 *     each frame, so the field animates during a gesture rather than settling
 *     after it, and can be reversed mid-flight because there is no animation
 *     object to cancel.
 *   - No strobing: travel is capped by LIFT_MAX and a frame may only close
 *     EASE of the remaining distance, bounding single-frame displacement to
 *     roughly a pixel.
 *   - Transform and opacity only. On a canvas that is position and alpha.
 *     Nothing animates a colour.
 *   - Reduced motion resolves rather than doing nothing: it draws the finished
 *     state once, no loop, no listeners.
 */

/** Target gap between dots, in CSS pixels. Recomputed to fit the box exactly.
 *  At 22 the mark was ~13 dots tall and read as a smudge; 14 gives it ~23 rows,
 *  which is where the two wedges separate and the form is unambiguous. */
const GAP = 14;

/** Field dots: small and quiet. They are the "information". */
const DOT_R = 0.9;
const FIELD_ALPHA = 0.13;
/** The most a field dot grows and brightens directly under the pointer. */
const DOT_R_LIFT = 1.5;
const FIELD_LIFT_ALPHA = 0.22;

/** Mark dots: bigger and darker than the field even at rest. Size is doing
 *  most of the work here. Two dots a tenth of an alpha apart are the same dot;
 *  two dots at 0.9 and 1.9 radius are visibly different marks on the page. */
const MARK_R_REST = 1.9;
const MARK_R_FULL = 2.6;
const MARK_REST = 0.5;
const MARK_ALPHA = 1;

/** Coverage below LO is out of the mark, above HI is in, and the narrow band
 *  between is the only place a partial dot is drawn. This is what gives the
 *  silhouette an edge instead of a gradient. */
const COVER_LO = 0.34;
const COVER_HI = 0.62;

/** The furthest a dot travels toward the pointer. Small on purpose. */
const LIFT_MAX = 7;
/** Pointer radius of influence, in CSS pixels. */
const REACH = 210;
/** Fraction of the remaining distance a dot may cover in one frame. */
const EASE = 0.19;
/** Height of the canvas box, in CSS pixels, per breakpoint. */
const H_DESKTOP = 380;
const H_MOBILE = 260;
/** Share of the box height the mark spans. */
const MARK_SCALE = 0.86;
/** Below this, a value is settled and the frame can be skipped. */
const SETTLED = 0.002;
/** The one-shot entrance: time to resolve, hold, and fall back, in ms. */
const INTRO_UP = 900;
const INTRO_HOLD = 550;
const INTRO_DOWN = 1100;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Smooth 0..1 ramp between two edges. */
const smoothstep = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

export default function GridLift({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /** A real pointer that can hover. Anything else drives from scroll. */
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let ink = getComputedStyle(canvas).color;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    /** Mark membership per dot after thresholding, 0..1, row-major. */
    let mask: Float32Array = new Float32Array(0);
    /** Per-dot current lift, eased toward its target each frame. */
    let lift: Float32Array = new Float32Array(0);
    let pointerX = -1e4;
    let pointerY = -1e4;
    /** Global resolution: pointer present, or scroll position on touch. */
    let engage = 0;
    /** The one-shot entrance, 0..1. Never loops. */
    let intro = 0;
    let introStart = 0;
    let introDone = reduced;
    let raf = 0;
    let running = false;
    let maskReady = false;
    let armed = false;

    const layout = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = window.innerWidth < 640 ? H_MOBILE : H_DESKTOP;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.max(2, Math.round(w / GAP));
      rows = Math.max(2, Math.round(h / GAP));
      offX = (w - (cols - 1) * (w / cols)) / 2;
      offY = (h - (rows - 1) * (h / rows)) / 2;
      lift = new Float32Array(cols * rows);
      mask = new Float32Array(cols * rows);
      maskReady = false;
    };

    const dotX = (c: number) => offX + c * (w / cols);
    const dotY = (r: number) => offY + r * (h / rows);

    /**
     * Rasterise the mark at grid resolution and threshold the coverage. One
     * pixel per dot, so the browser's own downscale does the area averaging
     * and the smoothstep then decides membership.
     */
    const buildMask = (img: HTMLImageElement) => {
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      const side = h * MARK_SCALE;
      const dw = (side / w) * cols;
      const dh = (side / h) * rows;
      octx.clearRect(0, 0, cols, rows);
      // Half a cell left and up: pixel c is centred at c + 0.5 in this canvas
      // while dot c sits at exactly c in the field.
      octx.drawImage(img, (cols - dw) / 2 - 0.5, (rows - dh) / 2 - 0.5, dw, dh);
      const data = octx.getImageData(0, 0, cols, rows).data;
      for (let i = 0; i < cols * rows; i++) {
        mask[i] = smoothstep(COVER_LO, COVER_HI, data[i * 4 + 3] / 255);
      }
      maskReady = true;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      // The strongest of: this dot's own lift, the global engagement, and the
      // one-shot entrance. Whichever is resolving the mark hardest wins.
      const global = engage > intro ? engage : intro;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const m = mask[i];
          const l = lift[i];
          const up = l > global ? l : global;

          let x = dotX(c);
          let y = dotY(r);
          if (l > 0) {
            const dx = pointerX - x;
            const dy = pointerY - y;
            const d = Math.hypot(dx, dy) || 1;
            const travel = LIFT_MAX * l;
            x += (dx / d) * travel;
            y += (dy / d) * travel;
          }

          // Field and mark are two different dots, interpolated by membership.
          const fieldA = FIELD_ALPHA + (FIELD_LIFT_ALPHA - FIELD_ALPHA) * l;
          const fieldR = DOT_R + (DOT_R_LIFT - DOT_R) * l;
          const markA = MARK_REST + (MARK_ALPHA - MARK_REST) * up;
          const markR = MARK_R_REST + (MARK_R_FULL - MARK_R_REST) * up;

          const a = fieldA + (markA - fieldA) * m;
          const rad = fieldR + (markR - fieldR) * m;

          ctx.globalAlpha = clamp01(a);
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    /** The finished state: mark at full ink, field at rest, nothing displaced.
     *  Also what reduced motion gets. */
    const drawResolved = () => {
      for (let i = 0; i < lift.length; i++) lift[i] = 0;
      engage = 1;
      intro = 0;
      pointerX = -1e4;
      pointerY = -1e4;
      draw();
    };

    /** On a coarse pointer, resolution follows the section through the
     *  viewport: full in the middle, easing off at the edges. */
    const scrollEngage = () => {
      const r = canvas.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const centre = r.top + r.height / 2;
      const off = Math.abs(centre - vh / 2) / (vh / 2 + r.height / 2);
      return clamp01(1 - off * 1.35);
    };

    const frame = () => {
      let moved = false;

      if (!introDone) {
        const t = performance.now() - introStart;
        const next =
          t < INTRO_UP
            ? smoothstep(0, 1, t / INTRO_UP)
            : t < INTRO_UP + INTRO_HOLD
              ? 1
              : 1 - smoothstep(0, 1, (t - INTRO_UP - INTRO_HOLD) / INTRO_DOWN);
        if (t > INTRO_UP + INTRO_HOLD + INTRO_DOWN) {
          intro = 0;
          introDone = true;
        } else intro = clamp01(next);
        moved = true;
      }

      const target = fine ? (pointerX > -1e3 ? 1 : 0) : scrollEngage();
      const nextEngage = engage + (target - engage) * EASE;
      if (Math.abs(nextEngage - engage) > SETTLED) moved = true;
      engage = nextEngage;

      if (fine) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const d = Math.hypot(dotX(c) - pointerX, dotY(r) - pointerY);
            const t = d > REACH ? 0 : 1 - d / REACH;
            const next = lift[i] + (t - lift[i]) * EASE;
            if (Math.abs(next - lift[i]) > SETTLED) moved = true;
            lift[i] = next;
          }
        }
      }

      if (moved) draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointerX = -1e4;
      pointerY = -1e4;
    };

    // Nothing is fetched, rasterised or started until the section is near the
    // viewport: this must not sit on the critical path.
    const arm = () => {
      if (armed) return;
      armed = true;
      layout();
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        buildMask(img);
        if (reduced) drawResolved();
        else {
          // Draw the resting presence immediately, then run the entrance once.
          draw();
          introStart = performance.now();
        }
      };
      // Same-origin asset, so reading the offscreen pixels back is allowed.
      img.src = "/logo/ziiro-mark.svg";
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          arm();
          start();
        } else stop();
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);

    const reload = (after: () => void) => {
      const img = new Image();
      img.onload = () => {
        buildMask(img);
        after();
      };
      img.src = "/logo/ziiro-mark.svg";
    };

    const onResize = () => {
      if (!armed) return;
      layout();
      reload(() => (reduced ? drawResolved() : draw()));
    };

    const themeObserver = new MutationObserver(() => {
      ink = getComputedStyle(canvas).color;
      // Repaint rather than only re-reading: under reduced motion there is no
      // loop to pick the new ink up.
      if (reduced) drawResolved();
      else draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    if (!reduced && fine) {
      canvas.addEventListener("pointermove", onPointer, { passive: true });
      canvas.addEventListener("pointerleave", onLeave, { passive: true });
    }
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      io.disconnect();
      themeObserver.disconnect();
      stop();
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A field of dots with the Ziiro mark standing in it, which sharpens as the pointer moves across it."
        className="block w-full text-[var(--text-primary)]"
        style={{ height: H_DESKTOP }}
      />
    </div>
  );
}
