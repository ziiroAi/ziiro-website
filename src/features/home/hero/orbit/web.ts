import { BRAIN_HALF } from "../brainFrame";
import { drawBrainMesh } from "./brainMesh";

/**
 * The string web round the brain, after the owner's mockup: a dense ball of
 * thread. Many fine ink-blue loops wind round the brain, between about 1.2
 * and 2 of its half-widths, some passing in front of it and some behind; the
 * departments are junctions on it, where loops meet; a few dots are strung
 * along it and scattered round it; and on desktop a few faint long threads
 * trail off it to the left, behind the copy.
 *
 * Each loop is a circle on a sphere about the brain, as yarn lies on a ball,
 * a little uneven, at any tilt and often off centre, seen from the front. Its
 * near half is drawn darker, over the brain; its far half lighter, under a
 * soft brain-shaped shadow, so where it passes behind the brain the glass
 * hides it (the canvas lies over the brain, so "behind" has to be drawn).
 * Only a few cross the brain's near side. From each department, strands
 * dip in to hug the brain and out to its neighbours, so each one sits where
 * several threads meet. The strands on the brain (brainMesh.ts) go between
 * the two halves.
 *
 * One 2D canvas over the brain, redrawn from the orbit's frame, so from the
 * brain's clock while the live brain is up. Every point is placed by its
 * angle from the departments, so the web turns with them and rests when they
 * do; sizes are in the brain's half-width (BRAIN_HALF of the loop's radius),
 * so it grows and shrinks with the brain. It never covers a word: the labels,
 * and the copy on the left, are cut out of each frame with a soft edge.
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
  /** Phones: fewer loops and dots. */
  compact: boolean;
  /** Desktop: the faint threads trailing off over the copy's side. */
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

/** The strings: the mockup's ink blue, #1e2a45. */
const STRING = "30, 42, 69";
/** The dots: a deeper navy. */
const DOT = "8, 20, 48";

const TAU = Math.PI * 2;

/** A beaded silk thread, unevenly. */
const SILK = [2.2, 1.6, 0.7, 2.4, 4.5, 1.8];

/** How a stroke is drawn. The canvas strokes each of these once a frame. */
interface Ink {
  alpha: number;
  width: number;
  dash: number[];
}

/** The far halves of the strands, plain and silk, then the near halves,
 *  darker: plain, heavy and silk. */
const INKS: Ink[] = [
  { alpha: 0.36, width: 0.75, dash: [] },
  { alpha: 0.28, width: 0.7, dash: SILK },
  { alpha: 0.52, width: 0.95, dash: [] },
  { alpha: 0.6, width: 1.2, dash: [] },
  { alpha: 0.4, width: 0.8, dash: SILK },
];
const FAR_INKS = 2;

/**
 * The brain's silhouette, in its half-widths from its centre: an ellipse the
 * far halves are hidden under, all but `glass` of them, its edge softening
 * from `soft` of the way out. Close enough at any turn of the brain.
 */
const SHADOW = { y: -0.02, rx: 1, ry: 0.9, soft: 0.84, glass: 0.12 };

/** How many loops may pass in front of the brain. */
const CROSSINGS = 3;

/** The departments' ring, in brain half-widths: they sit about one of the
 *  loop's base radii out (loop.ts). */
const RING = 1 / BRAIN_HALF;

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
 * A point a strand passes through, at depth `z`, from -1 (far) to 1 (near):
 * - `node`: department `i` itself, at depth 0, so the strand meets it;
 * - `between`: a fraction `s` of the way round from department `i` to `j`
 *   (anticlockwise), `rho` brain half-widths out;
 * - `off`: `d` radians round from department `i`, `rho` half-widths out.
 * The last two sway a little in angle and radius.
 */
type Anchor =
  | { k: "node"; i: number }
  | { k: "between"; i: number; j: number; s: number; rho: number; z: number; sway: Sway }
  | { k: "off"; i: number; d: number; rho: number; z: number; sway: Sway };

/** A point or direction about the brain's centre: x right, y up, z toward
 *  the viewer. */
type V3 = [number, number, number];
/** A loop of yarn: its point `e` radians round, `grow` times as far out. */
type Loop = (e: number, grow?: number) => V3;

const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

interface Strand {
  anchors: Anchor[];
  closed: boolean;
  /** Its near half drawn heavier. */
  heavy: boolean;
  /** A beaded silk, lighter. */
  silk: boolean;
  /** Left out on phones. */
  spare: boolean;
  /** The dots strung along it: where (0 to 1), how big. */
  dots: { at: number; r: number }[];
}

