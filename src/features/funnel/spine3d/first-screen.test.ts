// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { afterLcpThenIdle, isSoftwareGl, NO_LCP_MS, PROBE_TIMEOUT_MS, probeSoftwareGl, WAIT_AFTER_LCP_MS } from "./first-screen";

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

class FakeLcpObserver {
  static supportedEntryTypes = ["largest-contentful-paint"];
  static all: FakeLcpObserver[] = [];
  constructor(private readonly callback: PerformanceObserverCallback) {
    FakeLcpObserver.all.push(this);
  }
  observe = vi.fn();
  disconnect = vi.fn();
  emit() {
    this.callback({ getEntries: () => [{}] } as unknown as PerformanceObserverEntryList, this as unknown as PerformanceObserver);
  }
}

/** Idle time at once: fake timers delay a 0 ms timer set during a tick by 1 ms, which would blur the 1 s boundary. */
const idleNow = (go: () => void) => {
  go();
  return 1;
};

afterEach(() => {
  vi.restoreAllMocks();
  FakeLcpObserver.all = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the S0 renderer probe (W14-R)", () => {
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

describe("starting a second past the LCP, in idle time (W14-R)", () => {
  it("runs 1 s after the LCP, in idle time, and not before", () => {
    vi.useFakeTimers();
    vi.stubGlobal("PerformanceObserver", FakeLcpObserver);
    vi.stubGlobal("requestIdleCallback", idleNow);
    const run = vi.fn();
    afterLcpThenIdle(run);
    vi.advanceTimersByTime(NO_LCP_MS - 1);
    expect(run).not.toHaveBeenCalled();
    FakeLcpObserver.all[0].emit();
    vi.advanceTimersByTime(WAIT_AFTER_LCP_MS - 1);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("never runs once cancelled", () => {
    vi.useFakeTimers();
    vi.stubGlobal("PerformanceObserver", FakeLcpObserver);
    vi.stubGlobal("requestIdleCallback", idleNow);
    const run = vi.fn();
    const cancel = afterLcpThenIdle(run);
    FakeLcpObserver.all[0].emit();
    cancel();
    vi.advanceTimersByTime(5_000);
    expect(run).not.toHaveBeenCalled();
    expect(FakeLcpObserver.all[0].disconnect).toHaveBeenCalled();
  });

  it("counts from the first paint when no LCP comes, as in a tab opened in the background (W14-U L5)", () => {
    vi.useFakeTimers();
    vi.stubGlobal("PerformanceObserver", FakeLcpObserver);
    vi.stubGlobal("requestAnimationFrame", (go: FrameRequestCallback) => setTimeout(() => go(0), 16));
    vi.stubGlobal("requestIdleCallback", idleNow);
    const run = vi.fn();
    afterLcpThenIdle(run);
    vi.advanceTimersByTime(NO_LCP_MS + 32 + WAIT_AFTER_LCP_MS - 1);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(FakeLcpObserver.all[0].disconnect).toHaveBeenCalled();
    FakeLcpObserver.all[0].emit();
    vi.advanceTimersByTime(5_000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("counts from the first paint where the browser reports no LCP", () => {
    vi.useFakeTimers();
    vi.stubGlobal("PerformanceObserver", undefined);
    vi.stubGlobal("requestAnimationFrame", (go: FrameRequestCallback) => setTimeout(() => go(0), 16));
    vi.stubGlobal("requestIdleCallback", idleNow);
    const run = vi.fn();
    afterLcpThenIdle(run);
    vi.advanceTimersByTime(32 + WAIT_AFTER_LCP_MS - 1);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
