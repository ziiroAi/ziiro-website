// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isSoftwareGl, prefetchMesh, PROBE_TIMEOUT_MS, probeSoftwareGl } from "./first-screen";

const UNMASKED_RENDERER = 0x9246;
function canvasWith(gpu: string | null) {
  const loseContext = vi.fn();
  const gl = gpu === null ? null : {
    RENDERER: 0x1f01,
    getExtension: (name: string) =>
      name === "WEBGL_debug_renderer_info" ? { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER } : name === "WEBGL_lose_context" ? { loseContext } : null,
    getParameter: () => gpu,
  };
  return { canvas: { getContext: vi.fn(() => gl) } as unknown as HTMLCanvasElement, loseContext };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the renderer probe (W14-R)", () => {
  it("calls a SwiftShader context software, and gives the context straight back", () => {
    const { canvas, loseContext } = canvasWith("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)");
    expect(probeSoftwareGl(() => canvas)).toBe(true);
    expect(loseContext).toHaveBeenCalled();
  });

  it("calls a real GPU hardware", () => {
    const { canvas, loseContext } = canvasWith("ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)");
    expect(probeSoftwareGl(() => canvas)).toBe(false);
    expect(loseContext).toHaveBeenCalled();
  });

  it("leaves a browser that can't make a context to the viewer's own failure path", () => {
    expect(probeSoftwareGl(() => canvasWith(null).canvas)).toBe(false);
  });
});

describe("asking off the main thread (W14-X)", () => {
  /** A worker that answers as the probe worker would. */
  const workerAnswering = (software: boolean | null) =>
    class {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: (() => void) | null = null;
      terminate = vi.fn();
      constructor() {
        if (software !== null) queueMicrotask(() => this.onmessage?.({ data: { software } }));
      }
    };

  it("asks a worker, so the first WebGL context (1.4 s cold on SwiftShader at 4× CPU) never blocks a tap", async () => {
    vi.stubGlobal("OffscreenCanvas", class {});
    vi.stubGlobal("Worker", workerAnswering(true));
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
    await expect(isSoftwareGl()).resolves.toBe(true);
    expect(getContext).not.toHaveBeenCalled();
    vi.stubGlobal("Worker", workerAnswering(false));
    await expect(isSoftwareGl()).resolves.toBe(false);
  });

  it("lets the 3D try when the worker never answers, and its own fallbacks take over", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("OffscreenCanvas", class {});
    vi.stubGlobal("Worker", workerAnswering(null));
    const answer = isSoftwareGl();
    vi.advanceTimersByTime(PROBE_TIMEOUT_MS);
    await expect(answer).resolves.toBe(false);
  });

  it("probes on the main thread where a worker can't make a context", async () => {
    vi.stubGlobal("OffscreenCanvas", undefined);
    const { canvas } = canvasWith("llvmpipe (LLVM 15.0.7, 256 bits)");
    await expect(isSoftwareGl(() => canvas)).resolves.toBe(true);
  });
});

describe("fetching the mesh ahead of the 3D (W15-D2)", () => {
  const bytes = new Uint8Array([1, 2, 3]).buffer;

  it("asks for the mesh once and hands its bytes on", async () => {
    const fetch = vi.fn(async (_url: string) => new Response(bytes));
    vi.stubGlobal("fetch", fetch);
    const prefetch = prefetchMesh("/spine/3d/m1/spine-phone.glb");
    expect(prefetch.url).toBe("/spine/3d/m1/spine-phone.glb");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/spine/3d/m1/spine-phone.glb");
    expect(new Uint8Array((await prefetch.bytes)!)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("hands on nothing when the network fails, so the 3D fetches the mesh itself", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    await expect(prefetchMesh("/spine/3d/m1/spine-phone.glb").bytes).resolves.toBeNull();
  });

  it("hands on nothing when the server says no, so the 3D fetches the mesh itself", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gone", { status: 404 })));
    await expect(prefetchMesh("/spine/3d/m1/spine-phone.glb").bytes).resolves.toBeNull();
  });
});

describe("dropping the probe (W15-D2)", () => {
  it("ends the probe worker when its signal aborts, and says hardware so nothing waits on it", async () => {
    const terminate = vi.fn();
    vi.stubGlobal("OffscreenCanvas", class {});
    vi.stubGlobal(
      "Worker",
      class {
        onmessage = null;
        onerror = null;
        terminate = terminate;
      },
    );
    const stop = new AbortController();
    const answer = isSoftwareGl(undefined, stop.signal);
    stop.abort();
    expect(terminate).toHaveBeenCalledTimes(1);
    await expect(answer).resolves.toBe(false);
  });
});
