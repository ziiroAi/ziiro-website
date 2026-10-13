import { BRAIN_LIFT } from "../brainFrame";

/**
 * The strands on the brain (the owner's mockup): fine near-black ink threads
 * wound round the glass brain like loose yarn, curving across it and back
 * round behind it, turning with it. The near side is drawn darker and a
 * little heavier, the far side faintly through the glass, and a few tiny dots
 * sit where two strands cross.
 *
 * Each strand is a wavering loop, or part of one, of directions out from the
 * brain's centre, each pushed out to the brain's surface and drawn a little
 * inside it, so the strands follow the brain's shape and stay inside its
 * silhouette at any turn. They are generated once from a fixed seed, so they
 * are the same on every visit and in every screenshot.
 *
 * The surface comes from 420 of the brain model's own vertices (the scene's
 * `Model` mesh, in the brain group's frame, with the mesh's paused start
 * rotation and SplineBrain's MODEL_CENTRE applied), chosen by farthest-point
 * sampling so they spread evenly. They are in units of the brain's
 * half-width, with y lowered by Y_OFFSET, stored as int8 at 127 / 1.05 a
 * unit, base64. Sample them again if the scene changes.
 */
const POINTS =
  "hSwQX6z3O18oAR6PBuRV8qe4ZR3P1kxb3Gjkp/G/Zvw5xdwTOdilC5MIIzJpKVPCwAJUoTrM" +
  "JNQXbjUS9XAksl0X5eOedO763Uys7xV639rcJrLV+PwcOhOhQtRNUzFJE3DypDFCn/v3yxWd" +
  "T1LuZNrIWtAdB1xONgVf+8D9sNDrPKsWGu6MrgYpEr6gAGHMBMcyCEems1bmT7LR6QFT/Tpw" +
  "uFY/LE5M0fUwdBrzVwC52MSyQza+A6Tf0SlsoxTUdBAcEwVt3mdAJzOgmUYlHG0amUT92W8M" +
  "wtrHx1XHZs7sMKP1WUkv590D9/qLdegfuDOyNGIEM7i0jSTvwO2mKMY5jxQvqRGzFaa46DWV" +
  "T/JSz8r0ay0yLWPiZjXl9uU4Kt5hAd0Xcf/eWE4Q93EE2/kN77zdjg0R88iYHLcDUhBLWts9" +
  "PCVdR03RqOEDvjpaP9Qt9ZP1oujhyWksS8rBW7ATURy4Q/ilIGM82gtpowxC5A2UufgTC9iU" +
  "GRCSv1794F7BZ9oFtBpSzjWd+G/pCiR0GtFQQ0pAUOazFkdh8FBgji0oBKsJ092zPafeYkT7" +
  "5y93Jhlp9VOyufs9RqH+CPxYu8wDF2naMPuWdwkED1m7SsAhCGY4cOLb7M7xx9DfbBEymjXi" +
  "FK3t47fK7LamFSaYZcMEInAF1vpH0PSY9+4HBayltEnK9qr1kAzzJcqkOu5d6mjTK7oUVy7K" +
  "bPXLuwOkE8gOLOGWHUirFs0nxBhlpQYUWcbc4GkoEqbP82JG+QhjPLPH70efTlcidSQH3UBs" +
  "nv3dpyu7PCeqHvVjx0Sqo1INpEc34G752yWUy11E7Pc62tDLxWHmMT20wf8lsUVJCdFEwCSm" +
  "Oj9Rkj8TmybLr9rPWEThP17yye4L02LSXiI+BOyQM1bUTVgBZgvGadopdfwe9qrQN8ceRQiw" +
  "Tqjpq1InCXMVP18VCJvz7SCQpVHycRPhZUYgMclNct3v+zmb2N8PjB0BGllM4rO3LNUu+Nqd" +
  "IwpeNVk5dCMfAPNKBEpnpAvEHq+qXDo7/PQtjTX40uCgwk5N+Cd7azT3ox5G+dUsXLTldu0O" +
  "DvyN4Pglqkfa3hp1ljc1RghXEzefLGoSmCHd3Nfx+AyPy2oXLiOeKa/DA6O1zWr8OsyzhSAe" +
  "4sieEG4odf7xQFfgABF1ZuszDjpq7Ww1JmYoROBa/M4IKj1dLGX1IF7MFKf9bSbipOLyr1UB" +
  "2VpOO889724T4PiTLKwKW/JCry9OtCCyTj7NrfMIZuu/WwJF0s0F/mnbRlEwtOm4bNgYJajj" +
  "GMQ7+7joZUUMzAZgazQjDLkH8lzApPHTTuFN+tU9OBVbYMMU9OeQGyNuSdi4+QFROUTATrAe" +
  "UNMpmg/mxN+3mQ0lPuejueYQrzi/TCVSAKTFIdaT7wpvwUS5nkfoStZACXHlENccvFfZdezm" +
  "zPYX09vDs9gL2gJXAnL1/7+e++gkG99d/u8Vz9bUFdGeIkxYpRzA1GM0/FhYwS5iykJgqdjg" +
  "MS5jjAgDqgI3xPpGmRs4JRmYXMzOsv6vvM30w2ILcfYsXRS8+qIBAwJs01G24Nelo/4HvGIs" +
  "adLeRfhdRzdP9t8JNtciL9RWFxNx8P0QPKQI3UOgQxywstX8T/ix2AWVTUE8/KDsY8DxPcXA" +
  "Prge6NvnVaT9BVKvZx4xq+bJ";
