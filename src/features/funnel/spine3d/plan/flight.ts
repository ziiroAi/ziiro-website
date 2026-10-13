// (C) W14-F (b): the plan's scroll position as a camera pose. Between two waypoints the camera eases with §6.6's
// 3t² − 2t³, so it holds still at each stop. Under prefers-reduced-motion it cuts at the half-way point instead.
import type { CameraPose } from "./targets";
import { lerp, lerp3 } from "./vec";

/** A pose held fully at one scroll position, in px. */
export interface Waypoint {
  at: number;
  pose: CameraPose;
}

export interface FlightOptions {
  reducedMotion?: boolean;
}

/** A stop's stretch of the page, in scroll px. */
export interface Section {
  start: number;
  end: number;
}

const REDUCED_CUT = 0.5;

export function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function blend(a: CameraPose, b: CameraPose, t: number): CameraPose {
  return {
    position: lerp3(a.position, b.position, t),
    target: lerp3(a.target, b.target, t),
    rollDeg: lerp(a.rollDeg, b.rollDeg, t),
    fovDeg: lerp(a.fovDeg, b.fovDeg, t),
  };
}

export function poseAt(scroll: number, waypoints: readonly Waypoint[], options: FlightOptions = {}): CameraPose {
  if (waypoints.length === 0) throw new Error("poseAt: no waypoints");
  waypoints.forEach((w, i) => {
    if (i > 0 && w.at < waypoints[i - 1].at) throw new Error("poseAt: waypoints out of scroll order");
  });
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  if (scroll <= first.at) return first.pose;
  if (scroll >= last.at) return last.pose;
  const next = waypoints.findIndex((w) => w.at > scroll);
  const from = waypoints[next - 1];
  const to = waypoints[next];
  const t = (scroll - from.at) / (to.at - from.at);
  if (options.reducedMotion) return t < REDUCED_CUT ? from.pose : to.pose;
  if (from.pose === to.pose) return from.pose;
  return blend(from.pose, to.pose, ease(t));
}

/** Two waypoints per section, so each stop's pose holds through the middle `hold` share of its section and the
 *  camera flies only across the boundary between two sections. `hold` is at least 0 and under 1: at 1 the camera
 *  would jump at the section edge. */
export function holdWaypoints(sections: readonly Section[], poses: readonly CameraPose[], hold: number): Waypoint[] {
  if (sections.length !== poses.length) throw new Error("holdWaypoints: one pose per section");
  if (!(hold >= 0 && hold < 1)) throw new Error(`holdWaypoints: hold must be at least 0 and under 1, got ${hold}`);
  return sections.flatMap((section, i) => {
    const margin = ((section.end - section.start) * (1 - hold)) / 2;
    return [
      { at: section.start + margin, pose: poses[i] },
      { at: section.end - margin, pose: poses[i] },
    ];
  });
}

/**
 * The plan's tour: section 0 holds the overview (poses[0], as stopPoses builds it), then one close-up per stop.
 * Between two close-ups the camera pulls back to the full spine at the boundary, then flies into the next disc
 * (D30, §6.2 block 3, §6.7 beat 3). Under reduced motion there is no pull-back: one cut per boundary, straight from
 * close-up to close-up (§11.8).
 */
export function tourWaypoints(
  sections: readonly Section[],
  poses: readonly CameraPose[],
  hold: number,
  options: FlightOptions = {},
): Waypoint[] {
  const held = holdWaypoints(sections, poses, hold);
  if (options.reducedMotion) return held;
  const overview = poses[0];
  return sections.flatMap((section, i) => {
    const own = held.slice(i * 2, i * 2 + 2);
    const pullBack = i >= 2 ? [{ at: section.start, pose: overview }] : [];
    return [...pullBack, ...own];
  });
}
