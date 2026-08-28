/**
 * Cinematic point-cloud sculpture engine: 11 scenes.
 *
 * Every formation is a large-scale parametric 3D sculpture (no icons,
 * no flat clip-art): fabric, Möbius ribbon, DNA helix, organic network,
 * architectural lattice, infinite tunnel, topographic terrain, fractal
 * tree, flow-field streams, a perfect sphere, and a burst universe.
 * The camera reveals each form; scale and depth carry the design.
 *
 * All formations pack into one particle count. Points are sorted
 * bottom-to-top so particle i occupies an analogous position in
 * consecutive sculptures; each form inherits the previous one's body.
 * Unused particles park on an active dot with size 0: nothing fades,
 * nothing pops, dots only travel.
 *
 * Each dot carries a "flow" coordinate (0 = none, >=1 = phase along a
 * path) used by the shader to run traveling energy pulses along
 * strands, links, tunnel depth, branches, and streamlines.
 */

const TAU = Math.PI * 2;

export interface Formation {
  positions: Float32Array;
  sizes: Float32Array;
  flows: Float32Array;
}

export const FORMATION_LABELS = ["THE SPHERE", "INFINITY"] as const;

export const SCENE_COUNT = FORMATION_LABELS.length;

// Per-scene effect strengths, lerped by the component each frame.
// Index-aligned to FORMATION_LABELS: sphere, infinity.
export const SCENE_PULSE = [0, 0];
export const SCENE_CLOTH = [0, 0];
export const SCENE_BREATH = [0.07, 0];
// The sphere -> universe explosion is driven by radial wind instead
export const COLLAPSE_SEGMENT = -1;

interface Pt {
  x: number;
  y: number;
  z: number;
  s: number;
  f: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pack(points: Pt[], count: number): Formation {
  // Bottom-to-top spatial sort: morphs read as one sculpture evolving
  // into the next instead of a scramble.
  points.sort((a, b) => {
    const by = Math.round(a.y / 4) - Math.round(b.y / 4);
    if (by) return by;
    if (a.x !== b.x) return a.x - b.x;
    return a.z - b.z;
  });

  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const flows = new Float32Array(count);
  if (points.length === 0) points.push({ x: 0, y: 0, z: 0, s: 1, f: 0 });
  const K = Math.max(1, Math.min(points.length, count));

  for (let i = 0; i < count; i++) {
    const p = points[i < K ? i : i % K];
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    sizes[i] = i < K ? p.s : 0;
    flows[i] = i < K ? p.f : 0;
  }
  return { positions, sizes, flows };
}

// ==================================================================
// 10. THE SPHERE: a perfect breathing fibonacci sphere
// ==================================================================
function genSphere(scale: number): Pt[] {
  const pts: Pt[] = [];
  const n = Math.floor(7000 * scale);
  const R = 26;
  for (let i = 0; i < n; i++) {
    const gy = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - gy * gy));
    const th = i * 2.39996;
    pts.push({
      x: Math.cos(th) * rad * R,
      y: gy * R,
      z: Math.sin(th) * rad * R,
      s: 0.5 + 0.08 * Math.sin(gy * 14),
      f: 0,
    });
  }
  return pts;
}

// ==================================================================
// 11. INFINITY: the burst universe behind the final CTA
// ==================================================================
function genUniverse(scale: number): Pt[] {
  const pts: Pt[] = [];
  const rand = seededRandom(777);
  const n = Math.floor(3200 * scale);
  for (let i = 0; i < n; i++) {
    const th = rand() * TAU;
    const ph = Math.acos(2 * rand() - 1);
    const r = 20 + Math.pow(rand(), 0.7) * 65;
    pts.push({
      x: r * Math.sin(ph) * Math.cos(th),
      y: r * Math.sin(ph) * Math.sin(th) * 0.7,
      z: r * Math.cos(ph),
      s: 0.35 + rand() * 0.35,
      f: 0,
    });
  }
  return pts;
}

// ==================================================================
// Builder
// ==================================================================
export function buildFormations(count: number, mobile: boolean): Formation[] {
  const scale = mobile ? 0.5 : 1;

  const pointSets: Pt[][] = [genSphere(scale), genUniverse(scale)];

  return pointSets.map((pts) => pack(pts, count));
}
