import { describe, expect, it } from "vitest";
import { GAPS, HERO_DESKTOP, HERO_PHONE } from "./geometry.fixture";
import { CLOSE_UP, closeUpPose, discIndex, overviewPose, stopPoses } from "./targets";
import { dot, length, normalize, scale, sub } from "./vec";

const deg = (rad: number) => (rad * 180) / Math.PI;
const SALES = GAPS[5]; // G05

describe("overviewPose: r17's own camera, as a pose", () => {
  it("keeps the camera's position, aim and roll", () => {
    const pose = overviewPose(HERO_DESKTOP);
    expect(pose.position).toEqual(HERO_DESKTOP.position);
    expect(pose.target).toEqual(HERO_DESKTOP.target);
    expect(pose.rollDeg).toBe(HERO_DESKTOP.rollDeg);
  });

  it("gives the vertical field of view from the lens, with the sensor across the longer side", () => {
    // Landscape 16:9: 36 mm across the width, so the height sees 36 × 9/16.
    expect(overviewPose(HERO_DESKTOP).fovDeg).toBeCloseTo(deg(2 * Math.atan((36 * 1080) / 1920 / 2 / 34.3189)), 6);
    // Portrait: the sensor runs down the frame.
    expect(overviewPose(HERO_PHONE).fovDeg).toBeCloseTo(deg(2 * Math.atan(18 / 68)), 6);
  });
});

describe("closeUpPose: one department disc, filling the frame", () => {
  it("looks at the disc's centre", () => {
    expect(closeUpPose(SALES, HERO_DESKTOP, "desktop", 1).target).toEqual(SALES.centre);
  });

  it("stays on the hero camera's side of the spine, so the lit front band faces it", () => {
    // Compared in the disc's own plane: the hero looks up from below, the close-up a little down.
    const pose = closeUpPose(SALES, HERO_DESKTOP, "desktop", 1);
    const flat = (v: readonly [number, number, number]) => normalize(sub(v, scale(SALES.normal, dot(v, SALES.normal))));
    const toCamera = flat(sub(pose.position, SALES.centre));
    const toHero = flat(sub(HERO_DESKTOP.position, SALES.centre));
    expect(dot(toCamera, toHero)).toBeGreaterThan(0.999);
  });

  it("looks down onto the disc a little, along its own normal", () => {
    const pose = closeUpPose(SALES, HERO_DESKTOP, "desktop", 1);
    const along = dot(normalize(sub(pose.position, SALES.centre)), SALES.normal);
    expect(along).toBeGreaterThan(0.1);
    expect(along).toBeLessThan(0.5);
  });

  it.each([
    ["desktop", 1.6],
    ["desktop", 0.8],
    ["phone", 1170 / 1230],
  ] as const)("on %s at aspect %s the disc's width fills its share of the frame's smaller side", (variant, aspect) => {
    const pose = closeUpPose(SALES, HERO_DESKTOP, variant, aspect);
    const half = Math.tan((pose.fovDeg * Math.PI) / 360) * Math.min(1, aspect);
    const distance = length(sub(pose.position, SALES.centre));
    expect(SALES.grooveRadius / distance / half).toBeCloseTo(CLOSE_UP[variant].fill, 6);
  });

  it("frames closer on the phone band than on desktop", () => {
    const desktop = closeUpPose(SALES, HERO_DESKTOP, "desktop", 1.2);
    const phone = closeUpPose(SALES, HERO_PHONE, "phone", 1170 / 1230);
    expect(length(sub(phone.position, SALES.centre))).toBeLessThan(length(sub(desktop.position, SALES.centre)));
  });
});

describe("stopPoses: the plan's stops in scroll order (§5.5), after the overview", () => {
  // Ananya: Deals, Sales, Marketing, Back Office (§6.7).
  const stops = [{ disc: "G04" }, { disc: "G05" }, { disc: "G06" }, { disc: "G01" }] as const;

  it("starts on the overview, then flies to each stop's disc in plan order", () => {
    const poses = stopPoses(stops, GAPS, HERO_DESKTOP, "desktop", 1.2);
    expect(poses).toHaveLength(5);
    expect(poses[0]).toEqual(overviewPose(HERO_DESKTOP));
    expect(poses.slice(1).map((p) => p.target)).toEqual([GAPS[4].centre, GAPS[5].centre, GAPS[6].centre, GAPS[1].centre]);
  });

  it("uses the phone camera and framing for the phone band", () => {
    const poses = stopPoses(stops, GAPS, HERO_PHONE, "phone", 1170 / 1230);
    expect(poses[0]).toEqual(overviewPose(HERO_PHONE));
    expect(poses[1]).toEqual(closeUpPose(GAPS[4], HERO_PHONE, "phone", 1170 / 1230));
  });

  it("refuses the end discs, which belong to no department", () => {
    expect(() => stopPoses([{ disc: "G00" }], GAPS, HERO_DESKTOP, "desktop", 1)).toThrow(/end disc/);
    expect(() => stopPoses([{ disc: "G08" }], GAPS, HERO_DESKTOP, "desktop", 1)).toThrow(/end disc/);
  });

  it("reads a disc's index from its id", () => {
    expect(discIndex("G00")).toBe(0);
    expect(discIndex("G07")).toBe(7);
  });
});
