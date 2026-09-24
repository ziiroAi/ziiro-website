/**
 * Orbit geometry, in stage units (su). Stage su = reference px − (860, 83).
 * Every number was measured on the reference image, not estimated.
 *
 * Angles are maths convention: 0° = right, y UP, anticlockwise positive. The
 * nodes travel with increasing angle, i.e. top → left → bottom, anticlockwise
 * on screen.
 */

/**
 * The stage box, 677 × 844 su: the SINGLE source of the stage's width.
 * HeroStage publishes it as `--stage-w` and the page CSS sizes the stage from
 * it. The reference's stage was 652 wide with the core disc hanging 16 su past
 * its right edge; the stage now runs 25 su further right, so its right edge
 * (the brain's flat side, flush with the screen edge) sits 50 su right of the
 * core and the whole disc stays on screen. The left edge and every coordinate
 * below are unchanged.
 */
export const STAGE_W = 677;
export const STAGE_H = 844;

/** Core point C. The threads converge on it; CoreDisc is centred on it. */
export const CORE = { x: 627, y: 415 } as const;

/** Track T: the least-squares circle through the eight measured dots. */
export const TRACK = { x: 535.4, y: 415.3, r: 405.6 } as const;

/**
 * Where a dot sits along the track, in order: the hidden entry slot, slots
 * 1–8 (the rest frame, one department each), then the hidden exit slot. Every
 * node goes slot k → k+1 in exactly one step, so the flow is continuous and
 * every integer step reproduces the reference exactly.
 */
export const SLOT_ANGLES = [
  97.3, 116.7, 138.1, 156.7, 172.8, 196.3, 212.6, 231.8, 252.4, 271.8,
] as const;

/** The fixed hollow marker between slots 4 and 5. */
export const FOCUS_ANGLE = 183.1;

/**
 * Text block offset from the dot centre, per slot (entry … exit), measured on
 * the reference: the label's ink right edge (dx) and its baseline (dy). The
 * picture is not perfectly regular, so the offset is interpolated along the
 * track rather than held constant; at rest every label lands where the
 * reference has it. Entry and exit copy their neighbours.
 */
export const TEXT_DX = [-30, -30, -31, -40, -33, -35, -35, -42, -37, -37] as const;
// Slots 1 and 8 are 2 su higher than the first fit: re-measured ink put them
// 2px low there (and nowhere else) once the role line was in the block.
export const TEXT_DY = [3, 3, 6, 8, 7.5, 12, 12, 9, 10.5, 10.5] as const;

/** Rings drawn about C, measured as radial ink peaks on the reference. */
export const RING_INNER_R = 384;
export const SATELLITE_R = 400;
export const RING_OUTER_R = 442;

/** A static thread runs from the dot's ring to here (radius about C), where it
 *  runs into the fibres round the glass brain (it was the orange raster's
 *  dense rim). The active thread runs on to the core. */
export const THREAD_END_R = 378;
/** A node, from the outside in: a soft orange halo that fades out by r 18, a
 *  pale outer hairline at r 15.5, the white-filled ring around the dot (the
 *  reference's ring peaks at r 13), and the solid dot itself, r 6.3. */
export const NODE_HALO_R = 18;
export const NODE_OUTER_R = 15.5;
export const NODE_RING_R = 13;
export const DOT_R = 6.3;
/** The core's ring (CoreDisc): the active thread and the pulse land on it.
 *  It was the old 41 su disc; the core is now a small ringed point. */
export const CORE_DISC_R = 14;

/**
 * Satellite dots on the r≈400 ring, as reference px − (860, 83). They drift
 * anticlockwise with the brain.
 */
export const SATELLITES = [
  { x: 415, y: 77, r: 2.6 },
  { x: 293, y: 204, r: 2.4 },
  { x: 238, y: 521, r: 2.8 },
  { x: 269, y: 589, r: 2.2 },
  { x: 354, y: 695, r: 2.6 },
  { x: 520, y: 800, r: 2.4 },
] as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

const RAD = Math.PI / 180;

export function trackPoint(deg: number): Point {
  return {
    x: TRACK.x + TRACK.r * Math.cos(deg * RAD),
    y: TRACK.y - TRACK.r * Math.sin(deg * RAD),
  };
}

/** Linear interpolation of a per-slot table at a fractional slot index. */
export function slotLerp(table: readonly number[], at: number): number {
  const i = Math.max(0, Math.min(table.length - 2, Math.floor(at)));
  const f = Math.max(0, Math.min(1, at - i));
  return table[i] + (table[i + 1] - table[i]) * f;
}

/** Angle (screen, CSS rotate convention: clockwise positive) from p to C, and
 *  the distance. */
export function towardCore(p: Point): { deg: number; dist: number } {
  const dx = CORE.x - p.x;
  const dy = CORE.y - p.y;
  return { deg: Math.atan2(dy, dx) / RAD, dist: Math.hypot(dx, dy) };
}
