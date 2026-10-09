// @vitest-environment jsdom
// (C) W14-J, worker-2's F1: a theme, disc levels or size asked for while the 3D is still being built must reach the
// first frame, and a theme change after that reports when the new look is on screen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { baseFraming } from "./camera";
import { startSpine, type StartOptions } from "./host";
import { discLevels } from "./levels";
import type { FromWorker, ToWorker } from "./protocol";

const scene = {
  gpu: "Inline GPU",
  render: vi.fn(() => []),
  pick: vi.fn(() => null),
  resize: vi.fn(),
  setTheme: vi.fn(),
  setLevels: vi.fn(),
  dispose: vi.fn(),
};
let build: () => void = () => undefined;
let failBuild: (error: Error) => void = () => undefined;
const createSpineScene = vi.fn(
  (_options?: { signal?: AbortSignal }) =>
    new Promise((resolve, reject) => {
      build = () => resolve(scene);
      failBuild = reject;
    }),
);
vi.mock("./scene", () => ({ createSpineScene: (options: { signal?: AbortSignal }) => createSpineScene(options) }));

const options = (): StartOptions => ({
  width: 100,
  height: 100,
  dpr: 1,
  theme: "dark",
  size: "phone",
  meshUrl: "/spine.glb",
  levels: discLevels(),
  view: { yaw: 0, pitch: 0, framing: baseFraming("phone") },
  onReady: vi.fn(),
  onBoxes: vi.fn(),
  onFail: vi.fn(),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the spine on the main thread (no OffscreenCanvas)", () => {
  it("applies a theme, disc levels and a size asked for while it is built, before its first frame", async () => {
    const start = options();
    const handle = startSpine(document.createElement("canvas"), start);
    void handle.setTheme("light");
    handle.setLevels(discLevels(["sales"]));
    handle.resize(200, 120, 2);
    await vi.waitFor(() => expect(createSpineScene).toHaveBeenCalled());
    build();
    await vi.waitFor(() => expect(start.onReady).toHaveBeenCalled());
    expect(scene.setTheme).toHaveBeenCalledWith("light");
    expect(scene.setLevels).toHaveBeenCalledWith(discLevels(["sales"]));
    expect(scene.resize).toHaveBeenCalledWith(200, 120, 2);
    const firstFrame = scene.render.mock.invocationCallOrder[0];
    expect(scene.setTheme.mock.invocationCallOrder[0]).toBeLessThan(firstFrame);
    expect(scene.setLevels.mock.invocationCallOrder[0]).toBeLessThan(firstFrame);
  });

  it("settles a theme change once the new look is drawn", async () => {
    const start = options();
    const handle = startSpine(document.createElement("canvas"), start);
    await vi.waitFor(() => expect(createSpineScene).toHaveBeenCalled());
    build();
    await vi.waitFor(() => expect(start.onReady).toHaveBeenCalled());
    await handle.setTheme("light");
    expect(scene.setTheme).toHaveBeenCalledWith("light");
  });
});

describe("naming the GPU (W14-O)", () => {
  it("hands the renderer's name to onReady on the main thread", async () => {
    const start = options();
    startSpine(document.createElement("canvas"), start);
    await vi.waitFor(() => expect(createSpineScene).toHaveBeenCalled());
    build();
    await vi.waitFor(() => expect(start.onReady).toHaveBeenCalledWith([], "Inline GPU"));
  });

  it("hands the name the worker reports to onReady", () => {
    const start = options();
    startSpine(offscreenCanvas(), start);
    FakeWorker.last!.reply({ type: "ready", boxes: [], gpu: "Worker GPU" });
    expect(start.onReady).toHaveBeenCalledWith([], "Worker GPU");
  });
});

