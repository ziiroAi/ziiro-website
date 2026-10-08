import { describe, expect, it } from "vitest";
import { ease, holdWaypoints, poseAt, tourWaypoints, type Waypoint } from "./flight";
import { GAPS, HERO_DESKTOP } from "./geometry.fixture";
import { overviewPose, stopPoses, type CameraPose } from "./targets";

const pose = (x: number, fovDeg = 30): CameraPose => ({ position: [x, 0, 1], target: [x, 0, 0], rollDeg: 0, fovDeg });
const A = pose(0, 40);
const B = pose(10, 30);
const C = pose(20, 30);
const WAY: Waypoint[] = [
  { at: 0, pose: A },
  { at: 100, pose: B },
  { at: 300, pose: C },
];

describe("ease: 3t² − 2t³, as §6.6's scroll", () => {
  it("holds still at both ends and passes the middle at half", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(0.01)).toBeLessThan(0.01);
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
  });
});

describe("poseAt: the scroll position as a camera pose", () => {
  it("holds the first and last poses outside the waypoints", () => {
    expect(poseAt(-50, WAY)).toEqual(A);
    expect(poseAt(900, WAY)).toEqual(C);
  });

  it("sits exactly on a waypoint's pose at its position", () => {
    expect(poseAt(100, WAY)).toEqual(B);
  });

  it("eases between neighbours: half way in scroll is half way in pose", () => {
    const mid = poseAt(200, WAY);
    expect(mid.position[0]).toBeCloseTo(15, 9);
    expect(mid.target[0]).toBeCloseTo(15, 9);
    expect(poseAt(50, WAY).fovDeg).toBeCloseTo(35, 9);
  });

  it("moves slowly near a stop and fast in the middle", () => {
    const nearStop = poseAt(110, WAY).position[0] - B.position[0];
    const middle = poseAt(210, WAY).position[0] - poseAt(200, WAY).position[0];
    expect(nearStop).toBeLessThan(middle);
  });

  it("never runs backwards as the page scrolls on", () => {
    let last = -Infinity;
    for (let y = 0; y <= 300; y += 5) {
      const x = poseAt(y, WAY).position[0];
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });

  it("under reduced motion it cuts at the half-way point, with no pose in between", () => {
    expect(poseAt(149, WAY, { reducedMotion: true })).toEqual(B);
    expect(poseAt(199, WAY, { reducedMotion: true })).toEqual(B);
    expect(poseAt(201, WAY, { reducedMotion: true })).toEqual(C);
    for (let y = -20; y <= 320; y += 7) {
      expect([A, B, C]).toContainEqual(poseAt(y, WAY, { reducedMotion: true }));
    }
  });

  it("needs at least one waypoint, in scroll order", () => {
    expect(() => poseAt(0, [])).toThrow();
    expect(() => poseAt(0, [{ at: 10, pose: A }, { at: 5, pose: B }])).toThrow(/order/);
  });
});

describe("holdWaypoints: each stop holds while its section fills the middle of the screen", () => {
  const sections = [
    { start: 0, end: 400 },
    { start: 400, end: 1000 },
  ];

  it("gives two waypoints per section, with the stop's pose on both", () => {
    const way = holdWaypoints(sections, [A, B], 0.5);
    expect(way.map((w) => w.at)).toEqual([100, 300, 550, 850]);
    expect(way.map((w) => w.pose)).toEqual([A, A, B, B]);
  });

  it("holds the pose exactly through the hold and flies only between sections", () => {
    const way = holdWaypoints(sections, [A, B], 0.5);
    expect(poseAt(250, way)).toEqual(A);
    expect(poseAt(700, way)).toEqual(B);
    expect(poseAt(425, way).position[0]).toBeGreaterThan(0);
    expect(poseAt(425, way).position[0]).toBeLessThan(10);
  });

  it("needs one pose per section", () => {
    expect(() => holdWaypoints(sections, [A], 0.5)).toThrow(/one pose per section/);
  });

  // Review L1: hold = 1 jumps at the section edge, and above 1 the waypoints fall out of order mid-scroll.
  it.each([1, 1.2, -0.1])("refuses a hold of %s; it must be at least 0 and under 1", (hold) => {
    expect(() => holdWaypoints(sections, [A, B], hold)).toThrow(/hold/);
  });

  it("takes a hold of 0: each stop is a single point", () => {
    expect(holdWaypoints(sections, [A, B], 0).map((w) => w.at)).toEqual([200, 200, 700, 700]);
  });
});

describe("tourWaypoints: Ananya's real tour, with D30's pull-back between stops", () => {
  // Review H1 and T1: real poses from stopPoses, through the waypoints, through poseAt.
  const ANANYA = [{ disc: "G04" }, { disc: "G05" }, { disc: "G06" }, { disc: "G01" }] as const;
  const poses = stopPoses(ANANYA, GAPS, HERO_DESKTOP, "desktop", 0.9);
  const overview = overviewPose(HERO_DESKTOP);
  const sections = [0, 800, 1600, 2400, 3200].map((start) => ({ start, end: start + 800 }));

  it("passes through the full spine at each of the 3 boundaries between close-ups", () => {
    const way = tourWaypoints(sections, poses, 0.5);
    for (const boundary of [1600, 2400, 3200]) expect(poseAt(boundary, way)).toEqual(overview);
  });

  it("holds each close-up through the middle of its stop", () => {
    const way = tourWaypoints(sections, poses, 0.5);
    [400, 1200, 2000, 2800, 3600].forEach((y, i) => expect(poseAt(y, way)).toEqual(poses[i]));
  });

  it("goes from the overview into the first close-up with no extra pull-back", () => {
    const way = tourWaypoints(sections, poses, 0.5);
    const same = (p: CameraPose) => JSON.stringify(p) === JSON.stringify(overview);
    expect(way.filter((w) => same(w.pose))).toHaveLength(2 + 3);
  });

  it("under reduced motion cuts straight from one close-up to the next, never through the overview", () => {
    const way = tourWaypoints(sections, poses, 0.5, { reducedMotion: true });
    expect(poseAt(1590, way, { reducedMotion: true })).toEqual(poses[1]);
    expect(poseAt(1610, way, { reducedMotion: true })).toEqual(poses[2]);
    for (let y = 810; y <= 4000; y += 25) expect(poseAt(y, way, { reducedMotion: true })).not.toEqual(overview);
  });

  it("flies a one-stop plan (§5.5): the overview, then its close-up", () => {
    const one = stopPoses([{ disc: "G04" }], GAPS, HERO_DESKTOP, "desktop", 0.9);
    const way = tourWaypoints(sections.slice(0, 2), one, 0.5);
    expect(way).toHaveLength(4);
    expect(poseAt(0, way)).toEqual(overview);
    expect(poseAt(1600, way)).toEqual(one[1]);
  });

  it("needs one pose per section", () => {
    expect(() => tourWaypoints(sections, poses.slice(0, 3), 0.5)).toThrow(/one pose per section/);
  });
});
