import { useEffect, useRef, useState } from "react";

/**
 * First-load preloader: scattered dots swirl in and assemble into the
 * ZIIRO wordmark (same halftone-sampling technique as the dot-art
 * engine), hold, then the overlay fades to reveal the site.
 *
 * Shows once per page load (App mounts once). Gated on document.fonts
 * ready + a minimum display time so it never flashes. Reduced-motion:
 * the word appears assembled immediately, then fades.
 */

interface Particle {
  sx: number; // start
  sy: number;
  tx: number; // target
  ty: number;
  size: number;
  delay: number;
}

const CELL = 7; // sampling resolution (px per cell)
const DURATION = 1100; // assembly duration (ms)
const MIN_VISIBLE = 1900; // never hide before this (ms) — holds the assembled word
const FADE = 650; // fade-out duration (ms)

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export default function Preloader() {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;

    // Re-read live each frame: next-themes may apply the theme class
    // AFTER this effect runs, so a one-time read can grab the wrong
    // (opposite-theme) color and render near-invisible dots.
    const readColor = () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--text-primary")
        .trim() || "#111";
    let dotColor = readColor();

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // ---- Sample "ZIIRO" into target points on an offscreen canvas ----
    const off = document.createElement("canvas");
    const octx = off.getContext("2d", { willReadFrequently: true });
    let particles: Particle[] = [];

    if (octx) {
      const targetW = Math.min(W * 0.62, 560);
      const fontPx = Math.floor(targetW / 3.1); // "ZIIRO" ~5 chars
      off.width = targetW;
      off.height = Math.floor(fontPx * 1.3);
      octx.fillStyle = "#000";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.font = `700 ${fontPx}px "Space Grotesk", Inter, sans-serif`;
      try {
        (octx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${Math.floor(fontPx * 0.02)}px`;
      } catch {
        /* letterSpacing unsupported — fine */
      }
      octx.fillText("ZIIRO", off.width / 2, off.height / 2);

      const img = octx.getImageData(0, 0, off.width, off.height).data;
      const ox = W / 2 - off.width / 2;
      const oy = H / 2 - off.height / 2;
      const cols = Math.floor(off.width / CELL);
      const rows = Math.floor(off.height / CELL);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = Math.floor((c + 0.5) * CELL);
          const py = Math.floor((r + 0.5) * CELL);
          const alpha = img[(py * off.width + px) * 4 + 3];
          if (alpha > 40) {
            const tx = ox + px;
            const ty = oy + py;
            // start scattered across the whole viewport
            const ang = Math.random() * Math.PI * 2;
            const dist = Math.max(W, H) * (0.4 + Math.random() * 0.6);
            particles.push({
              sx: W / 2 + Math.cos(ang) * dist,
              sy: H / 2 + Math.sin(ang) * dist,
              tx,
              ty,
              size: 1.7 + Math.random() * 1.5,
              delay: reduced ? 0 : Math.random() * 320,
            });
          }
        }
      }
    }

    let raf = 0;
    let start = 0;
    let done = false;
    let fadeStarted = false;

    let frame = 0;
    const draw = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      // refresh theme color a few times/sec (cheap; guards the race)
      if ((frame++ & 7) === 0) dotColor = readColor();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = dotColor;

      for (const p of particles) {
        const lt = reduced ? 1 : easeOutQuart(Math.max(0, Math.min((elapsed - p.delay) / DURATION, 1)));
        const x = p.sx + (p.tx - p.sx) * lt;
        const y = p.sy + (p.ty - p.sy) * lt;
        // gentle shimmer once assembled
        const shimmer = lt > 0.98 ? 1 + 0.18 * Math.sin(elapsed * 0.006 + p.tx) : 1;
        ctx.globalAlpha = 0.5 + 0.5 * lt;
        ctx.beginPath();
        ctx.arc(x, y, p.size * shimmer, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!done && elapsed >= DURATION) done = true;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // ---- Dismiss once ready ----
    const ready = Promise.all([
      (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready ??
        Promise.resolve(),
      new Promise((res) => setTimeout(res, MIN_VISIBLE)),
    ]);

    let fadeTimer: ReturnType<typeof setTimeout>;
    let removeTimer: ReturnType<typeof setTimeout>;
    ready.then(() => {
      if (fadeStarted) return;
      fadeStarted = true;
      setFading(true);
      removeTimer = setTimeout(() => {
        cancelAnimationFrame(raf);
        setGone(true);
      }, FADE + 40);
    });

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", onResize);

    // lock scroll while visible
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (gone) document.body.style.overflow = "";
  }, [gone]);

  if (gone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE}ms ease`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <span
        className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--text-secondary)]"
        style={{ opacity: fading ? 0 : 0.7, transition: "opacity 300ms ease" }}
      >
        Leverage AI Anywhere
      </span>
    </div>
  );
}
