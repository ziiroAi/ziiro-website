// @vitest-environment jsdom
// (C) W14-V: the drive against a real animation-frame queue that honours cancel, so a loop that dies shows up here
// (worker-3's T1/T9). Each test follows a reviewer's failure scenario.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscId } from "../data/contract";
import type { DiscPickEvent } from "./api";
import { createDrive, type Drive } from "./drive";
import type { SpineHandle } from "./host";
import type { DiscBox } from "./scene";

let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
let now = 0;
let hidden = false;
let desktop = true;
let reduce = false;
let watchers: IntersectionObserverCallback[] = [];
let drive: Drive | null = null;

/** Runs the frames queued so far, n times over, stepMs apart. */
function flush(n = 1, stepMs = 16) {
  for (let i = 0; i < n; i++) {
    now += stepMs;
    const due = [...queue.values()];
    queue = new Map();
    due.forEach((frame) => frame(now));
  }
}

const handleOf = (offThread = false) => ({
  offThread,
  render: vi.fn(),
  pick: vi.fn(async () => null as DiscId | null),
  resize: vi.fn(),
  setTheme: vi.fn(async () => undefined),
  setLevels: vi.fn(),
  dispose: vi.fn(),
});

let handle = handleOf();
const yaw = () => handle.render.mock.calls.at(-1)![0].yaw as number;
const el = document.createElement("div");
el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });

function start(options: { offThread?: boolean; spin?: boolean } = {}) {
  handle = handleOf(options.offThread);
  const onSpinOff = vi.fn();
  drive = createDrive(el, handle as unknown as SpineHandle, "desktop", { spin: options.spin ?? true, inertia: true }, { idleSpin: true, onSpinOff });
  return onSpinOff;
}

const onScreen = (isIntersecting: boolean) =>
  watchers.forEach((watch) => watch([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
function setHidden(next: boolean) {
  hidden = next;
  document.dispatchEvent(new Event("visibilitychange"));
}
function pointer(type: string, x: number, y = 150, pointerType = "mouse") {
  el.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }), { pointerId: 1, pointerType }));
}
const disc = (id: DiscId, left: number, top: number, size: number): DiscBox =>
  ({ disc: id, left, top, width: size, height: size, anchor: { x: left + size, y: top }, onScreen: true });

beforeEach(() => {
  queue = new Map();
  nextId = 1;
  now = 0;
  hidden = false;
  desktop = true;
  reduce = false;
  watchers = [];
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, frame);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => void queue.delete(id));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        watchers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduced-motion") ? reduce : desktop,
    addEventListener() {},
    removeEventListener() {},
  }));
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  drive?.dispose();
  drive = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the loop after a pause (T1)", () => {
  it("spins on after it scrolls off screen mid-spin and back", () => {
    start();
    flush(3);
    const before = yaw();
    onScreen(false);
    flush(2);
    onScreen(true);
    flush(3);
    expect(yaw()).toBeGreaterThan(before);
    expect(queue.size).toBe(1);
  });

  it("spins on after the tab is hidden mid-spin and shown again", () => {
    start();
    flush(3);
    const before = yaw();
    setHidden(true);
    flush(2);
    setHidden(false);
    flush(3);
    expect(yaw()).toBeGreaterThan(before);
  });

  it("still turns on a drag, draws on a wake and lands a flight after both", async () => {
    start({ spin: false });
    pointer("pointerdown", 100);
    flush();
    onScreen(false);
    onScreen(true);
    setHidden(true);
    setHidden(false);
    pointer("pointermove", 160);
    flush();
    expect(yaw()).toBeGreaterThan(0.4);
    pointer("pointerup", 160);
    flush(40);
    const drawn = handle.render.mock.calls.length;
    drive!.wake();
    flush();
    expect(handle.render.mock.calls.length).toBe(drawn + 1);
    let landed = false;
    void drive!.flyTo({ kind: "overview" }).then(() => (landed = true));
    flush(80);
    await Promise.resolve();
    expect(landed).toBe(true);
  });
});

describe("judging a GPU behind a worker (W14-U M1)", () => {
  it("turns the spin off when the worker acks its frames 64 ms apart, though the page runs at 60 fps", () => {
    const onSpinOff = start({ offThread: true });
    for (let frame = 0; frame < 160; frame++) {
      flush(1, 16);
      // The worker draws only every fourth view it is sent: one ack per 64 ms.
      if (frame % 4 === 3) drive!.takeBoxes([]);
    }
    expect(onSpinOff).toHaveBeenCalled();
  });

  it("keeps the spin when the worker keeps up", () => {
    const onSpinOff = start({ offThread: true });
    for (let frame = 0; frame < 160; frame++) {
      flush(1, 16);
      drive!.takeBoxes([]);
    }
    expect(onSpinOff).not.toHaveBeenCalled();
  });
});

describe("one tap rule, tap.ts's (T3)", () => {
  async function tapAt(x: number, y: number, pointerType: string) {
    pointer("pointerdown", x, y, pointerType);
    pointer("pointerup", x, y, pointerType);
    await Promise.resolve();
  }

  it("on the desktop variant, a touch on a small disc lands inside its 44 × 44 padding", async () => {
    start({ spin: false });
    const events: DiscPickEvent[] = [];
    drive!.onDiscPick((event) => events.push(event));
    drive!.takeBoxes([disc("G03", 100, 100, 20)]);
    await tapAt(110, 128, "touch");
    expect(events.map((e) => e.disc)).toEqual(["G03"]);
    expect(handle.pick).not.toHaveBeenCalled();
  });

  it("on the desktop variant, a mouse hover counts inside the padding too", async () => {
    start({ spin: false });
    const events: DiscPickEvent[] = [];
    drive!.onDiscPick((event) => events.push(event));
    drive!.takeBoxes([disc("G03", 100, 100, 20)]);
    pointer("pointermove", 92, 110);
    await Promise.resolve();
    expect(events.map((e) => [e.disc, e.via])).toEqual([["G03", "hover"]]);
  });

  it("on a phone, a disc half off the edge is judged by the part on screen", async () => {
    desktop = false;
    start({ spin: false });
    const events: DiscPickEvent[] = [];
    drive!.onDiscPick((event) => events.push(event));
    drive!.takeBoxes([disc("G05", -30, 100, 60)]);
    // The raycast hits the disc's proxy, and its raw box is 60 px: only its visible 30 px may count.
    handle.pick.mockResolvedValue("G05");
    await tapAt(10, 130, "touch");
    expect(events).toEqual([]);
  });

  it("on a phone, a disc 44 px or more on screen takes the tap", async () => {
    desktop = false;
    start({ spin: false });
    const events: DiscPickEvent[] = [];
    drive!.onDiscPick((event) => events.push(event));
    drive!.takeBoxes([disc("G05", 10, 100, 60)]);
    await tapAt(30, 130, "touch");
    expect(events.map((e) => e.disc)).toEqual(["G05"]);
  });
});

describe("reduced motion turned on while it runs (T8)", () => {
  it("stops the spin and reports reduced motion, and spins again when it is turned off", () => {
    start();
    flush(3);
    expect(drive!.reducedMotion).toBe(false);
    drive!.setMotion({ spin: false, inertia: false });
    flush(2);
    expect(queue.size).toBe(0);
    expect(drive!.reducedMotion).toBe(true);
    const still = yaw();
    drive!.setMotion({ spin: true, inertia: true });
    flush(3);
    expect(yaw()).toBeGreaterThan(still);
  });
});
