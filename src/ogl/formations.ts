/**
 * Cinematic point-cloud sculpture engine — 11 scenes.
 *
 * Every formation is a large-scale parametric 3D sculpture (no icons,
 * no flat clip-art): fabric, Möbius ribbon, DNA helix, organic network,
 * architectural lattice, infinite tunnel, topographic terrain, fractal
 * tree, flow-field streams, a perfect sphere, and a burst universe.
 * The camera reveals each form; scale and depth carry the design.
 *
 * All formations pack into one particle count. Points are sorted
 * bottom-to-top so particle i occupies an analogous position in
 * consecutive sculptures — each form inherits the previous one's body.
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

export const FORMATION_LABELS = [
  "THE WAVE",
  "THE NETWORK",
  "THE TERRAIN",
  "THE TREE",
  "THE SPHERE",
  "INFINITY",
] as const;

export const SCENE_COUNT = FORMATION_LABELS.length;

// Per-scene effect strengths, lerped by the component each frame
// Index-aligned to FORMATION_LABELS: wave, network, terrain, tree, sphere, infinity
export const SCENE_PULSE = [0, 0.55, 0.35, 0.45, 0, 0];
export const SCENE_CLOTH = [6, 0, 0, 0, 0, 0];
export const SCENE_BREATH = [0, 0, 0, 0, 0.07, 0];
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
// 1 — THE WAVE: a vast fabric surface; cloth motion lives in-shader
// ==================================================================
function genWaveSurface(count: number): Pt[] {
  const pts: Pt[] = [];
  const rows = 80;
  const cols = Math.floor(count / rows);
  const spx = 1.6;
  const spy = 0.9;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pts.push({
        x: (c - (cols - 1) / 2) * spx,
        y: ((rows - 1) / 2 - r) * spy,
        z: 0,
        s: 0.45 + 0.15 * Math.sin(c * 0.25) * Math.sin(r * 0.3),
        f: 0,
      });
    }
  }
  return pts;
}

// ==================================================================
// 4 — THE NETWORK: organic pathways — curved links, dendrite twigs
// ==================================================================
function genNetwork(scale: number): Pt[] {
  const pts: Pt[] = [];
  const rand = seededRandom(97);
  const nodeCount = 22;
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < nodeCount; i++) {
    const gy = 1 - (i / (nodeCount - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - gy * gy));
    const th = i * 2.39996;
    nodes.push([
      Math.cos(th) * rad * 26 + (rand() - 0.5) * 5,
      gy * 17 + (rand() - 0.5) * 4,
      Math.sin(th) * rad * 16 + (rand() - 0.5) * 5,
    ]);
  }

  const clusterN = Math.floor(45 * scale);
  for (const [nx, ny, nz] of nodes) {
    for (let i = 0; i < clusterN; i++) {
      const gy = 1 - (i / (clusterN - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - gy * gy));
      const th = i * 2.39996;
      pts.push({
        x: nx + Math.cos(th) * rad * 2.0,
        y: ny + gy * 2.0,
        z: nz + Math.sin(th) * rad * 2.0,
        s: 0.95 + 0.2 * Math.sin(i * 3.1),
        f: 0,
      });
    }
  }

  // Curved links (quadratic bezier, double rail) to 2 nearest nodes
  const linked = new Set<string>();
  for (let a = 0; a < nodeCount; a++) {
    const dists = nodes
      .map((n, idx) => ({
        idx,
        d: Math.hypot(n[0] - nodes[a][0], n[1] - nodes[a][1], n[2] - nodes[a][2]),
      }))
      .filter((e) => e.idx !== a)
      .sort((p, q) => p.d - q.d);
    for (let k = 0; k < 2; k++) {
      const bIdx = dists[k].idx;
      const key = a < bIdx ? `${a}-${bIdx}` : `${bIdx}-${a}`;
      if (linked.has(key)) continue;
      linked.add(key);
      const A = nodes[a];
      const B = nodes[bIdx];
      const mx = (A[0] + B[0]) / 2 + (rand() - 0.5) * 12;
      const my = (A[1] + B[1]) / 2 + (rand() - 0.5) * 10;
      const mz = (A[2] + B[2]) / 2 + (rand() - 0.5) * 12;
      const n = Math.floor(70 * scale);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = (1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * mx + u * u * B[0];
        const y = (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * my + u * u * B[1];
        const z = (1 - u) * (1 - u) * A[2] + 2 * (1 - u) * u * mz + u * u * B[2];
        for (const off of [-0.35, 0.35]) {
          pts.push({ x: x + off, y: y + off * 0.6, z, s: 0.42, f: 1 + u * 24 });
        }
      }
    }
  }

  // Dendrite twigs growing off each node
  for (const [nx, ny, nz] of nodes) {
    for (let tw = 0; tw < 3; tw++) {
      const dx = rand() - 0.5;
      const dy = rand() - 0.5;
      const dz = rand() - 0.5;
      const dl = Math.hypot(dx, dy, dz) || 1;
      const len = 5 + rand() * 5;
      const n = Math.floor(20 * scale);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const bend = u * u * 3;
        pts.push({
          x: nx + (dx / dl) * len * u,
          y: ny + (dy / dl) * len * u + bend * (rand() > 0.5 ? 0.2 : -0.2),
          z: nz + (dz / dl) * len * u,
          s: 0.5 - u * 0.2,
          f: 0,
        });
      }
    }
  }
  return pts;
}

// ==================================================================
// 7 — THE TERRAIN: topographic landscape with contour emphasis
// ==================================================================
function genTerrain(count: number): Pt[] {
  const pts: Pt[] = [];
  const rows = 88;
  const cols = Math.floor(count / rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 1.15;
      const z = (r - (rows - 1) / 2) * 1.1;
      const h =
        7 * Math.sin(x * 0.055 + 1) * Math.cos(z * 0.075) +
        4.5 * Math.sin(x * 0.11 + 2.4) * Math.sin(z * 0.14 + 0.7) +
        2 * Math.sin(x * 0.23) * Math.cos(z * 0.2 + 1.9);
      // contour lines: emphasize dots near height isolines; energy
      // pulses sweep along the contours so the landscape stays alive
      const iso = Math.abs(((h / 3) % 1 + 1) % 1 - 0.5);
      const onContour = iso > 0.42;
      pts.push({
        x,
        y: h - 6,
        z,
        s: onContour ? 0.95 : 0.4 + 0.05 * Math.sin(c * 0.5 + r * 0.3),
        f: onContour ? 1 + (x + z + 130) * 0.25 : 0,
      });
    }
  }
  return pts;
}

// ==================================================================
// 8 — THE TREE: fractal 3D branching system, growth pulses rising
// ==================================================================
function genTree(count: number): Pt[] {
  const pts: Pt[] = [];
  const rand = seededRandom(55);
  const GOLD = 2.39996;

  const branch = (
    px: number, py: number, pz: number,
    dx: number, dy: number, dz: number,
    len: number, depth: number, pathBase: number,
  ) => {
    if (pts.length >= count) return;
    const steps = Math.max(2, Math.floor(len / 0.55));
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      pts.push({
        x: px + dx * len * t,
        y: py + dy * len * t,
        z: pz + dz * len * t,
        s: Math.max(0.35, 1.05 - depth * 0.11),
        f: 1 + (pathBase + len * t) * 1.1,
      });
    }
    if (depth >= 7) return;
    const ex = px + dx * len;
    const ey = py + dy * len;
    const ez = pz + dz * len;
    const children = depth < 2 ? 3 : 2;
    for (let c = 0; c < children; c++) {
      const th = c * GOLD + rand() * 1.2;
      const rx = Math.cos(th) * 0.6;
      const rz = Math.sin(th) * 0.6;
      let ndx = dx * 0.75 + rx;
      let ndy = dy * 0.75 + 0.35 + rand() * 0.2;
      let ndz = dz * 0.75 + rz;
      const nl = Math.hypot(ndx, ndy, ndz) || 1;
      ndx /= nl;
      ndy /= nl;
      ndz /= nl;
      branch(ex, ey, ez, ndx, ndy, ndz, len * 0.68, depth + 1, pathBase + len);
    }
  };

  branch(0, -38, 0, 0, 1, 0, 21, 0, 0);
  return pts;
}

// ==================================================================
// 10 — THE SPHERE: a perfect breathing fibonacci sphere
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
// 11 — INFINITY: the burst universe behind the final CTA
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

  const pointSets: Pt[][] = [
    genWaveSurface(count),
    genNetwork(scale),
    genTerrain(count),
    genTree(count),
    genSphere(scale),
    genUniverse(scale),
  ];

  return pointSets.map((pts) => pack(pts, count));
}
