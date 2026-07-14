import { useEffect, useRef, type RefObject } from "react";

export type GlyphVariant = "agents" | "loops" | "bars" | "path" | "clusters";

export interface GlyphEnergy {
  speed: number; // time multiplier (1 = idle)
  gain: number; // extra brightness/size (0 = idle)
}

const COLS = 26;
const ROWS = 17;
const W = 320;
const H = 220;

/**
 * A small living dot-matrix illustration. Each variant animates a grid of
 * tiny monochrome dots — the same visual language as the hero dot world.
 * `energy` is a mutable object (driven by an anime.js Animatable) that
 * modulates speed and brightness, e.g. while the row is hovered.
 */
export default function DotGlyph({
  variant,
  energy,
  className = "text-[var(--text-primary)]",
}: {
  variant: GlyphVariant;
  energy?: RefObject<GlyphEnergy>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let color = getComputedStyle(canvas).color;
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Normalized dot intensity per variant: (x, y in 0..1, t) -> 0..1
    const intensity = (x: number, y: number, t: number): number => {
      switch (variant) {
        case "agents": {
          // three operators travelling lissajous routes through the grid
          let v = 0;
          for (let k = 0; k < 3; k++) {
            const px = 0.5 + 0.38 * Math.sin(t * (0.5 + k * 0.13) + k * 2.1);
            const py = 0.5 + 0.34 * Math.sin(t * (0.37 + k * 0.11) + k * 4.4);
            const d2 = (x - px) * (x - px) + (y - py) * (y - py);
            v += Math.exp(-d2 * 90);
          }
          return Math.min(v, 1);
        }
        case "loops": {
          // rings pulsing outward from the core, forever
          const cx = x - 0.5;
          const cy = (y - 0.5) * (H / W);
          const dist = Math.hypot(cx, cy) * 2;
          let v = 0;
          for (let k = 0; k < 2; k++) {
            const rr = ((t * 0.22 + k * 0.5) % 1) * 0.9;
            v += Math.exp(-Math.abs(dist - rr) * 18) * (1 - rr * 0.8);
          }
          return Math.min(v, 1);
        }
        case "bars": {
          // a living bar chart, columns rising and settling
          const c = x * 10;
          const col = Math.floor(c);
          const h =
            0.22 +
            0.6 *
              (0.5 + 0.5 * Math.sin(t * 0.8 + col * 0.9 + Math.sin(col * 2.3)));
          const yUp = 1 - y;
          return Math.max(0, Math.min(1, (h - yUp) * 9));
        }
        case "path": {
          // a route lighting up through the grid, waypoint by waypoint
          const wp = [
            [0.06, 0.78],
            [0.3, 0.78],
            [0.3, 0.32],
            [0.62, 0.32],
            [0.62, 0.62],
            [0.94, 0.62],
          ];
          const segs: number[] = [];
          let total = 0;
          for (let i = 0; i < wp.length - 1; i++) {
            const L = Math.hypot(wp[i + 1][0] - wp[i][0], wp[i + 1][1] - wp[i][1]);
            segs.push(L);
            total += L;
          }
          const at = (u: number): [number, number] => {
            let rem = u * total;
            for (let i = 0; i < segs.length; i++) {
              if (rem <= segs[i]) {
                const f = rem / segs[i];
                return [
                  wp[i][0] + (wp[i + 1][0] - wp[i][0]) * f,
                  wp[i][1] + (wp[i + 1][1] - wp[i][1]) * f,
                ];
              }
              rem -= segs[i];
            }
            return [wp[wp.length - 1][0], wp[wp.length - 1][1]];
          };
          const head = (t * 0.14) % 1;
          let v = 0;
          for (let k = 0; k < 6; k++) {
            const u = head - k * 0.035;
            if (u < 0) continue;
            const [px, py] = at(u);
            const d2 = (x - px) * (x - px) + (y - py) * (y - py);
            v += Math.exp(-d2 * 260) * (1 - k / 6);
          }
          return Math.min(v, 1);
        }
        case "clusters": {
          // people-dots drifting into the right teams
          let v = 0;
          for (let k = 0; k < 3; k++) {
            const px = 0.5 + 0.3 * Math.sin(t * 0.2 + (k * Math.PI * 2) / 3);
            const py = 0.5 + 0.28 * Math.cos(t * 0.16 + (k * Math.PI * 2) / 3 + 1);
            const d2 = (x - px) * (x - px) + (y - py) * (y - py);
            v += Math.exp(-d2 * 55) * (0.75 + 0.25 * Math.sin(t * 1.3 + k * 2));
          }
          return Math.min(v, 1);
        }
      }
    };

    let raf = 0;
    let running = false;
    let t = 3;

    const draw = () => {
      const gain = energy?.current?.gain ?? 0;
      ctx.clearRect(0, 0, W, H);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = (c + 0.5) / COLS;
          const y = (r + 0.5) / ROWS;
          const v = intensity(x, y, t);
          ctx.globalAlpha = Math.min(1, (0.12 + v * 0.78) * (1 + gain));
          ctx.fillStyle = color;
          const rad = 1.1 + v * (1.4 + gain);
          ctx.beginPath();
          ctx.arc(x * W, y * H, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = () => {
      t += 0.016 * (energy?.current?.speed ?? 1);
      draw();
      raf = requestAnimationFrame(loop);
    };

    // Animate only while visible
    const io = new IntersectionObserver(([entry]) => {
      const shouldRun = entry.isIntersecting && !reduced;
      if (shouldRun && !running) {
        running = true;
        raf = requestAnimationFrame(loop);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);
    draw(); // static first frame (also the reduced-motion state)

    return () => {
      io.disconnect();
      themeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: W, height: H }}
      aria-hidden
    />
  );
}
