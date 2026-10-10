// (C) W16-A: the idle sway stays near r17's three-quarter view, ±25° (the owner, wave16.md W16-A: the hero keeps the
// full spine on the right "near r17", idle sway narrowed). It was W15-C4's +30° to -150°.
import { describe, expect, it } from "vitest";
import { SPIN_RATE } from "./orbit";
import { enterSweep, settleSweep, stepSweep, SWEEP_HI, SWEEP_LO } from "./sweep";

const DEG = Math.PI / 180;
/** Yaw in degrees, wrapped to [-180, 180). */
const wrapped = (yaw: number): number => ((((yaw / DEG + 180) % 360) + 360) % 360) - 180;
const inWindow = (yaw: number): boolean => Math.abs(wrapped(yaw)) <= 25 + 1e-6;

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

describe("the idle sway (W16-A): ±25° about r17's view and back", () => {
  it("is a 50° window centred on r17's yaw (0)", () => {
    expect(SWEEP_HI).toBeCloseTo(25 * DEG);
    expect(SWEEP_LO).toBeCloseTo(-25 * DEG);
  });

  it("stays inside ±25° for 120 s of idle, and covers the whole window", () => {
    const yaws = run(0, 120_000);
    expect(yaws.filter((y) => !inWindow(y))).toEqual([]);
    expect(Math.min(...yaws)).toBeCloseTo(SWEEP_LO, 2);
    expect(Math.max(...yaws)).toBeCloseTo(SWEEP_HI, 2);
  });

  it("moves at today's spin rate on average, eased to a stop at both ends", () => {
    const frame = 16;
    const yaws = run(SWEEP_HI, ((2 * (SWEEP_HI - SWEEP_LO)) / SPIN_RATE) * 1000, frame); // one leg down and one back
    const travelled = yaws.slice(1).reduce((sum, y, i) => sum + Math.abs(y - yaws[i]), 0);
    expect(travelled / ((yaws.length * frame) / 1000)).toBeCloseTo(SPIN_RATE, 2);
    const speeds = yaws.slice(1).map((y, i) => Math.abs(y - yaws[i]) / frame);
    const turnAt = yaws.indexOf(Math.min(...yaws));
    expect(speeds[turnAt - 1]).toBeLessThan((SPIN_RATE / 1000) * 0.05); // nearly still at the far edge
    expect(Math.max(...speeds)).toBeLessThan((SPIN_RATE / 1000) * 1.6); // never much faster than the spin
  });

  it("from 90° (a release on the side) comes down to +25° the short way, then stays in the window", () => {
    const yaws = run(90 * DEG, 60_000);
    expect(yaws.every((y) => wrapped(y) <= 90 + 1e-9 && wrapped(y) > -90)).toBe(true);
    const returnFrames = Math.ceil((((65 * DEG) / SPIN_RATE) * 1000) / 16); // the eased leg 90° -> 25°
    expect(yaws.slice(returnFrames).filter((y) => !inWindow(y))).toEqual([]);
  });

  it("from 200° (-160°) turns up into the window the short way, through 180°", () => {
    const yaws = run(200 * DEG, 5_000);
    expect(yaws.at(-1)!).toBeGreaterThan(200 * DEG);
  });

  it("keeps the whole turns a drag added: from 2 turns + 10° it sways around 2 turns", () => {
    const base = 2 * 2 * Math.PI;
    const yaws = run(base + 10 * DEG, 30_000);
    expect(Math.min(...yaws)).toBeGreaterThan(base + SWEEP_LO - 1e-6);
    expect(Math.max(...yaws)).toBeLessThan(base + SWEEP_HI + 1e-6);
  });

  it("from inside the window heads for its farther edge first", () => {
    expect(run(10 * DEG, 500).at(-1)!).toBeLessThan(10 * DEG);
    expect(run(-20 * DEG, 500).at(-1)!).toBeGreaterThan(-20 * DEG);
  });
});

describe("the sway comes to rest (W23-C): idle frames stop", () => {
  /** Runs a settling sweep from mid-leg till it rests, at most ms. */
  function settle(ms = 20_000, frameMs = 16) {
    let sweep = stepSweep(enterSweep(0), 2_000).sweep;
    sweep = settleSweep(sweep);
    const yaws: number[] = [];
    for (let t = 0; t < ms; t += frameMs) {
      const next = stepSweep(sweep, frameMs);
      sweep = next.sweep;
      yaws.push(next.yaw);
      if (next.rested) return { yaws, rested: true, ms: t + frameMs };
    }
    return { yaws, rested: false, ms };
  }

  it("finishes its leg, then eases to r17's view (the window's middle) and stops there", () => {
    const { yaws, rested } = settle();
    expect(rested).toBe(true);
    expect(wrapped(yaws.at(-1)!)).toBeCloseTo(0, 6);
    expect(yaws.every(inWindow)).toBe(true);
  });

  it("never jerks: no step is bigger than the sway's own fastest, and it slows to a stop", () => {
    const { yaws } = settle();
    const steps = yaws.slice(1).map((y, i) => Math.abs(y - yaws[i]));
    const fastest = (Math.PI / 2) * SPIN_RATE * 0.016 * 1.01;
    expect(Math.max(...steps)).toBeLessThanOrEqual(fastest);
    expect(steps.at(-1)!).toBeLessThan(fastest / 20);
  });

  it("rests within one leg and a half (under 9 s)", () => {
    expect(settle().ms).toBeLessThan(9_000);
  });

  it("a sweep that isn't settling never rests", () => {
    let sweep = enterSweep(0);
    for (let t = 0; t < 60_000; t += 16) {
      const next = stepSweep(sweep, 16);
      expect(next.rested).toBe(false);
      sweep = next.sweep;
    }
  });
});
