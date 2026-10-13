// (C) W18-D: the owner, "i want the light part to be facing the text corresponding to it. the spine should rotate
// accordingly". At each department stop the lit disc's glowing front (its anterior side, away from the processes)
// turns toward that department's text, by the shortest way round, and the camera keeps aiming at the disc.
import { describe, expect, it } from "vitest";
import { DISCS } from "../../data/contract";
import { baseFraming } from "../camera";
import { GAPS } from "../gaps";
import { LOOK } from "../look";
import { ANTERIOR, FACE_ANGLE, faceTurn, screenAngle, turnedCentre } from "./facing";
import { stageKeys, stopSide } from "./stagePath";
import { dot, normalize, sub } from "./vec";

const DEG = Math.PI / 180;
const VIEW = { width: 1440, height: 900 };

describe("the lit disc's front at a department stop (W18-D)", () => {
  it("measures each disc's front from the mesh: away from its processes, across the column", () => {
    expect(ANTERIOR).toHaveLength(GAPS.length);
    ANTERIOR.forEach((front, k) => {
      expect(Math.hypot(...front)).toBeCloseTo(1, 3);
      expect(Math.abs(dot(front, normalize(GAPS[k].normal)))).toBeLessThan(0.05);
    });
  });

  it("points the front at the screen's right at r17's camera with no turn (the hero's lateral view)", () => {
    ANTERIOR.forEach((_, k) => expect(Math.abs(screenAngle(k, 0, "desktop") - 90 * DEG)).toBeLessThan(12 * DEG));
  });

  it.each(["desktop", "phone"] as const)("turns the front toward the text on %s: right for a left stop, left for a right stop", (size) => {
    DISCS.forEach((_, k) => {
      expect(screenAngle(k, faceTurn(k, "left", size), size)).toBeCloseTo(FACE_ANGLE, 3);
      expect(screenAngle(k, faceTurn(k, "right", size), size)).toBeCloseTo(-FACE_ANGLE, 3);
    });
    expect(FACE_ANGLE).toBeGreaterThan(30 * DEG);
    expect(FACE_ANGLE).toBeLessThan(80 * DEG);
  });

  it("gives every stop its own disc's turn, alternating with the side", () => {
    const discs = [DISCS[3], DISCS[6], DISCS[1], DISCS[5]];
    const stops = stageKeys(discs, "desktop", "desktop", VIEW, 64).slice(2, -1);
    stops.forEach((stop, i) => {
      const k = DISCS.indexOf(discs[i]);
      expect(screenAngle(k, stop.turn, "desktop")).toBeCloseTo(stopSide(i) === "left" ? FACE_ANGLE : -FACE_ANGLE, 3);
    });
  });

  it("always turns the short way: no two keys more than half a turn apart, so nothing spins round", () => {
    for (const discs of [[DISCS[0], DISCS[8], DISCS[0], DISCS[8]], [DISCS[4], DISCS[2], DISCS[7], DISCS[1], DISCS[6]]]) {
      const keys = stageKeys(discs, "desktop", "desktop", VIEW, 64);
      keys.slice(1).forEach((key, i) => expect(Math.abs(key.turn - keys[i].turn)).toBeLessThanOrEqual(Math.PI));
    }
  });

  it("keeps the stop's zoom on its disc: the camera aims at the disc where the turn has carried it", () => {
    const discs = [DISCS[2], DISCS[5]];
    const stops = stageKeys(discs, "desktop", "desktop", VIEW, 64).slice(2, -1);
    stops.forEach((stop, i) => {
      const centre = turnedCentre(GAPS[DISCS.indexOf(discs[i])].centre, stop.turn);
      stop.framing.target.forEach((x, j) => expect(x).toBeCloseTo(centre[j], 6));
      const base = baseFraming("desktop");
      const back = normalize(sub(base.position, base.target));
      expect(dot(normalize(sub(stop.framing.position, stop.framing.target)), back)).toBeCloseTo(1, 6);
    });
  });

  it("turns a centre about the column: the pivot stays put and no turn leaves it alone", () => {
    const { pivot } = LOOK.model;
    turnedCentre(pivot, 1.2).forEach((x, j) => expect(x).toBeCloseTo(pivot[j], 9));
    const c = GAPS[0].centre;
    turnedCentre(c, 0).forEach((x, j) => expect(x).toBeCloseTo(c[j], 9));
    turnedCentre(c, 2 * Math.PI).forEach((x, j) => expect(x).toBeCloseTo(c[j], 9));
  });
});