/** A faint thread trailing off to the left: from the ball's left side, `y0`
 *  half-widths below the brain's centre, off the canvas's left edge, `y1`
 *  below it, with dots along it. */
interface Trail {
  y0: number;
  y1: number;
  bow: number;
  alpha: number;
  sway: Sway;
  dots: { at: number; r: number }[];
}

/** A loose dot round the ball: `d` radians round from the first department,
 *  `rho` half-widths out. */
interface Mote {
  d: number;
  rho: number;
  r: number;
  dark: boolean;
  spare: boolean;
  sway: Sway;
}

const inkOf = (s: Strand, near: boolean) => {
  if (!near) return s.silk ? 1 : 0;
  return s.silk ? 4 : s.heavy ? 3 : 2;
};

/** The web's design, built once. Counts, radii and weights were tuned by eye
 *  against the mockup at 1536 wide. */
function design(n: number) {
  const rnd = seeded(0x7a11e7);
  const range = (lo: number, hi: number) => lo + (hi - lo) * rnd();
  const sway = (amp: number): Sway => ({
    amp: amp * range(0.5, 1),
    rate: range(0.12, 0.32),
    phase: range(0, TAU),
  });

  const strands: Strand[] = [];
  const add = (anchors: Anchor[], closed: boolean, spare = false) => {
    const silk = rnd() < 0.25;
    // A dot every third to half of the way, now and then a larger one.
    const dots: Strand["dots"] = [];
    for (let at = range(0.05, 0.45); at < 0.97; at += range(0.3, 0.55)) {
      dots.push({ at, r: rnd() < 0.25 ? range(1.6, 2.4) : range(0.8, 1.3) });
    }
    strands.push({ anchors, closed, heavy: !silk && rnd() < 0.35, silk, spare, dots });
  };

  // A loop of yarn on a sphere `S` half-widths about the brain's centre: the
  // circle where a plane cuts it, the plane's normal `nrm` and `c` of the
  // radius out from the centre.
  const circle = (S: number, nrm: V3, c: number): Loop => {
    const o: V3 = [nrm[0] * S * c, nrm[1] * S * c, nrm[2] * S * c];
    const r = S * Math.sqrt(1 - c * c);
    const u = unit3(cross3(nrm, Math.abs(nrm[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    const v = cross3(nrm, u);
    return (e, grow = 1) => {
      const cu = Math.cos(e) * r * grow;
      const sv = Math.sin(e) * r * grow;
      return [o[0] + cu * u[0] + sv * v[0], o[1] + cu * u[1] + sv * v[1], o[2] + cu * u[2] + sv * v[2]];
    };
  };
  // Whether a loop passes in front of the brain, taken as a disc.
  const crosses = (at: Loop) => {
    for (let q = 0; q < 48; q++) {
      const [x, y, z] = at((q / 48) * TAU);
      if (z > 0 && Math.hypot(x, y) < SHADOW.rx) return true;
    }
    return false;
  };

  // The ball's body: loops on spheres from just clear of the brain out to
  // near the ring, more of them close in, at every tilt and some well off
  // centre, a little uneven so they read as thread. Only CROSSINGS of them
  // may pass in front of the brain, or it drowns in them; past that, a loop
  // that would is drawn again. Half are left out on phones.
  let crossings = 0;
  for (let l = 0; l < 18; l++) {
    const S = 1.12 + 0.8 * rnd() ** 1.15;
    const make = () => {
      const z = range(-1, 1);
      const a = range(0, TAU);
      const s = Math.sqrt(1 - z * z);
      return circle(S, [s * Math.cos(a), s * Math.sin(a), z], range(-0.6, 0.6));
    };
    let at = make();
    for (let tries = 0; tries < 40 && crossings >= CROSSINGS && crosses(at); tries++) at = make();
    if (crosses(at)) crossings++;
    const anchors: Anchor[] = [];
    for (let q = 0; q < 10; q++) {
      const [x, y, z] = at(((q + range(-0.3, 0.3)) / 10) * TAU, range(0.9, 1.1));
      anchors.push({ k: "off", i: 0, d: Math.atan2(y, x), rho: Math.hypot(x, y), z: z / S, sway: sway(0.03) });
    }
    add(anchors, true, l % 2 === 1);
  }

  // Petals: from each department in to hug the brain and out to the next one
  // round, or the one after, so each department sits where threads meet.
  for (let i = 0; i < n; i++) {
    for (const step of [1, 2]) {
      if (step === 2 && rnd() < 0.4) continue;
      const j = (i + step) % n;
      const z = rnd() < 0.5 ? 0.5 : -0.5;
      const between = (s: number, rho: number): Anchor => ({ k: "between", i, j, s, rho, z, sway: sway(0.03) });
      add(
        [
          { k: "node", i },
          between(range(0.15, 0.25), range(1.5, 1.75)),
          between(range(0.45, 0.55), step === 1 ? range(1.1, 1.4) : range(1.05, 1.3)),
          between(range(0.75, 0.85), range(1.5, 1.75)),
          { k: "node", i: j },
        ],
        false,
      );
    }
  }

  // Along the ring, most departments to the next, just inside or outside it,
  // so the departments sit on threads that carry on past them.
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.3) continue;
    const j = (i + 1) % n;
    const z = rnd() < 0.5 ? 0.3 : -0.3;
    const out = RING * range(0.93, 1.1);
    add(
      [
        { k: "off", i, d: -range(0.12, 0.22), rho: RING * range(0.95, 1.05), z, sway: sway(0.03) },
        { k: "node", i },
        { k: "between", i, j, s: 0.5, rho: out, z, sway: sway(0.03) },
        { k: "node", i: j },
        { k: "off", i: j, d: range(0.12, 0.22), rho: RING * range(0.95, 1.05), z, sway: sway(0.03) },
      ],
      false,
    );
  }

  const trails: Trail[] = [];
  for (const [lo, hi] of [
    [-0.9, -0.55],
    [-0.4, -0.1],
    [0.2, 0.5],
    [0.65, 0.95],
  ]) {
    const dots: Trail["dots"] = [];
    for (let at = range(0.1, 0.3); at < 0.92; at += range(0.22, 0.4)) dots.push({ at, r: range(1, 1.8) });
    trails.push({
      y0: range(lo, hi),
      y1: range(lo, hi) * range(1.4, 2.4),
      bow: range(-0.6, 0.6),
      alpha: range(0.07, 0.11),
      sway: sway(0.08),
      dots,
    });
  }

  const motes: Mote[] = [];
  for (let k = 0; k < 26; k++) {
    const dark = rnd() < 0.3;
    motes.push({
      d: range(0, TAU),
      rho: range(1.1, 2.6),
      r: dark ? range(1.3, 2) : range(0.7, 1.1),
      dark,
      spare: k % 3 !== 0,
      sway: sway(0.06),
    });
  }

  return { strands, trails, motes };
}

interface Pt {
  x: number;
  y: number;
}

/** Point `k` of a strand's points: wrapped round a closed one, held at the
 *  ends of an open one. */
function pick(pts: Pt[], closed: boolean, k: number) {
  const count = pts.length;
  return closed ? pts[((k % count) + count) % count] : pts[Math.max(0, Math.min(count - 1, k))];
}

/** Segment `k` of the Catmull-Rom curve through `pts`, as a Bézier onto
 *  `path`, from its current point. */
function segment(path: Path2D, pts: Pt[], closed: boolean, k: number) {
  const p0 = pick(pts, closed, k - 1);
  const p1 = pick(pts, closed, k);
  const p2 = pick(pts, closed, k + 1);
  const p3 = pick(pts, closed, k + 2);
  path.bezierCurveTo(
    p1.x + (p2.x - p0.x) / 6,
    p1.y + (p2.y - p0.y) / 6,
    p2.x - (p3.x - p1.x) / 6,
    p2.y - (p3.y - p1.y) / 6,
    p2.x,
    p2.y,
  );
}

/** The point `u` of the way along segment `k` of the same curve. */
function pointOn(pts: Pt[], closed: boolean, k: number, u: number): Pt {
  const p0 = pick(pts, closed, k - 1);
  const p1 = pick(pts, closed, k);
  const p2 = pick(pts, closed, k + 1);
  const p3 = pick(pts, closed, k + 2);
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
  const { strands, trails, motes } = design(departments);
  // The brain's shadow on a unit circle, scaled to the brain when drawn.
  const shadow = ctx?.createRadialGradient(0, 0, 0, 0, 0, 1);
  shadow?.addColorStop(0, `rgba(0, 0, 0, ${1 - SHADOW.glass})`);
  shadow?.addColorStop(SHADOW.soft, `rgba(0, 0, 0, ${1 - SHADOW.glass})`);
  shadow?.addColorStop(1, "rgba(0, 0, 0, 0)");
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
    const { width, height, cx, cy, compact } = layout;
    const { nodes, t } = frame;
    // The brain's half-width, grown with it by the scroll's zoom.
    const h = BRAIN_HALF * layout.a * frame.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.clearRect(0, 0, width, height);

    const swayOf = (s: Sway) => (t ? s.amp * Math.sin(t * s.rate + s.phase) : 0);
    const polar = (theta: number, r: number): Pt => ({
      x: cx + r * Math.cos(theta),
      y: cy - r * Math.sin(theta),
    });
    const resolve = (p: Anchor): Pt => {
      if (p.k === "node") return nodes[p.i];
      const s = swayOf(p.sway);
      if (p.k === "between") {
        const from = nodes[p.i].theta;
        const gap = ((((nodes[p.j].theta - from) % TAU) + TAU) % TAU) || TAU;
        return polar(from + gap * p.s + s, p.rho * h * (1 + s * 0.5));
      }
      return polar(nodes[p.i].theta + p.d + s, p.rho * h * (1 + s * 0.5));
    };
    const dot = (x: number, y: number, r: number) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    };
    const dots = (list: (Pt & { r: number })[], alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (const d of list) dot(d.x, d.y, d.r);
      ctx.fill();
    };
    const stroke = (from: number, to: number, path: Path2D[]) => {
      for (let k = from; k < to; k++) {
        ctx.globalAlpha = INKS[k].alpha;
        ctx.lineWidth = INKS[k].width;
        ctx.setLineDash(INKS[k].dash);
        ctx.stroke(path[k]);
      }
      ctx.setLineDash([]);
    };

    // Every strand onto its strokes' paths, near and far halves apart, and
    // its dots likewise.
    const paths = INKS.map(() => new Path2D());
    const far: (Pt & { r: number })[] = [];
    const near: (Pt & { r: number })[] = [];
    for (const s of strands) {
      if (compact && s.spare) continue;
      const pts = s.anchors.map(resolve);
      const zs = s.anchors.map((p) => (p.k === "node" ? 0 : p.z));
      const segments = s.closed ? pts.length : pts.length - 1;
      const isNear = (k: number) => zs[k] + zs[(k + 1) % zs.length] > 0;
      let last = -1;
      for (let k = 0; k < segments; k++) {
        const ink = inkOf(s, isNear(k));
        if (ink !== last) paths[ink].moveTo(pts[k].x, pts[k].y);
        segment(paths[ink], pts, s.closed, k);
        last = ink;
      }
      for (const d of s.dots) {
        const f = d.at * segments;
        const k = Math.floor(f);
        (isNear(k) ? near : far).push({ ...pointOn(pts, s.closed, k, f - k), r: d.r });
      }
    }

    // Furthest back: the threads trailing off to the left, and loose dots.
    ctx.strokeStyle = `rgb(${STRING})`;
    ctx.fillStyle = `rgb(${DOT})`;
    if (layout.sweeps) {
      ctx.lineWidth = 0.7;
      for (const s of trails) {
        const sw = swayOf(s.sway);
        const start = { x: cx - 1.3 * h, y: cy + h * (s.y0 + sw) };
        const end = { x: -40, y: cy + h * (s.y1 - sw) };
        const c1 = { x: start.x - 1.6 * h, y: start.y + h * s.bow };
        const c2 = { x: end.x + 2 * h, y: end.y - h * s.bow };
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
        ctx.stroke();
        ctx.globalAlpha = 0.5;
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
    for (const dark of [false, true]) {
      ctx.globalAlpha = dark ? 0.8 : 0.45;
      ctx.beginPath();
      for (const m of motes) {
        if (m.dark !== dark || (compact && m.spare)) continue;
        const s = swayOf(m.sway);
        const p = polar(nodes[0].theta + m.d + s, m.rho * h * (1 + s * 0.5));
        dot(p.x, p.y, m.r);
      }
      ctx.fill();
    }

    // The far halves, then the brain over them: it hides them, but for a
    // glimpse through the glass.
    stroke(0, FAR_INKS, paths);
    dots(far, 0.6);
    if (shadow) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.translate(cx, cy + SHADOW.y * h);
      ctx.scale(SHADOW.rx * h, SHADOW.ry * h);
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // The plexus on the brain, turning with it; then the near halves over it.
    drawBrainMesh(ctx, cx, cy, h, frame.yaw, frame.pitch);
    ctx.strokeStyle = `rgb(${STRING})`;
    ctx.fillStyle = `rgb(${DOT})`;
    stroke(FAR_INKS, INKS.length, paths);
    dots(near, 0.85);

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
