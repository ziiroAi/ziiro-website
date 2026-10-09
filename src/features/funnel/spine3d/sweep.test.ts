// (C) W15-C4: the idle sweep never shows the spine's back (yaw 45°-135°: its processes read as lumps there).
import { describe, expect, it } from "vitest";
import { SPIN_RATE } from "./orbit";
import { enterSweep, stepSweep, SWEEP_HI, SWEEP_LO } from "./sweep";

const DEG = Math.PI / 180;
/** Yaw in degrees, wrapped to [-180, 180). */
const wrapped = (yaw: number): number => ((((yaw / DEG + 180) % 360) + 360) % 360) - 180;
const inBack = (yaw: number): boolean => wrapped(yaw) > 45 && wrapped(yaw) < 135;

/** Every yaw the sweep passes through over ms, from yaw, in frames of frameMs. */
function run(yaw: number, ms: number, frameMs = 16): number[] {
  let sweep = enterSweep(yaw);
  const yaws: number[] = [];
  for (let t = 0; t < ms; t += frameMs) {
    const next = stepSweep(sweep, frameMs);
    sweep = next.sweep;
    yaws.push(next.yaw);
  }
  return yaws;
}

describe("the idle sweep (W15-C4): +30° to -150° and back, never the back", () => {
  it("is a 180° window that leaves out 45°-135°", () => {
    expect(SWEEP_HI).toBeCloseTo(30 * DEG);
    expect(SWEEP_LO).toBeCloseTo(-150 * DEG);
  });

  it("never enters 45°-135° in 120 s of idle, and covers the whole window", () => {
    const yaws = run(0, 120_000);
    expect(yaws.filter(inBack)).toEqual([]);
    expect(Math.min(...yaws)).toBeCloseTo(SWEEP_LO, 2);
    expect(Math.max(...yaws)).toBeCloseTo(SWEEP_HI, 2);
  });

  it("moves at today's spin rate on average, eased to a stop at both ends", () => {
    const frame = 16;
    const yaws = run(SWEEP_HI, ((2 * Math.PI) / SPIN_RATE) * 1000, frame); // one leg down and one back
    const travelled = yaws.slice(1).reduce((sum, y, i) => sum + Math.abs(y - yaws[i]), 0);
    expect(travelled / ((yaws.length * frame) / 1000)).toBeCloseTo(SPIN_RATE, 2);
    const speeds = yaws.slice(1).map((y, i) => Math.abs(y - yaws[i]) / frame);
    const turnAt = yaws.indexOf(Math.min(...yaws));
    expect(speeds[turnAt - 1]).toBeLessThan((SPIN_RATE / 1000) * 0.05); // nearly still at the far edge
    expect(Math.max(...speeds)).toBeLessThan((SPIN_RATE / 1000) * 1.6); // never much faster than the spin
  });

  it("from 90° (a release on the back) goes down to +30° without passing 90°, then sweeps", () => {
    const yaws = run(90 * DEG, 60_000);
    expect(yaws.every((y) => wrapped(y) <= 90 + 1e-9)).toBe(true);
    expect(yaws.some((y) => Math.abs(y - SWEEP_HI) < 1e-3)).toBe(true);
    const returnFrames = Math.ceil(((60 * DEG) / SPIN_RATE) * 1000 / 16); // the eased leg 90° -> 30° at the spin's rate
    expect(yaws.slice(returnFrames).filter(inBack)).toEqual([]); // once out, it never goes back in
  });

  it("from 120° goes up past 180° to -150°, never back down through 90°", () => {
    const yaws = run(120 * DEG, 60_000);
    expect(yaws.slice(0, 50).every((y, i, a) => i === 0 || y >= a[i - 1])).toBe(true);
    expect(yaws.filter((y) => wrapped(y) > 45 && wrapped(y) < 90)).toEqual([]);
  });

  it("from 200° (just outside the window) turns up into it, the short way", () => {
    const yaws = run(200 * DEG, 5_000);
    expect(yaws.at(-1)!).toBeGreaterThan(200 * DEG);
    expect(yaws.filter(inBack)).toEqual([]);
  });

  it("keeps the whole turns a drag added: from 2 turns + 10° it sweeps around 2 turns", () => {
    const base = 2 * 2 * Math.PI;
    const yaws = run(base + 10 * DEG, 30_000);
    expect(Math.min(...yaws)).toBeGreaterThan(base + SWEEP_LO - 1e-6);
    expect(Math.max(...yaws)).toBeLessThan(base + SWEEP_HI + 1e-6);
  });

  it("from inside the window heads for its farther edge first", () => {
    expect(run(0, 2_000).at(-1)!).toBeLessThan(0); // 0° is nearer +30°, so it heads down
    expect(run(-140 * DEG, 2_000).at(-1)!).toBeGreaterThan(-140 * DEG);
  });
});