const SCALE = 1.05 / 127;
const Y_OFFSET = 0.46;

/** The ink: near-black, with a little of the web's navy in it. */
const INK = "12, 18, 32";

const TAU = Math.PI * 2;

/** The strands: how many, how many of them close into whole loops (the rest
 *  are open arcs), and the samples round a whole loop. */
const STRANDS = 11;
const LOOPS = 7;
const SAMPLES = 96;

/**
 * The surface along a direction: the vertices' distances from the centre,
 * weighted by how near their directions are (KAPPA, higher is tighter) and
 * taken as a power mean (POWER), which keeps to the outer surface over the
 * few vertices deep in the folds. The strands run INSET of the way out.
 */
const KAPPA = 20;
const POWER = 8;
const INSET = 0.92;

/**
 * The brain's base. Under it that surface bridges the gaps between the lobes
 * and the stem, outside the silhouette, so a strand fades out as it goes
 * under: from FLOOR + FADE down to FLOOR (half-widths above the pivot) it is
 * pushed back by up to SINK in depth, into the fainter bands and past them.
 */
const FLOOR = 0.1;
const FADE = 0.25;
const SINK = 2.4;

/** The dots: up to KNOTS crossings, no two within KNOT_GAP half-widths. */
const KNOTS = 9;
const KNOT_GAP = 0.4;

/** Depth bands, far to near, in half-widths from the brain's centre: each
 *  runs from the last one's top (the first from NEAREST_GONE: anything
 *  farther is not drawn) up to `[0]`, at alpha `[1]` and line width `[2]`. */
const NEAREST_GONE = -1.15;
const BANDS: [number, number, number][] = [
  [-0.45, 0.42, 0.65],
  [-0.15, 0.5, 0.75],
  [0.15, 0.58, 0.85],
  [0.45, 0.65, 0.95],
  [Infinity, 0.7, 1],
];

type Vec = [number, number, number];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A small seeded generator (mulberry32), as the web's. */
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

/** Where two short great arcs, a0 to a1 and b0 to b1, cross, or null. */
function crossing(a0: Vec, a1: Vec, b0: Vec, b1: Vec): Vec | null {
  const na = cross(a0, a1);
  const nb = cross(b0, b1);
  const line = cross(na, nb);
  // On one great circle: no single crossing.
  if (Math.hypot(line[0], line[1], line[2]) < 1e-9) return null;
  let x = unit(line);
  if (dot(x, a0) + dot(x, a1) < 0) x = [-x[0], -x[1], -x[2]];
  const within = (p: Vec, q: Vec, n: Vec) => dot(cross(p, x), n) >= 0 && dot(cross(x, q), n) >= 0;
  return within(a0, a1, na) && within(b0, b1, nb) ? x : null;
}

interface Run {
  /** The strand's first sample in `points`. */
  from: number;
  count: number;
  closed: boolean;
}

interface Strands {
  /** x, y, z per point: every strand's samples end to end, then the dots. */
  points: Float32Array;
  /** How far back each point is pushed in depth, near the brain's base. */
  sink: Float32Array;
  runs: Run[];
  /** Where the dots start in `points`. */
  knotsFrom: number;
  /** The brain's centre. */
  centre: Vec;
}

let built: Strands | null = null;

/** The vertices, decoded. */
function vertices(): Vec[] {
  const raw = atob(POINTS);
  const verts: Vec[] = [];
  for (let i = 0; i < raw.length; i += 3) {
    const [x, y, z] = [0, 1, 2].map((k) => {
      const byte = raw.charCodeAt(i + k);
      return (byte > 127 ? byte - 256 : byte) * SCALE;
    });
    verts.push([x, y + Y_OFFSET, z]);
  }
  return verts;
}

/** The vertices' centre, and the point a little inside the surface along a
 *  direction from it. */
