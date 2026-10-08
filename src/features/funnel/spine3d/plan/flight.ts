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
 *  camera flies only across the boundary between two sections. */
export function holdWaypoints(sections: readonly Section[], poses: readonly CameraPose[], hold: number): Waypoint[] {
  if (sections.length !== poses.length) throw new Error("holdWaypoints: one pose per section");
  return sections.flatMap((section, i) => {
    const margin = ((section.end - section.start) * (1 - hold)) / 2;
    return [
      { at: section.start + margin, pose: poses[i] },
      { at: section.end - margin, pose: poses[i] },
    ];
  });
}
