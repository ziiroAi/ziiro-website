import { BRAIN_HALF } from "../brainFrame";
import { drawBrainMesh } from "./brainMesh";
import { loopRadius } from "./loop";

/**
 * The web round the brain, after the owner's r8 mockup
 * (brain/spline/r8-target.png): a plexus on the brain itself (brainMesh.ts);
 * fine blue-grey hairlines, strung with tiny dots, that flow round the brain
 * and through the departments, so each department reads as a junction on
 * them; and, on desktop, long faint arcs with scattered dots sweeping out
 * across the copy's side.
 *
 * One 2D canvas over the brain, redrawn from the orbit's frame, so from the
 * brain's clock while the live brain is up. Every strand is anchored to
 * departments, or to points placed between and round them, so when the
 * departments move the web moves with them and keeps its shape. It never
 * covers a word: the labels, and the copy on the left, are cut out of each
 * frame with a soft edge.
 *
 * The web is generated once from a fixed seed, so it is the same on every
 * visit and in every screenshot.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where things are, in the canvas's CSS pixels. Changes on resize only. */
export interface WebLayout {
  width: number;
  height: number;
  /** The brain's centre, which is the loop's. */
  cx: number;
  cy: number;
  /** The loop's base radii. */
  a: number;
  b: number;
  /** Boxes the web must stay clear of: the copy's text, on desktop. */
  keepOut: Rect[];
  /** Phones: the numbers only, fewer particles. */
  compact: boolean;
  /** Desktop: the long arcs out across the copy's side. */
  sweeps: boolean;
}

/** One frame: where each department is, its label's boxes, the brain's pose,
 *  and the time. */
export interface WebFrame {
  nodes: { x: number; y: number; theta: number }[];
  labels: Rect[];
  yaw: number;
  pitch: number;
  /** The scroll's zoom: the brain, its plexus and the web grow about the
   *  brain's centre together. */
  zoom: number;
  /** Seconds, for the drift. 0 holds everything still. */
  t: number;
}

/** The strings: a blue-grey hairline, as the mockup's. */
const STRING = "20, 45, 90";
/** The dots: its deep navy. */
const DOT = "8, 20, 48";

const TAU = Math.PI * 2;

/** A small seeded generator (mulberry32), so the web is deterministic. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A slow sway: amplitude, rate (rad/s) and phase. */
interface Sway {
  amp: number;
  rate: number;
  phase: number;
}

/**
 * A point a strand passes through:
 * - `node`: department `i` itself, so the strand meets it;
 * - `between`: a fraction `s` of the way round from department `i` to `j`
 *   (anticlockwise), at `rho` of the loop's radius there;
 * - `off`: `d` radians round from department `i`, at `rho`.
 * The last two sway a little in angle and radius.
 */
type Anchor =
  | { k: "node"; i: number }
  | { k: "between"; i: number; j: number; s: number; rho: number; sway: Sway }
  | { k: "off"; i: number; d: number; rho: number; sway: Sway };

interface Strand {
  anchors: Anchor[];
  closed: boolean;
  width: number;
  alpha: number;
  dashed: boolean;
  /** The dots strung along it: where (0 to 1), how big, how dark. */
  dots: { at: number; r: number; alpha: number }[];
}

/** A long arc out across the copy's side: from the web's left edge (in loop
 *  radii from the brain) off the canvas's left edge, with dots along it. */
interface Sweep {
  y0: number;
  y1: number;
  bow: number;
  alpha: number;
  sway: Sway;
  dots: { at: number; r: number }[];
}

interface Particle {
  /** Start position, 0 to 1 of the canvas; velocity in px per second. */
  u: number;
  v: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  sway: Sway;
}

/** The web's design, built once. Counts, radii and weights were tuned by eye
 *  against the mockup at 1536 wide: every strand a light hairline, strung
 *  with dots, threaded through the departments rather than ending at them. */
