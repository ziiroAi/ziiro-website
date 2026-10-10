// @vitest-environment jsdom
// (C) W14-V: the drive against a real animation-frame queue that honours cancel, so a loop that dies shows up here
// (worker-3's T1/T9). Each test follows a reviewer's failure scenario.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscId } from "../data/contract";
import type { DiscPickEvent } from "./api";
import { baseFraming, framingFor } from "./camera";
import { createDrive, SCROLL_REST_MS, SWAY_REST_AFTER_MS, type Drive } from "./drive";

/** W23-C3 L2: a page theme crossfade under way, or null. */
let themeFade: object | null = null;
vi.mock("../flow/theme", () => ({ themeFadeNow: () => themeFade }));
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

function start(options: { offThread?: boolean; spin?: boolean; size?: "phone" | "desktop" } = {}) {
  handle = handleOf(options.offThread);
  const onSpinOff = vi.fn();
  drive = createDrive(el, handle as unknown as SpineHandle, options.size ?? "desktop", { spin: options.spin ?? true, inertia: true }, { idleSpin: true, onSpinOff });
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
  themeFade = null;
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
    expect(yaw()).not.toBe(before); // W15-C4: the idle sweep moves on (it no longer only turns one way)
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
    expect(yaw()).not.toBe(before);
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

describe("a tour stop holds the side view (W14-X)", () => {
  const pitch = () => handle.render.mock.calls.at(-1)![0].pitch as number;
  const TURN = 2 * Math.PI;

  it("turns back to the side view over the flight, holds still there, and spins again after a flight without hold", async () => {
    start();
    flush(200);
    expect(Math.abs(yaw())).toBeGreaterThan(0.1); // W15-C4: the sweep has turned it off the side view (either way)
    const arrived = drive!.flyTo({ kind: "overview" }, { hold: true });
    flush(80);
    await arrived;
    expect(yaw()).toBeCloseTo(0, 9);
    expect(pitch()).toBeCloseTo(0, 9);
    const drawn = handle.render.mock.calls.length;
    flush(60);
    expect(handle.render.mock.calls.length, "no idle spin at a stop").toBe(drawn);
    void drive!.flyTo({ kind: "overview" });
    flush(80);
    expect(yaw()).not.toBe(0);
  });

  it("turns the short way round, to the nearest whole turn", async () => {
    start({ spin: false });
    pointer("pointerdown", 0);
    pointer("pointermove", 420, 190);
    pointer("pointerup", 420, 190);
    flush(400); // the fling settles
    const before = yaw();
    expect(Math.abs(before % TURN)).toBeGreaterThan(0.1);
    const arrived = drive!.flyTo({ kind: "overview" }, { hold: true });
    flush(80);
    await arrived;
    expect(yaw()).toBeCloseTo(Math.round(before / TURN) * TURN, 9);
    expect(Math.abs(yaw() - before)).toBeLessThanOrEqual(Math.PI);
    expect(pitch()).toBeCloseTo(0, 9);
  });

  it("cuts straight to the side view without animate", async () => {
    start();
    flush(200);
    await drive!.flyTo({ kind: "overview" }, { animate: false, hold: true });
    flush();
    expect(yaw()).toBeCloseTo(0, 9);
  });

  it("still turns under a drag at a stop, and stays where it is let go", async () => {
    start();
    await drive!.flyTo({ kind: "overview" }, { animate: false, hold: true });
    flush();
    pointer("pointerdown", 100);
    pointer("pointermove", 200);
    pointer("pointerup", 200);
    flush(400); // the fling settles
    const turned = yaw();
    expect(turned).toBeGreaterThan(0.5);
    flush(60);
    expect(yaw()).toBe(turned);
  });
});

describe("judging a GPU behind a worker (W14-U M1, worker-2's recheck)", () => {
  /** The page runs at 60 fps; the worker draws once per GPU frame and reports that frame's interval with its boxes. */
  function spinWithWorkerFrames(frameMs: number) {
    const onSpinOff = start({ offThread: true });
    const every = Math.max(1, Math.round(frameMs / 16));
    for (let frame = 0; frame < 240; frame++) {
      flush(1, 16);
      // The ack comes at the worker's next frame, often right after the send: its wait says nothing of the frame.
      if (frame % every === every - 1) drive!.takeBoxes([], frameMs);
    }
    return onSpinOff;
  }

  it.each([40, 60])("turns the spin off when the worker draws a frame every %i ms, though the page runs at 60 fps", (ms) => {
    expect(spinWithWorkerFrames(ms)).toHaveBeenCalled();
  });

  it.each([16, 20, 30])("keeps the spin when the worker draws a frame every %i ms", (ms) => {
    expect(spinWithWorkerFrames(ms)).not.toHaveBeenCalled();
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
    expect(yaw()).not.toBe(still);
  });
});

describe("scrubbed by the scroll (W15-B, the one plan stage)", () => {
  const TURN = 2 * Math.PI;
  const pitch = () => handle.render.mock.calls.at(-1)![0].pitch as number;
  const framingNow = () => handle.render.mock.calls.at(-1)![0].framing;
  const close = framingFor({ kind: "disc", disc: "G04" }, "desktop");

  it("draws the camera it is given at once, every scroll frame", () => {
    start({ spin: false });
    drive!.scrub(close, 0);
    flush();
    expect(framingNow()).toEqual(close);
    drive!.scrub(baseFraming("desktop"), 0);
    flush();
    expect(framingNow()).toEqual(baseFraming("desktop"));
  });

  it("turns the model towards its side view as hold rises, continuously, and stops the idle spin", () => {
    start();
    flush(100);
    const spun = yaw();
    const side = Math.round(spun / TURN) * TURN;
    drive!.scrub(close, 0.5);
    flush();
    expect(yaw()).toBeCloseTo(spun + (side - spun) * 0.5, 6);
    drive!.scrub(close, 1);
    flush(30);
    expect(yaw()).toBeCloseTo(side, 6);
    expect(pitch()).toBeCloseTo(0, 6);
    const drawn = handle.render.mock.calls.length;
    flush(30);
    expect(handle.render.mock.calls.length, "no idle spin while held").toBe(drawn);
  });

  it("still turns under a drag while held, and spins again once hold is back to 0", () => {
    start();
    flush(50);
    drive!.scrub(close, 1);
    flush();
    const held = yaw();
    pointer("pointerdown", 100);
    pointer("pointermove", 200);
    pointer("pointerup", 200);
    flush(400);
    expect(Math.abs(yaw() - held)).toBeGreaterThan(0.5);
    drive!.scrub(baseFraming("desktop"), 0);
    flush(3);
    const before = yaw();
    flush(30);
    expect(yaw()).not.toBe(before);
  });

  it("hands back to the idle sweep without a jump when hold scrubs down to 0 (W15-B3 with W15-C4)", () => {
    start();
    flush(100);
    for (const hold of [0.25, 0.5, 1, 0.5, 0.25, 0.1, 0.05, 0]) {
      drive!.scrub(close, hold);
      flush();
    }
    const from = handle.render.mock.calls.length - 1;
    flush(60);
    const yaws = handle.render.mock.calls.slice(from).map((call) => call[0].yaw as number);
    const steps = yaws.slice(1).map((y, i) => Math.abs(y - yaws[i]));
    expect(Math.max(...steps), "the sweep eases on from the drawn yaw").toBeLessThan(0.02);
    expect(yaws.at(-1)).not.toBe(yaws[0]);
  });

  it("adds the stage's turn to the drawn yaw, and keeps it through a scrub (W16-A, W17-S)", () => {
    start({ spin: false });
    flush();
    drive!.setPose({ turn: 0.3 });
    flush();
    expect(yaw()).toBeCloseTo(0.3, 9);
    drive!.scrub(close, 1);
    flush();
    expect(yaw()).toBeCloseTo(0.3, 9);
    expect(Object.keys(handle.render.mock.calls.at(-1)![0])).not.toContain("closeup");
  });

  it("ends a flight in progress", async () => {
    start({ spin: false });
    let landed = false;
    void drive!.flyTo({ kind: "disc", disc: "G05" }).then(() => (landed = true));
    flush(3);
    drive!.scrub(close, 0);
    await Promise.resolve();
    expect(landed).toBe(true);
    flush();
    expect(framingNow()).toEqual(close);
  });
});

describe("the idle sway stays about r17's view, ±25° (W16-A)", () => {
  const DEG = Math.PI / 180;
  const wrapped = (y: number): number => ((((y / DEG + 180) % 360) + 360) % 360) - 180;
  const drawn = (from = 0) => handle.render.mock.calls.slice(from).map((call) => call[0].yaw as number);
  /** A drag of px pixels with no fling: 390 px turns it 180° (orbit.ts). */
  function dragTo(px: number) {
    drive!.setMotion({ spin: true, inertia: false });
    pointer("pointerdown", 0);
    pointer("pointermove", px);
    pointer("pointerup", px);
  }

  it("sways within ±25° for 120 s of idle, and reaches both edges", () => {
    start();
    flush(7500); // 120 s at 16 ms
    const yaws = drawn().map(wrapped);
    expect(yaws.filter((y) => Math.abs(y) > 25 + 1e-6)).toEqual([]);
    expect(Math.min(...yaws)).toBeLessThan(-24);
    expect(Math.max(...yaws)).toBeGreaterThan(24);
  });

  it("after a release at 90° eases back down to +25° the short way, then sways", () => {
    start();
    dragTo(195);
    flush();
    expect(wrapped(drawn().at(-1)!)).toBeCloseTo(90, 0); // the first idle frame after the release has already moved it a hair
    const from = handle.render.mock.calls.length;
    flush(3750); // 60 s
    const yaws = drawn(from).map(wrapped);
    expect(yaws.every((y) => y <= 90 + 1e-9 && y > -90)).toBe(true);
    expect(yaws.some((y) => Math.abs(y - 25) < 0.1)).toBe(true);
    expect(Math.min(...yaws)).toBeLessThan(-24);
  });

  it("a drag still turns it anywhere, the back included", () => {
    start({ spin: false });
    pointer("pointerdown", 0);
    pointer("pointermove", 195);
    flush();
    expect(wrapped(drawn().at(-1)!)).toBeCloseTo(90, 6);
  });

  it("under reduced motion there is no idle yaw at all", () => {
    start({ spin: false });
    flush(600);
    expect(drawn().every((y) => y === 0)).toBe(true);
  });
});

describe("render on demand (W23-C)", () => {
  /** Frames drawn over ms of display frames, stepMs apart. */
  function drawnOver(ms: number, stepMs = 16): number {
    const before = handle.render.mock.calls.length;
    flush(Math.round(ms / stepMs), stepMs);
    return handle.render.mock.calls.length - before;
  }

  it("the idle sway eases to rest and then draws nothing: no frame is even asked for", () => {
    start();
    expect(drawnOver(1_000)).toBeGreaterThan(50);
    flush(Math.round(20_000 / 16));
    expect(queue.size).toBe(0);
    expect(drawnOver(5_000)).toBe(0);
    expect(Math.abs(yaw()) % (2 * Math.PI)).toBeCloseTo(0, 5); // at rest on r17's view
  });

  it("keeps swaying while the visitor scrolls, and sways again after a scroll once rested", () => {
    start();
    flush(Math.round(20_000 / 16));
    expect(drawnOver(1_000)).toBe(0);
    drive!.scrub(baseFraming("desktop"), 0);
    flush(1);
    const from = yaw();
    expect(drawnOver(1_000)).toBeGreaterThan(50);
    expect(Math.abs(yaw() - from)).toBeGreaterThan(0.01);
  });

  it("W23-C3 L1: a hover during the settle leg calls the rest off; the sway carries on", () => {
    start();
    flush(Math.round((SWAY_REST_AFTER_MS + 200) / 16)); // settling now
    pointer("pointermove", 120);
    flush(Math.round(9_000 / 16));
    expect(queue.size, "still swaying 9 s after the hover").toBeGreaterThan(0);
  });

  it("a drag wakes the rested sway too", () => {
    start();
    flush(Math.round(20_000 / 16));
    pointer("pointerdown", 100);
    pointer("pointerup", 100);
    flush(Math.round(2_000 / 16));
    expect(drawnOver(1_000)).toBeGreaterThan(50);
  });

  it("on a phone the sway alone draws at 30 fps, but a scroll draws every display frame", () => {
    start({ size: "phone" });
    const idle = drawnOver(1_000);
    expect(idle).toBeLessThanOrEqual(32);
    const before = handle.render.mock.calls.length;
    for (let i = 0; i < 60; i++) {
      drive!.scrub(baseFraming("phone"), 0);
      flush(1);
    }
    expect(handle.render.mock.calls.length - before).toBeGreaterThanOrEqual(58);
  });
});

describe("a stage faded out (W23-C: the phone band at the plan's end)", () => {
  it("draws nothing while the stage is not shown, and carries on when shown again", () => {
    start();
    flush(2);
    drive!.setShown(false);
    const paused = handle.render.mock.calls.length;
    flush(30);
    expect(handle.render.mock.calls.length).toBe(paused);
    expect(queue.size).toBe(0);
    drive!.scrub(baseFraming("desktop"), 0); // a scroll while hidden asks for no frame either
    flush(2);
    expect(handle.render.mock.calls.length).toBe(paused);
    drive!.setShown(true);
    flush(2);
    expect(handle.render.mock.calls.length).toBeGreaterThan(paused);
  });
});

describe("a phone's fast scroll that misses its frame budget (W23-C)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubGlobal("devicePixelRatio", 3);
  });
  afterEach(() => vi.useRealTimers());

  /** Scrolls n frames with the worker's frames taking frameMs each. */
  function scroll(n: number, frameMs: number) {
    for (let i = 0; i < n; i++) {
      drive!.scrub(baseFraming("phone"), 0);
      flush(1);
      drive!.takeBoxes([], frameMs);
    }
  }
  const dprs = () => handle.resize.mock.calls.map((call) => call[2] as number);

  it("drops to 1 device pixel per CSS pixel while it scrolls, and gives the full ratio back at rest", () => {
    start({ size: "phone", offThread: true });
    scroll(20, 40);
    expect(dprs()).toContain(1);
    expect(dprs().filter((d) => d === 1)).toHaveLength(1); // once, not every frame
    vi.advanceTimersByTime(400);
    expect(dprs().at(-1), "still low 400 ms after the scroll (W23-C3 M2)").toBe(1);
    vi.advanceTimersByTime(SCROLL_REST_MS);
    expect(dprs().at(-1)).toBe(3);
  });

  it("W23-C3 M2: a train of short scrolls with pauses drops once and restores once, at rest", () => {
    start({ size: "phone", offThread: true });
    for (let burst = 0; burst < 6; burst++) {
      scroll(10, 40);
      vi.advanceTimersByTime(400);
    }
    expect(handle.resize).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SCROLL_REST_MS);
    expect(dprs()).toEqual([1, 3]);
  });

  it("W23-C3 L2: never switches the pixel ratio while a theme crossfade runs (a resize would cut it)", () => {
    start({ size: "phone", offThread: true });
    themeFade = {};
    scroll(20, 40);
    expect(dprs()).not.toContain(1);
    themeFade = null;
    scroll(20, 40);
    expect(dprs()).toContain(1);
    themeFade = {};
    vi.advanceTimersByTime(SCROLL_REST_MS + 100);
    expect(dprs().at(-1), "held low till the fade is over").toBe(1);
    themeFade = null;
    vi.advanceTimersByTime(SCROLL_REST_MS + 100);
    expect(dprs().at(-1)).toBe(3);
  });

  it("never drops while the frames keep to the budget", () => {
    start({ size: "phone", offThread: true });
    scroll(40, 12);
    vi.advanceTimersByTime(400);
    expect(dprs()).not.toContain(1);
  });

  it("never drops on desktop, nor for a slow idle sway", () => {
    start({ size: "desktop", offThread: true });
    scroll(20, 40);
    start({ size: "phone", offThread: true });
    for (let i = 0; i < 40; i++) {
      flush(1);
      drive!.takeBoxes([], 40);
    }
    vi.advanceTimersByTime(400);
    expect(dprs()).not.toContain(1);
  });
});