function surfaceOf(verts: Vec[]) {
  const sum = verts.reduce<Vec>((c, v) => [c[0] + v[0], c[1] + v[1], c[2] + v[2]], [0, 0, 0]);
  const centre: Vec = [sum[0] / verts.length, sum[1] / verts.length, sum[2] / verts.length];
  const offsets = verts.map((v): Vec => [v[0] - centre[0], v[1] - centre[1], v[2] - centre[2]]);
  const dirs = offsets.map(unit);
  const powered = offsets.map((o) => Math.hypot(o[0], o[1], o[2]) ** POWER);
  const surface = (d: Vec): Vec => {
    let total = 0;
    let weight = 0;
    for (let i = 0; i < dirs.length; i++) {
      const w = Math.exp(KAPPA * (dot(d, dirs[i]) - 1));
      total += w * powered[i];
      weight += w;
    }
    const r = INSET * (total / weight) ** (1 / POWER);
    return [centre[0] + d[0] * r, centre[1] + d[1] * r, centre[2] + d[2] * r];
  };
  return { centre, surface };
}

/**
 * The strands, as directions from the centre. Each: a pole, a latitude off
 * its equator, two waves along it, and a whole turn round the pole (the first
 * LOOPS) or an arc of one. The poles lean off the vertical, a little for most
 * strands, so they cross the brain as long arcs at any turn, and steeply for
 * every third; the leans' directions and the latitudes are spread evenly, so
 * the strands don't bunch where they turn at the brain's edge.
 */