class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((event: { data: FromWorker }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  sent: ToWorker[] = [];
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(message: ToWorker) {
    this.sent.push(message);
  }
  terminate() {}
  reply(data: FromWorker) {
    this.onmessage?.({ data });
  }
}

function offscreenCanvas(): HTMLCanvasElement {
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("OffscreenCanvas", class {});
  return Object.assign(document.createElement("canvas"), { transferControlToOffscreen: () => ({}) });
}

describe("the spine in a worker", () => {
  it("settles a theme change only when the worker reports the new look drawn", async () => {
    const handle = startSpine(offscreenCanvas(), options());
    const worker = FakeWorker.last!;
    worker.reply({ type: "ready", boxes: [], gpu: "Worker GPU" });
    let settled = false;
    const change = handle.setTheme("light").then(() => (settled = true));
    expect(worker.sent.at(-1)).toEqual({ type: "theme", theme: "light" });
    await Promise.resolve();
    expect(settled).toBe(false);
    worker.reply({ type: "themed", theme: "light" });
    await change;
    expect(settled).toBe(true);
  });

  it("settles a theme change made while loading with the first frame, which already wears it", async () => {
    const handle = startSpine(offscreenCanvas(), options());
    const change = handle.setTheme("light");
    FakeWorker.last!.reply({ type: "ready", boxes: [], gpu: "Worker GPU" });
    await expect(change).resolves.toBeUndefined();
  });
});

describe("ending the worker (W14-K)", () => {
  it("lets the worker give its context back before ending it", () => {
    vi.useFakeTimers();
    try {
      const handle = startSpine(offscreenCanvas(), options());
      const worker = FakeWorker.last!;
      const terminate = vi.spyOn(worker, "terminate");
      worker.reply({ type: "ready", boxes: [], gpu: "Worker GPU" });
      handle.dispose();
      expect(worker.sent.at(-1)).toEqual({ type: "dispose" });
      expect(terminate).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(terminate).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("leaving before the first frame (W14-X)", () => {
  it("ends a worker that hasn't drawn yet at once, so its script, its mesh download and its context all stop", () => {
    vi.useFakeTimers();
    try {
      const handle = startSpine(offscreenCanvas(), options());
      const terminate = vi.spyOn(FakeWorker.last!, "terminate");
      handle.dispose();
      expect(terminate).toHaveBeenCalledTimes(1);
      vi.runAllTimers();
      expect(terminate).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the worker's frame interval (W14-U M1)", () => {
  it("hands the worker's own frame interval on with the boxes", () => {
    const start = options();
    startSpine(offscreenCanvas(), start);
    FakeWorker.last!.reply({ type: "boxes", boxes: [], frameMs: 42 });
    expect(start.onBoxes).toHaveBeenCalledWith([], 42);
  });
});

describe("after dispose (W14-V T2)", () => {
  it("a ready or fail the worker sent before dispose reaches no one", () => {
    const start = options();
    const handle = startSpine(offscreenCanvas(), start);
    const worker = FakeWorker.last!;
    handle.dispose();
    worker.reply({ type: "ready", boxes: [], gpu: "Worker GPU" });
    worker.reply({ type: "fail", reason: "context-lost" });
    worker.onerror?.();
    expect(start.onReady).not.toHaveBeenCalled();
    expect(start.onFail).not.toHaveBeenCalled();
  });
});

describe("messages it can't read (W14-V T6)", () => {
  it.each([
    ["null", null],
    ["no type", {}],
    ["an unknown type", { type: "nonsense" }],
    ["a ready without boxes", { type: "ready", gpu: "x" }],
  ])("falls back on %s", (_name, data) => {
    const start = options();
    startSpine(offscreenCanvas(), start);
    FakeWorker.last!.reply(data as unknown as FromWorker);
    expect(start.onFail).toHaveBeenCalledWith("error");
    expect(start.onReady).not.toHaveBeenCalled();
  });

  it("falls back when a message can't be cloned (messageerror)", () => {
    const start = options();
    startSpine(offscreenCanvas(), start);
    FakeWorker.last!.onmessageerror?.();
    expect(start.onFail).toHaveBeenCalledWith("error");
  });
});

describe("leaving while it builds, on the main thread (W14-U L2)", () => {
  it("stops the mesh download, and the half-built scene gives its context back", async () => {
    const start = options();
    const handle = startSpine(document.createElement("canvas"), start);
    await vi.waitFor(() => expect(createSpineScene).toHaveBeenCalled());
    const signal = createSpineScene.mock.calls.at(-1)![0]!.signal!;
    expect(signal.aborted).toBe(false);
    handle.dispose();
    expect(signal.aborted).toBe(true);
    failBuild(new Error("aborted"));
    await Promise.resolve();
    expect(start.onFail).not.toHaveBeenCalled();
  });
});
