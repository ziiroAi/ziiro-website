// @vitest-environment jsdom
// (C) W14-J, worker-2's F1: a theme, disc levels or size asked for while the 3D is still being built must reach the
// first frame, and a theme change after that reports when the new look is on screen.
import { afterEach, describe, expect, it, vi } from "vitest";
import { baseFraming } from "./camera";
import { startSpine, type StartOptions } from "./host";
import { discLevels } from "./levels";
import type { FromWorker, ToWorker } from "./protocol";

const scene = {
  render: vi.fn(() => []),
  pick: vi.fn(() => null),
  resize: vi.fn(),
  setTheme: vi.fn(),
  setLevels: vi.fn(),
  dispose: vi.fn(),
};
let build: () => void = () => undefined;
const createSpineScene = vi.fn(() => new Promise((resolve) => (build = () => resolve(scene))));
vi.mock("./scene", () => ({ createSpineScene: () => createSpineScene() }));

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

class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((event: { data: FromWorker }) => void) | null = null;
  onerror: (() => void) | null = null;
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
    worker.reply({ type: "ready", boxes: [] });
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
    FakeWorker.last!.reply({ type: "ready", boxes: [] });
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