function lay(rnd: () => number): Vec[][] {
  const range = (lo: number, hi: number) => lo + (hi - lo) * rnd();
  const paths: Vec[][] = [];
  for (let s = 0; s < STRANDS; s++) {
    const az = TAU * ((s * 0.618034) % 1) + range(-0.3, 0.3);
    const tilt = s % 3 === 2 ? range(0.9, 1.45) : range(0, 0.8);
    const pole: Vec = [Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)];
    const e1 = unit(cross(pole, Math.abs(pole[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    const e2 = cross(pole, e1);
    const lat = 0.5 * ((2 * (s + 0.5)) / STRANDS - 1) + range(-0.06, 0.06);
    const waves = [
      [2 + Math.floor(rnd() * 2), range(0.05, 0.12), range(0, TAU)],
      [3 + Math.floor(rnd() * 3), range(0.02, 0.05), range(0, TAU)],
    ];
    const closed = s < LOOPS;
    const span = closed ? TAU : range(1.1, 1.7) * Math.PI;
    const start = range(0, TAU);
    const count = closed ? SAMPLES : Math.round((SAMPLES * span) / TAU) + 1;
    const path: Vec[] = [];
    for (let k = 0; k < count; k++) {
      const f = start + (span * k) / (closed ? count : count - 1);
      const l = waves.reduce((sum, [n, amp, phase]) => sum + amp * Math.sin(n * f + phase), lat);
      const ring = (i: number) => e1[i] * Math.cos(f) + e2[i] * Math.sin(f);
      path.push([0, 1, 2].map((i) => pole[i] * Math.sin(l) + ring(i) * Math.cos(l)) as Vec);
    }
    paths.push(path);
  }
  return paths;
}

/**
 * The dots: where two strands cross on the sphere of directions they cross on
 * the surface too, so a dot stays on its crossing at any turn. A seeded
 * shuffle of them, then the first few well apart and clear of the base.
 */
function knotsOf(paths: Vec[][], surface: (d: Vec) => Vec, rnd: () => number): Vec[] {
  const segs = paths.flatMap((path, s) => {
    const ends = s < LOOPS ? path.length : path.length - 1;
    return path.slice(0, ends).map((a, k) => ({ s, a, b: path[(k + 1) % path.length] }));
  });
  const crossings: Vec[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const p = segs[i];
      const q = segs[j];
      if (p.s === q.s || dot(p.a, q.a) < 0.985) continue;
      const x = crossing(p.a, p.b, q.a, q.b);
      if (x) crossings.push(x);
    }
  }
  for (let i = crossings.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [crossings[i], crossings[j]] = [crossings[j], crossings[i]];
  }
  const knots: Vec[] = [];
  for (const x of crossings) {
    if (knots.length === KNOTS) break;
    const p = surface(x);
    const apart = knots.every((k) => Math.hypot(k[0] - p[0], k[1] - p[1], k[2] - p[2]) >= KNOT_GAP);
    if (apart && p[1] >= FLOOR + FADE) knots.push(p);
  }
  return knots;
}

/** Lay the strands on the brain's surface and pick the dots, once. */
function strands(): Strands {
  if (built) return built;
  const { centre, surface } = surfaceOf(vertices());
  const rnd = seeded(6);
  const paths = lay(rnd);
  const knots = knotsOf(paths, surface, rnd);
  const all = [...paths.flat().map(surface), ...knots];
  const sink = all.map(([, y]) => {
    const t = Math.min(1, Math.max(0, (y - FLOOR) / FADE));
    return SINK * (1 - t * t * (3 - 2 * t));
  });
  const runs = paths.map((path, s) => ({
    from: paths.slice(0, s).reduce((n, p) => n + p.length, 0),
    count: path.length,
    closed: s < LOOPS,
  }));
  built = {
    points: Float32Array.from(all.flat()),
    sink: Float32Array.from(sink),
    runs,
    knotsFrom: all.length - knots.length,
    centre,
  };
  return built;
}

/** Screen positions and depth (with the sink), reused frame to frame. */
let sx = new Float32Array(0);
let sy = new Float32Array(0);
let sz = new Float32Array(0);

/** Add the stretches of one strand whose depth is in [lo, hi) to the path,
 *  as a Catmull-Rom curve through its samples. */
function trace(ctx: CanvasRenderingContext2D, { from, count, closed }: Run, lo: number, hi: number) {
  const at = (k: number) => from + (closed ? (k + count) % count : Math.min(count - 1, Math.max(0, k)));
  let drawing = false;
  for (let k = 0; k < (closed ? count : count - 1); k++) {
    const p = at(k);
    const q = at(k + 1);
    const depth = (sz[p] + sz[q]) / 2;
    if (depth < lo || depth >= hi) {
      drawing = false;
      continue;
    }
    const o = at(k - 1);
    const r = at(k + 2);
    if (!drawing) ctx.moveTo(sx[p], sy[p]);
    ctx.bezierCurveTo(
      sx[p] + (sx[q] - sx[o]) / 6,
      sy[p] + (sy[q] - sy[o]) / 6,
      sx[q] - (sx[r] - sx[p]) / 6,
      sy[q] - (sy[r] - sy[p]) / 6,
      sx[q],
      sy[q],
    );
    drawing = true;
  }
}

/**
 * Draw the strands for a brain centred at (cx, cy) in the canvas's CSS
 * pixels, `half` pixels across its half-width, turned by `yaw` and tilted by
 * `pitch` exactly as SplineBrain turns the scene (the group's Euler XYZ, so
 * pitch about x after yaw about y), and projected the way its orthographic
 * camera does.
 */
export function drawBrainMesh(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  half: number,
  yaw: number,
  pitch: number,
) {
  const { points, sink, runs, knotsFrom, centre } = strands();
  const count = points.length / 3;
  if (sx.length !== count) {
    sx = new Float32Array(count);
    sy = new Float32Array(count);
    sz = new Float32Array(count);
  }
  const cyaw = Math.cos(yaw);
  const syaw = Math.sin(yaw);
  const cpitch = Math.cos(pitch);
  const spitch = Math.sin(pitch);
  const pivot = cy + BRAIN_LIFT * half;
  for (let i = 0; i < count; i++) {
    const x = points[i * 3];
    const y = points[i * 3 + 1];
    const z = points[i * 3 + 2];
    const x1 = x * cyaw + z * syaw;
    const z1 = -x * syaw + z * cyaw;
    const y2 = y * cpitch - z1 * spitch;
    const z2 = y * spitch + z1 * cpitch;
    sx[i] = cx + half * x1;
    sy[i] = pivot - half * y2;
    sz[i] = z2 - sink[i];
  }
  // The centre's depth, turned the same way: the bands are measured from it.
  const zc = centre[1] * spitch + (-centre[0] * syaw + centre[2] * cyaw) * cpitch;

  // The strands, far to near, one stroke per band.
  ctx.strokeStyle = `rgb(${INK})`;
  ctx.setLineDash([]);
  let lo = NEAREST_GONE;
  for (const [hi, alpha, width] of BANDS) {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const run of runs) trace(ctx, run, zc + lo, zc + hi);
    ctx.stroke();
    lo = hi;
  }

  // The dots: the near side dark, the far side faint.
  ctx.fillStyle = `rgb(${INK})`;
  for (const near of [false, true]) {
    ctx.globalAlpha = near ? 0.75 : 0.4;
    const r = near ? 1.2 : 0.9;
    ctx.beginPath();
    for (let i = knotsFrom; i < count; i++) {
      if (sz[i] > zc !== near) continue;
      ctx.moveTo(sx[i] + r, sy[i]);
      ctx.arc(sx[i], sy[i], r, 0, TAU);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
