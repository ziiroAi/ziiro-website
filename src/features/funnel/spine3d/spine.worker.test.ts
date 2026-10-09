// @vitest-environment jsdom
// (C) W14-J, worker-2's F1: the worker keeps a theme or disc levels sent while the scene is still being built, puts
// them on the first frame, and says when a later theme change is drawn.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFraming } from "./camera";
import { discLevels } from "./levels";
import type { FromWorker, ToWorker } from "./protocol";

const scene = {
  gpu: "Worker GPU",
  render: vi.fn((_view?: unknown) => []),
  pick: vi.fn(() => null),
  resize: vi.fn(),
  setTheme: vi.fn(),
  step: vi.fn(() => false),
  setLevels: vi.fn(),
  dispose: vi.fn(),
};
let build: () => void = () => undefined;
let failBuild: (error: Error) => void = () => undefined;
const createSpineScene = vi.fn(
  (_options?: Record<string, unknown>) =>
    new Promise((resolve, reject) => {
      build = () => resolve(scene);
      failBuild = reject;
    }),
);
vi.mock("./scene", () => ({ createSpineScene: (options: Record<string, unknown>) => createSpineScene(options) }));
let frames: FrameRequestCallback[] = [];
const drawFrame = () => frames.splice(0).forEach((frame) => frame(0));

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
  meshUrl: "/spine/3d/m1/spine-phone.glb",
  levels: discLevels(),
  view: { yaw: 0, pitch: 0, framing: baseFraming("phone") },
};

beforeEach(async () => {
  vi.clearAllMocks();
  posted.length = 0;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
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

describe("the theme crossfade (W18-B)", () => {
  it("hands the scene the page's fade, then redraws every frame until the fade has run, idle spine or not", async () => {
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    const fade = { start: 1000, ms: 450 };
    scene.step.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false);
    send({ type: "theme", theme: "light", fade });
    expect(scene.setTheme).toHaveBeenCalledWith("light", fade);
    expect(posted.at(-1)).toEqual({ type: "themed", theme: "light" });
    drawFrame();
    drawFrame();
    drawFrame();
    drawFrame();
    expect(scene.step).toHaveBeenCalledTimes(3);
    expect(frames).toHaveLength(0);
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

describe("drawing at the GPU's own pace (W14-U M1)", () => {
  it("keeps only the latest view and draws it once a frame, so a slow GPU never builds a backlog", async () => {
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    scene.render.mockClear();
    posted.length = 0;
    const view = (yaw: number) => ({ type: "view" as const, view: { yaw, pitch: 0, framing: baseFraming("phone") } });
    send(view(0.1));
    send(view(0.2));
    send(view(0.3));
    expect(scene.render).not.toHaveBeenCalled();
    drawFrame();
    expect(scene.render).toHaveBeenCalledTimes(1);
    expect(scene.render.mock.calls[0][0]).toEqual(view(0.3).view);
    expect(posted.filter((m) => m.type === "boxes")).toHaveLength(1);
    drawFrame();
    expect(scene.render).toHaveBeenCalledTimes(1);
  });
});

describe("its own frame interval (W14-U M1, worker-2's recheck)", () => {
  it("sends how long it has been since its last frame with each frame's boxes, so the viewer judges the GPU itself", async () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    posted.length = 0;
    const view = (yaw: number) => ({ type: "view" as const, view: { yaw, pitch: 0, framing: baseFraming("phone") } });
    send(view(0.1));
    now = 1016;
    drawFrame();
    send(view(0.2));
    now = 1056;
    drawFrame();
    const boxes = posted.filter((m) => m.type === "boxes");
    expect(boxes).toHaveLength(2);
    // It kept up: each view was drawn at the worker's next frame, so the frame is the wait for it.
    expect(boxes.map((m) => (m as { frameMs?: number }).frameMs)).toEqual([16, 40]);
  });

  it("sends the time since its last frame when views piled up meanwhile: the GPU is behind the spin", async () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    send(init);
    build();
    await vi.waitFor(() => expect(posted.some((m) => m.type === "ready")).toBe(true));
    const view = (yaw: number) => ({ type: "view" as const, view: { yaw, pitch: 0, framing: baseFraming("phone") } });
    send(view(0.1));
    now = 1016;
    drawFrame();
    posted.length = 0;
    now = 1020;
    send(view(0.2));
    now = 1036;
    send(view(0.3));
    now = 1076;
    drawFrame();
    expect(posted).toEqual([expect.objectContaining({ type: "boxes", frameMs: 60 })]);
  });
});

describe("what init may ask for (W14-V T6)", () => {
  it.each([
    ["another origin", "https://example.com/spine/3d/m1/spine-phone.glb"],
    ["another folder", "/api/funnel/lead"],
    ["a protocol-relative URL", "//example.com/spine/3d/m1/spine-phone.glb"],
  ])("refuses a mesh from %s", async (_name, meshUrl) => {
    send({ ...init, meshUrl } as ToWorker);
    await vi.waitFor(() => expect(posted.some((m) => m.type === "fail")).toBe(true));
    expect(createSpineScene).not.toHaveBeenCalled();
  });

  it("clamps the pixel ratio and the size it is given", () => {
    send({ ...init, width: 1e9, height: -5, dpr: 50 } as ToWorker);
    const asked = createSpineScene.mock.calls.at(-1)![0]!;
    expect(asked.dpr).toBeLessThanOrEqual(3);
    expect(asked.width).toBeLessThanOrEqual(8192);
    expect(asked.height).toBe(0);
    expect(asked.dpr).toBeGreaterThan(0);
  });
});

describe("disposing while the scene builds (W14-U L2)", () => {
  it("stops the mesh download and closes only once the half-built scene has given its context back", async () => {
    const close = vi.spyOn(self, "close").mockImplementation(() => undefined);
    send(init);
    const signal = (createSpineScene.mock.calls.at(-1)![0] as { signal: AbortSignal }).signal;
    send({ type: "dispose" });
    expect(signal.aborted).toBe(true);
    expect(close).not.toHaveBeenCalled();
    failBuild(new Error("aborted"));
    await vi.waitFor(() => expect(close).toHaveBeenCalled());
    expect(posted.some((m) => m.type === "fail")).toBe(false);
  });
});

describe("the mesh S0 already fetched (W15-D2)", () => {
  const given = () => createSpineScene.mock.calls[0][0]!.meshBytes as Promise<ArrayBuffer | null> | undefined;

  it("builds from the bytes the page moves over, without a second download", async () => {
    const buffer = new ArrayBuffer(4);
    send({ ...init, meshFromHost: true });
    expect(createSpineScene).toHaveBeenCalledTimes(1);
    send({ type: "mesh", buffer });
    await expect(given()).resolves.toBe(buffer);
  });

  it("fetches by URL when the page has nothing to hand over", () => {
    send(init);
    expect(given()).toBeUndefined();
  });

  it("lets a build waiting for the bytes end when disposed, so it can close", async () => {
    vi.spyOn(self, "close").mockImplementation(() => undefined);
    send({ ...init, meshFromHost: true });
    send({ type: "dispose" });
    await expect(given()).resolves.toBeNull();
  });
});
