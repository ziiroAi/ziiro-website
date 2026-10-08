// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { afterLcpThenIdle, NO_LCP_MS, onOptionPress, probeSoftwareGl, WAIT_AFTER_LCP_MS } from "./first-screen";

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

describe("leaving S0: pressing one of S1's options (W14-R, W14-U L1)", () => {
  function option() {
    const s1 = document.createElement("div");
    s1.className = "f-s1";
    s1.innerHTML = '<div class="f-options"></div>';
    const button = document.createElement("button");
    s1.firstElementChild!.append(button);
    document.body.append(s1);
    return button;
  }
  const key = (target: EventTarget, name: string) => target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  const press = (target: EventTarget) => target.dispatchEvent(new Event("pointerdown", { bubbles: true }));

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("fires once, on a press of an option or Enter or Space on one, and not after it is stopped", () => {
    const button = option();
    const run = vi.fn();
    const stop = onOptionPress(run);
    press(button);
    key(button, "Enter");
    expect(run).toHaveBeenCalledTimes(1);
    stop();
    const later = vi.fn();
    onOptionPress(later)();
    press(button);
    expect(later).not.toHaveBeenCalled();
    const spaced = vi.fn();
    onOptionPress(spaced);
    key(button, " ");
    expect(spaced).toHaveBeenCalledTimes(1);
  });

  it("ignores a Tab, a screen-reader key, a press outside the options and a key on the page", () => {
    const button = option();
    const run = vi.fn();
    onOptionPress(run);
    key(button, "Tab");
    key(button, "ArrowDown");
    key(document.body, "Enter");
    press(document.body);
    expect(run).not.toHaveBeenCalled();
  });
});