function design(n: number) {
  const rnd = seeded(0x7a11e7);
  const range = (lo: number, hi: number) => lo + (hi - lo) * rnd();
  const sway = (amp: number): Sway => ({
    amp: amp * range(0.5, 1),
    rate: range(0.12, 0.32),
    phase: range(0, TAU),
  });
  const look = (): Omit<Strand, "anchors" | "closed"> => {
    const dashed = rnd() < 0.1;
    const dots: Strand["dots"] = [];
    if (!dashed) {
      // Strung every tenth to fifth of the way, a few of them larger.
      for (let at = range(0.04, 0.14); at < 0.97; at += range(0.1, 0.2)) {
        const big = rnd() < 0.1;
        dots.push({ at, r: big ? range(1.5, 2.1) : range(0.7, 1.25), alpha: range(0.55, 0.9) });
      }
    }
    return {
      width: dashed ? range(0.6, 0.8) : range(0.5, 0.85),
      alpha: dashed ? range(0.2, 0.3) : range(0.18, 0.45),
      dashed,
      dots,
    };
  };
  const between = (i: number, j: number, s: number, rho: number, amp = 0.04): Anchor => ({
    k: "between",
    i,
    j,
    s,
    rho,
    sway: sway(amp),
  });
  const off = (i: number, d: number, rho: number, amp = 0.04): Anchor => ({
    k: "off",
    i,
    d,
    rho,
    sway: sway(amp),
  });
  const node = (i: number): Anchor => ({ k: "node", i });

  const strands: Strand[] = [];
  const open = (anchors: Anchor[]) => strands.push({ anchors, closed: false, ...look() });

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const skip = (i + 2) % n;
    // Threaded through a department and on through the next, hugging the
    // brain between them in a long S.
    open([
      off(i, -range(0.2, 0.4), range(0.82, 1.02)),
      node(i),
      between(i, next, range(0.2, 0.3), range(0.78, 0.9)),
      between(i, next, range(0.45, 0.55), range(0.9, 1.04)),
      between(i, next, range(0.7, 0.8), range(0.78, 0.9)),
      node(next),
      off(next, range(0.2, 0.4), range(0.82, 1.02)),
    ]);
    // On to the one after next, just outside the loop.
    open([
      node(i),
      between(i, skip, range(0.3, 0.45), range(0.96, 1.08)),
      between(i, skip, range(0.6, 0.72), range(0.92, 1.06)),
      node(skip),
    ]);
    // Close round the brain's edge, not meeting a department: the web's
    // densest part, as in the mockup, where it meets the glass.
    for (let k = 0; k < 2; k++) {
      open([
        between(i, next, range(0, 0.2), range(0.76, 0.86)),
        between(i, next, range(0.4, 0.6), range(0.78, 0.9)),
        between(i, skip, range(0.6, 0.8), range(0.74, 0.86)),
      ]);
    }
    // A short tail out past the department, fading into the white.
    const side = rnd() < 0.5 ? -1 : 1;
    open([
      node(i),
      off(i, side * range(0.05, 0.12), range(1.12, 1.22)),
      off(i, side * range(0.12, 0.22), range(1.24, 1.34)),
    ]);
  }
  // A few chords over the brain, light, from one side to the other.
  for (let c = 0; c < 3; c++) {
    const i = (c * 3) % n;
    const j = (i + 4) % n;
    open([
      node(i),
      off(i, range(0.6, 0.9), range(0.45, 0.6), 0.06),
      off(i, range(2.2, 2.6), range(0.45, 0.6), 0.06),
      node(j),
    ]);
  }
  // Long loops all the way round the brain, the web's body: each passes
  // through three departments and wanders in and out between them.
  for (let l = 0; l < 5; l++) {
    const first = Math.floor(rnd() * n);
    const via = [first, (first + 2 + Math.floor(rnd() * 2)) % n, (first + 5 + Math.floor(rnd() * 2)) % n];
    const anchors: Anchor[] = [];
    for (let v = 0; v < via.length; v++) {
      const i = via[v];
      const j = via[(v + 1) % via.length];
      anchors.push(node(i));
      anchors.push(between(i, j, range(0.2, 0.3), range(0.78, 0.92)));
      anchors.push(between(i, j, range(0.45, 0.55), range(0.92, 1.1)));
      anchors.push(between(i, j, range(0.7, 0.8), range(0.78, 0.94)));
    }
    strands.push({ anchors, closed: true, ...look() });
  }

  const sweeps: Sweep[] = [];
  const bands: [number, number][] = [
    [-1.05, -0.8],
    [-0.9, -0.6],
    [-0.55, -0.3],
    [0.55, 0.8],
    [0.75, 1],
    [0.95, 1.2],
  ];
  for (const [lo, hi] of bands) {
    const dots: Sweep["dots"] = [];
    for (let at = range(0.08, 0.2); at < 0.95; at += range(0.14, 0.26)) {
      dots.push({ at, r: range(1.3, 2.1) });
    }
    sweeps.push({
      y0: range(lo, hi),
      y1: range(lo, hi) * range(0.9, 1.4),
      bow: range(-0.25, 0.25),
      alpha: range(0.12, 0.2),
      sway: sway(0.06),
      dots,
    });
  }

  const particles: Particle[] = [];
  for (let k = 0; k < 44; k++) {
    const big = rnd() < 0.2;
    particles.push({
      u: rnd(),
      v: rnd(),
      vx: range(2, 6) * (rnd() < 0.5 ? -1 : 1),
      vy: range(1, 4) * (rnd() < 0.5 ? -1 : 1),
      r: big ? range(1.5, 2.2) : range(0.8, 1.3),
      alpha: big ? range(0.7, 0.95) : range(0.3, 0.7),
      sway: sway(6),
    });
  }

  return { strands, sweeps, particles };
}

