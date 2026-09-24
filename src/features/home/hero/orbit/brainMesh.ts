import { BRAIN_LIFT } from "../brainFrame";

/**
 * The plexus on the brain (the owner's r8 mockup): tiny navy dots on the
 * glass brain's own surface, each joined to its nearest neighbours by a
 * hairline, turning with the brain. Kept quiet, so the glass still reads:
 * the side facing the viewer is drawn at full strength, the far side faintly
 * through the glass.
 *
 * The points are 420 of the brain model's own vertices (the scene's `Model`
 * mesh, in the brain group's frame, with the mesh's paused start rotation and
 * SplineBrain's MODEL_CENTRE applied), chosen by farthest-point sampling so
 * they spread evenly. They are in units of the brain's half-width, with y
 * lowered by Y_OFFSET, stored as int8 at 127 / 1.05 a unit, base64. Sample
 * them again if the scene changes.
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

/** The ink: the mockup's deep navy. */
const INK = "10, 26, 58";

interface Mesh {
  /** x, y, z per point. */
  points: Float32Array;
  /** Pairs of point indices. */
  edges: Uint16Array;
}

let built: Mesh | null = null;

/** Decode the points and join each to its four nearest neighbours, once. */
function mesh(): Mesh {
  if (built) return built;
  const raw = atob(POINTS);
  const count = raw.length / 3;
  const points = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const byte = raw.charCodeAt(i);
    const v = (byte > 127 ? byte - 256 : byte) * SCALE;
    points[i] = i % 3 === 1 ? v + Y_OFFSET : v;
  }
  const seen = new Set<number>();
  const pairs: number[] = [];
  for (let i = 0; i < count; i++) {
    const near: [number, number][] = [];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const dx = points[j * 3] - points[i * 3];
      const dy = points[j * 3 + 1] - points[i * 3 + 1];
      const dz = points[j * 3 + 2] - points[i * 3 + 2];
      near.push([dx * dx + dy * dy + dz * dz, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 4; k++) {
      const j = near[k][1];
      const key = Math.min(i, j) * count + Math.max(i, j);
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(i, j);
    }
  }
  built = { points, edges: Uint16Array.from(pairs) };
  return built;
}

/** Screen positions and depth, reused frame to frame. */
let sx = new Float32Array(0);
let sy = new Float32Array(0);
let sz = new Float32Array(0);

/**
 * Draw the plexus for a brain centred at (cx, cy) in the canvas's CSS pixels,
 * `half` pixels across its half-width, turned by `yaw` and tilted by `pitch`
 * exactly as SplineBrain turns the scene (the group's Euler XYZ, so pitch
 * about x after yaw about y), and projected the way its orthographic camera
 * does.
 */
export function drawBrainMesh(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  half: number,
  yaw: number,
  pitch: number,
) {
  const { points, edges } = mesh();
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
    sz[i] = z2;
  }

  // Hairlines in three depth bands, far to near, one stroke each.
  ctx.strokeStyle = `rgb(${INK})`;
  ctx.lineWidth = 0.55;
  const bands: [number, number, number][] = [
    [-Infinity, -0.25, 0.12],
    [-0.25, 0.25, 0.26],
    [0.25, Infinity, 0.42],
  ];
  for (const [lo, hi, alpha] of bands) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let e = 0; e < edges.length; e += 2) {
      const a = edges[e];
      const b = edges[e + 1];
      const depth = (sz[a] + sz[b]) / 2;
      if (depth < lo || depth >= hi) continue;
      ctx.moveTo(sx[a], sy[a]);
      ctx.lineTo(sx[b], sy[b]);
    }
    ctx.stroke();
  }

  // The dots: the near side dark and a little larger, the far side faint.
  ctx.fillStyle = `rgb(${INK})`;
  for (const near of [false, true]) {
    ctx.globalAlpha = near ? 0.85 : 0.28;
    const r = near ? 1.2 : 0.9;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      if (sz[i] > 0 !== near) continue;
      ctx.moveTo(sx[i] + r, sy[i]);
      ctx.arc(sx[i], sy[i], r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
