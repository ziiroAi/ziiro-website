import { useEffect, useRef } from "react";

// Waypoints of the audit journey, normalized to the canvas
const WAYPOINTS: [number, number][] = [
  [0.5, 0.05],
  [0.22, 0.18],
  [0.75, 0.31],
  [0.3, 0.45],
  [0.7, 0.58],
  [0.33, 0.72],
  [0.5, 0.9],
];

const W = 560;
const H = 720;
const COLS = 26;
const ROWS = 34;

const DEFAULT_LABELS = ["01", "02", "03", "04", "05", "06", "07"];

/**
 * The journey map: a dot grid where a route through seven stations
 * progressively lights up as the reader moves through the phases.
 * `progress` is animated externally (anime.js Animatable) from 0..6.
 */
export default function MethodPath({
  progress,
  labels = DEFAULT_LABELS,
}: {
  progress: { p: number };
  labels?: string[];
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

    const nodes = WAYPOINTS.map(([nx, ny]) => [nx * W, ny * H] as const);

    // Segment lengths for a global path parameter t in [0, 6]
    const segLens = nodes.slice(0, -1).map((a, i) =>
      Math.hypot(nodes[i + 1][0] - a[0], nodes[i + 1][1] - a[1]),
    );

    const pathAt = (t: number): [number, number] => {
      const i = Math.max(0, Math.min(Math.floor(t), nodes.length - 2));
      const f = Math.max(0, Math.min(t - i, 1));
      return [
        nodes[i][0] + (nodes[i + 1][0] - nodes[i][0]) * f,
        nodes[i][1] + (nodes[i + 1][1] - nodes[i][1]) * f,
      ];
    };

    // Precompute each grid dot's distance to the path and the global
    // parameter of its closest point — lighting becomes a cheap lookup.
    interface Cell { x: number; y: number; dist: number; t: number }
    const cells: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = ((c + 0.5) / COLS) * W;
        const y = ((r + 0.5) / ROWS) * H;
        let best = Infinity;
        let bestT = 0;
        for (let i = 0; i < nodes.length - 1; i++) {
          const [ax, ay] = nodes[i];
          const [bx, by] = nodes[i + 1];
          const vx = bx - ax;
          const vy = by - ay;
          const L2 = vx * vx + vy * vy;
          const f = Math.max(0, Math.min(((x - ax) * vx + (y - ay) * vy) / L2, 1));
          const px = ax + vx * f;
          const py = ay + vy * f;
          const d = Math.hypot(x - px, y - py);
          if (d < best) {
            best = d;
            bestT = i + f;
          }
        }
        cells.push({ x, y, dist: best, t: bestT });
      }
    }

    let raf = 0;
    let running = false;
    let time = 0;

    const draw = () => {
      const p = Math.max(0, Math.min(progress.p, 6));
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      // Grid + lit route
      const ROUTE_W = 16; // route thickness in px
      for (const cell of cells) {
        const onPath = cell.dist < ROUTE_W && cell.t <= p + 0.15;
        const litness = onPath
          ? Math.max(0, Math.min((p + 0.15 - cell.t) * 2.5, 1)) *
            Math.max(0, 1 - cell.dist / ROUTE_W)
          : 0;
        ctx.globalAlpha = 0.12 + litness * 0.68;
        const rad = 1.7 + litness * 2.6;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Waypoint stations + labels
      nodes.forEach(([x, y], i) => {
        const lit = i <= p + 0.2;
        ctx.globalAlpha = lit ? 0.95 : 0.4;
        ctx.beginPath();
        ctx.arc(x, y, lit ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = lit ? 0.8 : 0.4;
        ctx.font = "700 14px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textBaseline = "middle";
        const label = labels[i] ?? "";
        const lx = x < W / 2 ? x + 20 : x - 20 - ctx.measureText(label).width;
        ctx.fillText(label, lx, y);
      });

      // Active station: breathing ring
      const activeIdx = Math.max(0, Math.min(Math.round(p), nodes.length - 1));
      const [ax, ay] = nodes[activeIdx];
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ax, ay, 17 + Math.sin(time * 2.2) * 4, 0, Math.PI * 2);
      ctx.stroke();

      // A pulse travels the lit portion of the route
      if (p > 0.05) {
        const u = ((time * 0.22) % 1) * p;
        for (let k = 0; k < 5; k++) {
          const tp = u - k * 0.06;
          if (tp < 0) continue;
          const [px, py] = pathAt(tp);
          ctx.globalAlpha = 0.9 * (1 - k / 5);
          ctx.beginPath();
          ctx.arc(px, py, 5 - k * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = () => {
      time += 0.016;
      draw();
      raf = requestAnimationFrame(loop);
    };

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
    draw();

    return () => {
      io.disconnect();
      themeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [progress]);

  return (
    <canvas
      ref={canvasRef}
      className="text-[var(--text-primary)]"
      style={{ width: W, height: H }}
      aria-hidden
    />
  );
}