interface Pt {
  x: number;
  y: number;
}

/** A Catmull-Rom curve through `pts` as Béziers onto the current path. */
function spline(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean) {
  const count = pts.length;
  if (count < 2) return;
  const at = (i: number) =>
    closed ? pts[((i % count) + count) % count] : pts[Math.max(0, Math.min(count - 1, i))];
  ctx.moveTo(pts[0].x, pts[0].y);
  const segments = closed ? count : count - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
}

/** A point `at` of the way along the same curve (by segment, not length:
 *  close enough for placing dots). */
function pointOn(pts: Pt[], closed: boolean, at: number): Pt {
  const count = pts.length;
  const segments = closed ? count : count - 1;
  const f = Math.max(0, Math.min(0.9999, at)) * segments;
  const i = Math.floor(f);
  const u = f - i;
  const get = (k: number) =>
    closed ? pts[((k % count) + count) % count] : pts[Math.max(0, Math.min(count - 1, k))];
  const p0 = get(i - 1);
  const p1 = get(i);
  const p2 = get(i + 1);
  const p3 = get(i + 2);
  const u2 = u * u;
  const u3 = u2 * u;
  const f0 = -0.5 * u3 + u2 - 0.5 * u;
  const f1 = 1.5 * u3 - 2.5 * u2 + 1;
  const f2 = -1.5 * u3 + 2 * u2 + 0.5 * u;
  const f3 = 0.5 * u3 - 0.5 * u2;
  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
  };
}

/** Clear a box with a soft edge: fully inside `pad`, then two fainter rings.
 *  Cheaper than a blur every frame. */
function cut(ctx: CanvasRenderingContext2D, r: Rect, pad: number, soft: number) {
  const pass = (grow: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    const x = r.x - grow;
    const y = r.y - grow;
    const w = r.w + grow * 2;
    const h = r.h + grow * 2;
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, Math.min(grow + 2, h / 2));
    else ctx.rect(x, y, w, h);
    ctx.fill();
  };
  pass(pad + soft, 0.35);
  pass(pad + soft * 0.5, 0.5);
  pass(pad, 1);
}

