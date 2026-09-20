import { useEffect, useRef } from "react";

/**
 * ── GRID LIFT ─────────────────────────────────────────────────────────
 * Meaning, per the motion system: "structure emerging."
 *
 * A quiet technical field of dots. Where the pointer passes, dots rise toward
 * it, and the ones that lie inside the Ziiro mark come up to full ink, so the
 * mark surfaces out of an even grid and sinks back as the pointer leaves.
 * Information, then structure. The interaction is the argument, which is why
 * there is no caption explaining it.
 *
 * THE MARK IS NOT REDRAWN. public/logo/ziiro-mark.svg is rasterised once into
 * a small offscreen canvas at grid resolution and sampled for coverage, so the
 * dots that belong to the mark are decided by the real vector geometry. Change
 * the logo and this follows it. It also costs the bundle nothing: the asset is
 * already served, and it is fetched only when the section is near the
 * viewport.
 *
 * APPLE RULES, and how each is met:
 *
 *   - CONTINUOUS DURING THE MOVEMENT. Every dot eases toward its own target
 *     every frame while the pointer is moving, rather than waiting for the
 *     pointer to stop and then animating to a final state. Grab it, reverse
 *     it, whip across it: the field is always animating from where it
 *     currently is, never replayed from a start value.
 *   - NO STROBING. Per-frame displacement is bounded twice over: LIFT_MAX caps
 *     total travel at a few pixels, and EASE caps how much of the remaining
 *     distance a single frame may cover, so a fast pointer cannot make a dot
 *     jump a visible gap between two frames.
 *   - TRANSFORM AND OPACITY ONLY. On a canvas that means position and alpha.
 *     Nothing here animates a colour, a radius curve or a filter, and the
 *     element itself never changes size or layout.
 *   - REDUCED MOTION RESOLVES. It does not render an empty grid that never
 *     does anything, which would tell that reader nothing at all. It draws the
 *     finished state: the mark fully present in the field, once, no loop.
 *
 * Cost control: the rAF loop is gated on IntersectionObserver, and each frame
 * is skipped entirely when the pointer is away and every dot has settled, so
 * an idle section on screen costs nothing.
 */

/** Target gap between dots, in CSS pixels. Recomputed to fit the box exactly.
 *  At 22 the mark was only about 13 dots tall and read as a diagonal smudge
 *  rather than as the logo; 16 gives it roughly 19 rows, which is the point
 *  where the two wedges are unmistakable. */
const GAP = 16;
/** Dot radius at rest, and the most it grows by when fully lifted. */
const DOT_R = 1.1;
const DOT_R_LIFT = 1.5;
/** The furthest a dot travels toward the pointer. Small on purpose. */
const LIFT_MAX = 7;
/** Pointer radius of influence, in CSS pixels. */
const REACH = 165;
/** Fraction of the remaining distance a dot may cover in one frame. Bounded
 *  so a fast pointer cannot produce a visible jump between frames. */
const EASE = 0.19;
/** Alpha of a plain field dot, and of a mark dot once fully resolved. */
const FIELD_ALPHA = 0.2;
const MARK_ALPHA = 1;
/** Mark dots hold a faint presence even at rest, so the grid is not perfectly
 *  even and there is something to find. */
