// @vitest-environment jsdom
// (C) W14-J, worker-2's F1: the worker keeps a theme or disc levels sent while the scene is still being built, puts
// them on the first frame, and says when a later theme change is drawn.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFraming } from "./camera";
import { discLevels } from "./levels";
import type { FromWorker, ToWorker } from "./protocol";

const scene = {
  gpu: "Worker GPU",
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

const posted: FromWorker[] = [];
const scope = self as unknown as { onmessage: ((event: { data: ToWorker }) => void) | null };
const send = (data: ToWorker) => scope.onmessage?.({ data });
const init: ToWorker = {
  type: "init",
  canvas: {} as OffscreenCanvas,
  width: 100,
  height: 100,
  dpr: 1,
  theme: "dark",
  size: "phone",
  meshUrl: "/spine.glb",
  levels: discLevels(),
  view: { yaw: 0, pitch: 0, framing: baseFraming("phone") },
};

beforeEach(async () => {
  vi.clearAllMocks();
  posted.length = 0;
  vi.spyOn(self, "postMessage").mockImplementation((message: unknown) => void posted.push(message as FromWorker));
  vi.resetModules();
  await import("./spine.worker");
});

describe("the spine worker (W14-J F1)", () => {
  it("puts a theme and disc levels sent while the scene is built on its first frame", async () => {
    send(init);
    send({ type: "theme", theme: "light" });
    send({ type: "levels", levels: discLevels(["sales"]) });
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    expect(scene.setTheme).toHaveBeenCalledWith("light");
    expect(scene.setLevels).toHaveBeenCalledWith(discLevels(["sales"]));
    const firstFrame = scene.render.mock.invocationCallOrder[0];
    expect(scene.setTheme.mock.invocationCallOrder[0]).toBeLessThan(firstFrame);
    expect(scene.setLevels.mock.invocationCallOrder[0]).toBeLessThan(firstFrame);
  });

  it("says when a theme change after the first frame is drawn", async () => {
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    send({ type: "theme", theme: "light" });
    expect(scene.setTheme).toHaveBeenCalledWith("light");
    expect(posted.at(-1)).toEqual({ type: "themed", theme: "light" });
  });
});

describe("disposing (W14-K)", () => {
  it("frees the scene and closes itself", async () => {
    const close = vi.spyOn(self, "close").mockImplementation(() => undefined);
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    send({ type: "dispose" });
    expect(scene.dispose).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});

describe("naming the GPU (W14-O)", () => {
  it("reports the renderer's name with its first frame", async () => {
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    expect(posted.find((m) => m.type === "ready")).toEqual({ type: "ready", boxes: [], gpu: "Worker GPU" });
  });
});