export function createWeb(canvas: HTMLCanvasElement, departments: number) {
  const ctx = canvas.getContext("2d");
  const { strands, sweeps, particles } = design(departments);
  let layout: WebLayout | null = null;
  let dpr = 1;

  const resize = (next: WebLayout) => {
    layout = next;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(next.width * dpr));
    const h = Math.max(1, Math.round(next.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const draw = (frame: WebFrame) => {
    if (!ctx || !layout || layout.a <= 0) return;
    const { width, height, cx, cy } = layout;
    const { nodes, t, zoom } = frame;
    const a = layout.a * zoom;
    const b = layout.b * zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.clearRect(0, 0, width, height);

    const swayOf = (s: Sway) => (t ? s.amp * Math.sin(t * s.rate + s.phase) : 0);
    const polar = (theta: number, rho: number): Pt => {
      const r = rho * loopRadius(theta);
      return { x: cx + a * r * Math.cos(theta), y: cy - b * r * Math.sin(theta) };
    };
    const resolve = (p: Anchor): Pt => {
      if (p.k === "node") return nodes[p.i];
      if (p.k === "between") {
        const from = nodes[p.i].theta;
        const gap = ((((nodes[p.j].theta - from) % TAU) + TAU) % TAU) || TAU;
        const s = swayOf(p.sway);
        return polar(from + gap * p.s + s, p.rho * (1 + s * 0.5));
      }
      const s = swayOf(p.sway);
      return polar(nodes[p.i].theta + p.d + s, p.rho * (1 + s * 0.5));
    };
    const dot = (x: number, y: number, r: number) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    };

    // The background: long arcs out to the left, and drifting particles.
    if (layout.sweeps) {
      ctx.lineWidth = 0.8;
      for (const s of sweeps) {
        const sw = swayOf(s.sway);
        const start = { x: cx - a * 0.8, y: cy + b * (s.y0 + sw) };
        const end = { x: -40, y: cy + b * (s.y1 - sw) };
        const c1 = { x: start.x - a * 0.7, y: start.y + b * s.bow };
        const c2 = { x: end.x + a * 0.9, y: end.y - b * s.bow };
        ctx.strokeStyle = `rgb(${STRING})`;
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
        ctx.stroke();
        ctx.fillStyle = `rgb(${DOT})`;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        for (const d of s.dots) {
          const u = d.at;
          const v = 1 - u;
          const x = v * v * v * start.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * end.x;
          const y = v * v * v * start.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * end.y;
          dot(x, y, d.r);
        }
        ctx.fill();
      }
    }
    ctx.fillStyle = `rgb(${DOT})`;
    const shown = layout.compact ? particles.length / 3 : particles.length;
    for (let i = 0; i < shown; i++) {
      const p = particles[i];
      const x = (((p.u * width + p.vx * t + swayOf(p.sway)) % width) + width) % width;
      const y = (((p.v * height + p.vy * t) % height) + height) % height;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      dot(x, y, p.r);
      ctx.fill();
    }

    // The plexus on the brain, turning with it.
    drawBrainMesh(ctx, cx, cy, BRAIN_HALF * a, frame.yaw, frame.pitch);

    // The strings, then the dots strung along them.
    ctx.strokeStyle = `rgb(${STRING})`;
    const strung: { x: number; y: number; r: number; alpha: number }[] = [];
    for (const s of strands) {
      const pts = s.anchors.map(resolve);
      ctx.globalAlpha = s.alpha;
      ctx.lineWidth = s.width;
      ctx.setLineDash(s.dashed ? [1.4, 3.2] : []);
      ctx.beginPath();
      spline(ctx, pts, s.closed);
      ctx.stroke();
      for (const d of s.dots) {
        const p = pointOn(pts, s.closed, d.at);
        strung.push({ x: p.x, y: p.y, r: d.r, alpha: d.alpha });
      }
    }
    ctx.setLineDash([]);
    ctx.fillStyle = `rgb(${DOT})`;
    for (const [lo, hi] of [
      [0, 0.7],
      [0.7, 1.01],
    ]) {
      ctx.globalAlpha = (lo + hi) / 2;
      ctx.beginPath();
      for (const d of strung) if (d.alpha >= lo && d.alpha < hi) dot(d.x, d.y, d.r);
      ctx.fill();
    }

    // Keep the words clear: every label line, and the copy on the left.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    for (const r of frame.labels) cut(ctx, r, 3, 7);
    for (const r of layout.keepOut) cut(ctx, r, 10, 26);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  return { resize, draw };
}