const MARK_REST = 0.3;
/** Height of the canvas box, in CSS pixels, per breakpoint. */
const H_DESKTOP = 380;
const H_MOBILE = 260;
/** Share of the box height the mark spans. */
const MARK_SCALE = 0.86;
/** Below this, a dot is considered settled and the frame can be skipped. */
const SETTLED = 0.002;

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

    let ink = getComputedStyle(canvas).color;
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    /** Per-dot coverage by the mark, 0..1, indexed row-major. */
    let mask: Float32Array = new Float32Array(0);
    /** Per-dot current lift, 0..1, eased toward `target` each frame. */
    let lift: Float32Array = new Float32Array(0);
    let pointerX = -1e4;
    let pointerY = -1e4;
    /**
     * How present the pointer is in the field at all, 0..1, eased on the same
     * curve as an individual dot.
     *
     * Local lift alone is a torch: REACH is 165px against a field over 1000px
     * wide, so only the dots under the cursor came up and the mark never
     * actually resolved, which is the one thing this component is for. Lift
     * stays local, because that is the physical part, and resolving is global:
     * put the pointer anywhere in the field and the structure surfaces.
     */
    let engage = 0;
    let raf = 0;
    let running = false;
    let maskReady = false;

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
      // Distribute the remainder so the field is centred rather than flush
      // left with a ragged right edge.
      offX = (w - (cols - 1) * (w / cols)) / 2;
      offY = (h - (rows - 1) * (h / rows)) / 2;
      lift = new Float32Array(cols * rows);
      mask = new Float32Array(cols * rows);
      maskReady = false;
    };

    const dotX = (c: number) => offX + c * (w / cols);
    const dotY = (r: number) => offY + r * (h / rows);

    /**
     * Rasterise the mark once at grid resolution and read coverage per cell.
     * Sampling at exactly cols x rows means one pixel per dot, so the browser's
     * own downscale does the area-averaging and a dot on the edge of a stroke
     * comes back part-covered rather than on or off.
     */
    const buildMask = (img: HTMLImageElement) => {
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      const side = h * MARK_SCALE;
      // Into grid-cell units, centred.
      const dw = (side / w) * cols;
      const dh = (side / h) * rows;
      octx.clearRect(0, 0, cols, rows);
      // Shifted half a cell: pixel c is centred at c + 0.5 in this canvas,
      // while dot c sits at exactly c in the field. Without the shift every
      // dot samples the mark half a gap to its left, which at this density is
      // a visible lean.
      octx.drawImage(img, (cols - dw) / 2 - 0.5, (rows - dh) / 2 - 0.5, dw, dh);
      const data = octx.getImageData(0, 0, cols, rows).data;
      for (let i = 0; i < cols * rows; i++) mask[i] = data[i * 4 + 3] / 255;
      maskReady = true;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const m = mask[i];
          const l = lift[i];
          const bx = dotX(c);
          const by = dotY(r);

          let x = bx;
          let y = by;
          if (l > 0) {
            // Rise toward the pointer along the line between them. Capped by
            // LIFT_MAX, so the field deforms rather than collapsing inward.
            const dx = pointerX - bx;
            const dy = pointerY - by;
            const d = Math.hypot(dx, dy) || 1;
            const travel = LIFT_MAX * l;
            x += (dx / d) * travel;
            y += (dy / d) * travel;
          }

          // A mark dot resolves on whichever is stronger, the pointer being in
          // the field at all or this dot being right under it. A field dot
          // only ever firms up locally, so the grid stays quiet.
          const base = FIELD_ALPHA + m * (MARK_REST - FIELD_ALPHA);
          const up = l > engage ? l : engage;
          const a = base + m * (MARK_ALPHA - base) * up + (1 - m) * FIELD_ALPHA * 0.8 * l;
          ctx.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a;
          ctx.beginPath();
          ctx.arc(x, y, DOT_R + (DOT_R_LIFT - DOT_R) * l, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    /** The resolved state: mark fully present, field at rest. Also the frame
     *  drawn before the pointer has ever been near. */
    const drawResolved = () => {
      // Resolved, but not displaced: engage brings the mark to full ink while
      // every lift stays at zero, so the dots sit square on the grid instead
      // of being pulled toward a pointer that is not there.
      for (let i = 0; i < lift.length; i++) lift[i] = 0;
      engage = 1;
      pointerX = -1e4;
      pointerY = -1e4;
      draw();
    };

    const frame = () => {
      const inField = pointerX > -1e3;
      const nextEngage = engage + ((inField ? 1 : 0) - engage) * EASE;
      let moved = Math.abs(nextEngage - engage) > SETTLED;
      engage = nextEngage;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const d = Math.hypot(dotX(c) - pointerX, dotY(r) - pointerY);
          const target = d > REACH ? 0 : 1 - d / REACH;
          // Eased from the CURRENT value every frame, which is what makes the
          // field interruptible: there is no animation to cancel.
          const next = lift[i] + (target - lift[i]) * EASE;
          if (Math.abs(next - lift[i]) > SETTLED) moved = true;
          lift[i] = next;
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
    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      layout();
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        buildMask(img);
        if (reduced) drawResolved();
        else draw();
      };
      // Same-origin asset, so reading the offscreen pixels back is allowed.
      img.src = "/logo/ziiro-mark.svg";
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          arm();
          if (maskReady || !reduced) start();
        } else stop();
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);

    const onResize = () => {
      if (!armed) return;
      const prev = maskReady;
      layout();
      if (prev) {
        const img = new Image();
        img.onload = () => {
          buildMask(img);
          if (reduced) drawResolved();
        };
        img.src = "/logo/ziiro-mark.svg";
      }
    };

    const themeObserver = new MutationObserver(() => {
      ink = getComputedStyle(canvas).color;
      // Repaint rather than only re-reading: under reduced motion there is no
      // loop to pick the new ink up, so the canvas would keep the old theme's
      // colour until it remounted.
      if (reduced) drawResolved();
      else draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    if (!reduced) {
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
        aria-label="A grid of dots that resolves into the Ziiro mark as the pointer moves across it."
        className="block w-full text-[var(--text-primary)]"
        style={{ height: H_DESKTOP }}
      />
    </div>
  );
}
