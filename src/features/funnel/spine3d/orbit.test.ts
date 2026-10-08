import { describe, expect, it } from "vitest";
import { dragBy, grab, PITCH_LIMIT, release, REST, SPIN_RATE, step } from "./orbit";

const DEG = Math.PI / 180;

describe("orbit (W14-C §2): yaw free, pitch clamped, inertia, idle spin", () => {
  it("turns yaw freely past a full turn", () => {
    let o = grab(REST);
    for (let i = 0; i < 10; i++) o = dragBy(o, 400, 0, 16);
    expect(o.yaw).toBeGreaterThan(2 * Math.PI);
  });

  it("clamps pitch to about ±20°", () => {
    expect(PITCH_LIMIT).toBeCloseTo(20 * DEG);
    expect(dragBy(grab(REST), 0, 5000, 16).pitch).toBeCloseTo(PITCH_LIMIT);
    expect(dragBy(grab(REST), 0, -5000, 16).pitch).toBeCloseTo(-PITCH_LIMIT);
  });

  it("never changes the orbit it was given", () => {
    const start = grab(REST);
    const frozen = { ...start };
    dragBy(start, 100, 50, 16);
    step(start, 16, { spin: true, inertia: true });
    expect(start).toEqual(frozen);
  });

  it("keeps turning after a release with inertia, and slows to a stop", () => {
    const flung = release(dragBy(grab(REST), 60, 0, 16), { inertia: true });
    const first = step(flung, 16, { spin: false, inertia: true });
    expect(first.orbit.yaw).toBeGreaterThan(flung.yaw);
    expect(first.moving).toBe(true);
    let o = first.orbit;
    let moving = true;
    for (let i = 0; i < 600 && moving; i++) ({ orbit: o, moving } = step(o, 16, { spin: false, inertia: true }));
    expect(moving).toBe(false);
  });

  it("stops dead on release without inertia (reduced motion), but the drag itself still turns it", () => {
    const dragged = dragBy(grab(REST), 60, 0, 16);
    expect(dragged.yaw).toBeGreaterThan(0);
    const letGo = release(dragged, { inertia: false });
    const next = step(letGo, 16, { spin: false, inertia: false });
    expect(next.orbit.yaw).toBe(letGo.yaw);
    expect(next.moving).toBe(false);
  });

  it("spins slowly when idle, and not while held", () => {
    const idle = step(REST, 1000, { spin: true, inertia: true });
    expect(idle.orbit.yaw).toBeCloseTo(SPIN_RATE);
    expect(idle.moving).toBe(true);
    const held = step(grab(REST), 1000, { spin: true, inertia: true });
    expect(held.orbit.yaw).toBe(0);
  });
});
