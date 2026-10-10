// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscId } from "../data/contract";
import { render, type Rendered } from "../plan/test-utils";
import type { DiscPickEvent, SpineViewerApi } from "./api";
import { baseFraming, framingFor } from "./camera";
import type { StartOptions } from "./host";
import { discLevels } from "./levels";
import type { DiscBox } from "./scene";
import { forgetSoftwareGl } from "./first-screen";
import { forgetWarmMeshes, warmMesh } from "./mesh-warm";
import { CROSSFADE_MS, CUE_DELAY_MS, LOAD_TIMEOUT_MS, MESH_URLS, RINGS_IN_MS, SpineViewer } from "./SpineViewer";
import { MAX_RETRIES, RETRY_DELAYS_MS } from "./rules";
import { chooseTheme, resetThemeChoice } from "../flow/theme";
import { THEME_FADE_MS } from "../flow/themeFade";

let picked: DiscId | null = null;
const handle = {
  render: vi.fn(),
  pick: vi.fn(async () => picked),
  resize: vi.fn(),
  setTheme: vi.fn(async (_theme: string) => undefined),
  setLevels: vi.fn(),
  setGlow: vi.fn(),
  dispose: vi.fn(),
};
const startSpine = vi.fn((_canvas: HTMLCanvasElement, _options: StartOptions, _mode?: "auto" | "inline") => handle);
vi.mock("./host", () => ({
  startSpine: (canvas: HTMLCanvasElement, options: StartOptions, mode?: "auto" | "inline") => startSpine(canvas, options, mode),
}));

let screen: Rendered | null = null;
let saveData = false;
let effectiveType: string | undefined;
let frames: FrameRequestCallback[] = [];
/** Each queued frame's id, beside it in `frames`: cancelAnimationFrame really cancels (W14-V T9). */
let frameIds: number[] = [];
let nextFrameId = 1;
let now = 0;
let api: SpineViewerApi | null = null;
const onPhase = vi.fn();

/** Runs the queued animation frames, n times over, stepMs apart (16 ms: a 60 Hz display). */
function flush(n = 1, stepMs = 16) {
  for (let i = 0; i < n; i++) {
    now += stepMs;
    frameIds = [];
    frames.splice(0).forEach((frame) => frame(now));
  }
}

beforeEach(() => {
  forgetWarmMeshes();
  saveData = false;
  effectiveType = undefined;
  picked = null;
  frames = [];
  frameIds = [];
  api = null;
  document.documentElement.dataset.theme = "light";
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    frames.push(frame);
    frameIds.push(nextFrameId);
    return nextFrameId++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    const at = frameIds.indexOf(id);
    if (at < 0) return;
    frames.splice(at, 1);
    frameIds.splice(at, 1);
  });
  vi.stubGlobal("WebGL2RenderingContext", class {});
  // jsdom's page never has focus; a browser tab the reader is looking at does.
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.stubGlobal("requestIdleCallback", (run: () => void) => {
    run();
    return 1;
  });
  Object.defineProperty(navigator, "connection", { configurable: true, get: () => ({ saveData, effectiveType }) });
});

afterEach(() => {
  screen?.unmount();
  screen = null;
  forgetSoftwareGl();  // the page's one probe answer (W16-R L2) must not carry over to the next test's renderer
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
  delete document.documentElement.dataset.theme;
});

const viewer = () => screen!.container.querySelector<HTMLElement>("[data-testid=spine-viewer]")!;
const still = () => screen!.container.querySelector<HTMLElement>("[data-testid=spine-still]")!;
const canvas = () => screen!.container.querySelector<HTMLCanvasElement>("[data-testid=spine-canvas]");
const lastOptions = () => startSpine.mock.calls.at(-1)![1];
const lastView = () => handle.render.mock.calls.at(-1)![0];

const box = (disc: DiscId, size: number): DiscBox =>
  ({ disc, left: 0, top: 0, width: size, height: size, anchor: { x: size, y: size / 2 }, onScreen: true });

const ui = (lit?: Parameters<typeof SpineViewer>[0]["lit"]) => (
  <SpineViewer label="The spine" lit={lit} onApi={(next) => (api = next)} onPhase={onPhase}>
    <img alt="The spine" src="/still.webp" />
  </SpineViewer>
);

async function mount(lit?: Parameters<typeof SpineViewer>[0]["lit"]) {
  await act(async () => {
    screen = render(ui(lit));
  });
  await act(async () => {
    flush(2); // the first paint is on screen, then idle time starts the 3D
    await new Promise((resolve) => setTimeout(resolve, 0)); // the dynamic import of ./host settles
  });
}

/** mount() for fake timers: the dynamic import of ./host settles on the fake clock (vi.waitFor would run it on). */
async function mountWith(node = ui()) {
  await act(async () => {
    screen = render(node);
  });
  act(() => flush(2));
  for (let i = 0; i < 5 && !startSpine.mock.calls.length; i++) await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
}

/** Runs the fake clock on by `ms`, then lets a restarted begin()'s dynamic import of ./host settle. */
async function advance(ms: number) {
  await act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
  for (let i = 0; i < 5; i++) await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
}

/** A real GPU, unless a test says otherwise. */
const HARDWARE_GPU = "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)";
const ready = (boxes: DiscBox[] = [], gpu = HARDWARE_GPU) => act(() => lastOptions().onReady(boxes, gpu));

function pointer(type: string, x: number, pointerType = "mouse") {
  const event = Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 10 }), { pointerId: 1, pointerType });
  act(() => {
    viewer().dispatchEvent(event);
  });
}

describe("SpineViewer (W14-C)", () => {
  it("paints the still first, and starts the 3D only after the first paint, with this plan's disc levels", async () => {
    await act(async () => {
      screen = render(ui(["sales", "deals"]));
    });
    expect(still().querySelector("img")).not.toBeNull();
    expect(startSpine).not.toHaveBeenCalled();
    await act(async () => {
      flush(2);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(startSpine).toHaveBeenCalledTimes(1);
    const options = lastOptions();
    expect(options.levels).toEqual(discLevels(["sales", "deals"]));
    expect(options.theme).toBe("light");
    expect([MESH_URLS.phone, MESH_URLS.desktop]).toContain(options.meshUrl);
    expect(viewer().dataset.spine).toBe("loading");
    expect(canvas()?.getAttribute("aria-hidden")).toBe("true");
    expect(still().className).not.toContain("invisible");
  });

  it("swaps the still out only once the first frame has faded in over it, and hands over the API (W18-C)", async () => {
    await mount();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    expect(api).toBeNull();
    ready();
    expect(viewer().dataset.spine).toBe("live");
    expect(canvas()?.style.opacity).toBe("1");
    expect(canvas()?.style.transition).toBe(`opacity ${CROSSFADE_MS}ms ease-in-out`);
    // Never a hard cut: the still stays under the canvas for the whole crossfade, so the page never shows between them.
    expect(still().className).not.toContain("invisible");
    act(() => void vi.advanceTimersByTime(CROSSFADE_MS - 1));
    expect(still().className).not.toContain("invisible");
    act(() => void vi.advanceTimersByTime(1));
    expect(still().className).toContain("invisible");
    expect(canvas()?.getAttribute("role")).toBe("img");
    expect(canvas()?.getAttribute("aria-label")).toBe("The spine");
    expect(canvas()?.hasAttribute("aria-hidden")).toBe(false);
    expect(api).not.toBeNull();
  });

  it.each(["no-webgl2", "context-lost", "mesh-failed", "error"] as const)(
    "gives the still back, drops the canvas and withdraws the API on %s (for good on no-webgl2, else while it tries again)",
    async (reason) => {
      await mount();
      ready();
      act(() => lastOptions().onFail(reason));
      expect(viewer().dataset.spine).toBe(reason === "no-webgl2" ? "fallback" : "loading");
      expect(viewer().dataset.spineReason).toBe(reason);
      expect(still().className).not.toContain("invisible");
      expect(canvas()).toBeNull();
      expect(handle.dispose).toHaveBeenCalled();
      expect(api).toBeNull();
    },
  );

  it("never loads the 3D in a browser without WebGL2", async () => {
    vi.stubGlobal("WebGL2RenderingContext", undefined);
    Reflect.deleteProperty(window, "WebGL2RenderingContext");
    await mount();
    expect(startSpine).not.toHaveBeenCalled();
    expect(viewer().dataset.spine).toBe("fallback");
    expect(viewer().dataset.spineReason).toBe("no-webgl2");
  });

  it("reports live once, and the fallback with its reason once its retries are spent, for the plan_view record (§9)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await mountWith();
    ready();
    for (let i = 0; i <= MAX_RETRIES; i++) {
      act(() => lastOptions().onFail("mesh-failed"));
      await advance(RETRY_DELAYS_MS.at(-1)! + 1);
    }
    expect(onPhase.mock.calls).toEqual([["live", null], ["fallback", "mesh-failed"]]);
  });

  // W22-LOAD: a teammate's phone kept the still for good. A 3G reading (Chrome's effectiveType, from a busy network)
  // or Save-Data kept it before any 3D loaded; now the 3D loads in the background and fades in when it is ready.
  it("loads the 3D on a 3G connection, in the background behind the still (W22-LOAD)", async () => {
    Object.defineProperty(navigator, "connection", { configurable: true, get: () => ({ saveData: false, effectiveType: "3g" }) });
    await mount();
    expect(startSpine).toHaveBeenCalledTimes(1);
    expect(viewer().dataset.spine).toBe("loading");
    ready();
    expect(viewer().dataset.spine).toBe("live");
  });

  it("loads the 3D under Save-Data too (W22-LOAD)", async () => {
    saveData = true;
    await mount();
    expect(startSpine).toHaveBeenCalledTimes(1);
    expect(viewer().dataset.spine).toBe("loading");
  });

  it("follows the page theme and the plan's discs", async () => {
    await mount(["sales"]);
    ready();
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(handle.setTheme).toHaveBeenLastCalledWith("dark");
    screen!.rerender(ui(["marketing"]));
    expect(handle.setLevels).toHaveBeenLastCalledWith(discLevels(["marketing"]));
  });

  it("shows the still while a theme change draws, and the canvas again once the new look is on it (W14-J F1)", async () => {
    let drawn: () => void = () => undefined;
    handle.setTheme.mockImplementationOnce(() => new Promise<undefined>((resolve) => (drawn = () => resolve(undefined))));
    await mount();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    ready();
    act(() => void vi.advanceTimersByTime(CROSSFADE_MS));
    vi.useRealTimers();
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(handle.setTheme).toHaveBeenLastCalledWith("dark");
    expect(viewer().dataset.spine).toBe("live");
    expect(still().className).not.toContain("invisible");
    expect(canvas()?.style.opacity).toBe("0");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await act(async () => drawn());
    expect(canvas()?.style.opacity).toBe("1");
    // W18-C: the still (already in the new theme) goes only once the canvas has faded back in over it.
    expect(still().className).not.toContain("invisible");
    act(() => void vi.advanceTimersByTime(CROSSFADE_MS));
    expect(still().className).toContain("invisible");
  });

  it("starts at r17's framing with the discs lit, without startFraming or ringsIn", async () => {
    await mount();
    expect(lastOptions().glow).toBe(1);
    expect([baseFraming("phone"), baseFraming("desktop")]).toContainEqual(lastOptions().view.framing);
  });

  it("with ringsIn starts at startFraming with the discs unlit, and lights them only after the crossfade (W18-C)", async () => {
    const start = framingFor({ kind: "disc", disc: "G04" }, "desktop");
    await act(async () => {
      screen = render(
        <SpineViewer label="The spine" lit={["sales"]} startFraming={() => start} ringsIn onApi={(next) => (api = next)}>
          <img alt="The spine" src="/still.webp" />
        </SpineViewer>,
      );
    });
    await act(async () => {
      flush(2);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(lastOptions().view.framing).toEqual(start);
    expect(lastOptions().glow).toBe(0);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    ready();
    act(() => flush(3));
    expect(handle.setGlow).not.toHaveBeenCalled();
    // The idle sway, if any, starts from the still's framing: the first frames are drawn there.
    expect(lastView().framing).toEqual(start);
    act(() => void vi.advanceTimersByTime(CROSSFADE_MS));
    act(() => flush(Math.ceil(RINGS_IN_MS / 16) + 2));
    const glows = handle.setGlow.mock.calls.map(([g]) => g as number);
    expect(glows.length).toBeGreaterThan(10);
    expect(glows.every((g, i) => i === 0 || g >= glows[i - 1])).toBe(true);
    expect(glows.at(-1)).toBe(1);
  });

  it("with the page's crossfade under way, hands its clock to the 3D and keeps the canvas on screen (W18-B)", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
    document.documentElement.setAttribute("data-funnel", "plan");
    try {
      await mount();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      ready();
      act(() => void vi.advanceTimersByTime(CROSSFADE_MS));  // W18-C: the first handover is done; the still is gone
      vi.useRealTimers();
      await act(async () => {
        chooseTheme("dark");
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      // Handed over in the frame the page's colours start in, once chooseTheme has re-timed the fade to it.
      expect(handle.setTheme).not.toHaveBeenCalledWith("dark", expect.anything());
      act(() => flush());
      expect(handle.setTheme).toHaveBeenLastCalledWith("dark", expect.objectContaining({ ms: THEME_FADE_MS }));
      expect(still().className).toContain("invisible");
      expect(canvas()?.style.opacity).not.toBe("0");
    } finally {
      resetThemeChoice();
      document.documentElement.removeAttribute("data-funnel");
      document.documentElement.removeAttribute("data-theme-fade");
    }
  });

  it("lets a vertical swipe scroll the page on a phone", async () => {
    await mount();
    ready();
    expect(viewer().style.touchAction).toBe("pan-y");
  });

  it("spins on its own and turns further when dragged", async () => {
    await mount();
    ready();
    flush(3);
    const spun = lastView().yaw;
    expect(spun).not.toBe(0); // W15-C4: the idle sweep starts down towards the front, not always up
    pointer("pointerdown", 100);
    pointer("pointermove", 160);
    flush();
    expect(lastView().yaw).toBeGreaterThan(spun + 0.3);
  });

  it("disposes the 3D when the plan closes", async () => {
    await mount();
    screen!.unmount();
    screen = null;
    expect(handle.dispose).toHaveBeenCalled();
  });
});

describe("the viewer API (W14-F builds on it)", () => {
  it("cuts to a disc without animate, and flies there over several frames with it", async () => {
    await mount();
    ready();
    const close = framingFor({ kind: "disc", disc: "G04" }, lastOptions().size);
    await act(async () => {
      await api!.flyTo({ kind: "disc", disc: "G04" }, { animate: false });
      flush();
    });
    expect(lastView().framing).toEqual(close);

    let arrived = false;
    act(() => void api!.flyTo({ kind: "overview" }).then(() => (arrived = true)));
    flush(3);
    expect(lastView().framing).not.toEqual(close);
    expect(lastView().framing).not.toEqual(baseFraming(lastOptions().size));
    await act(async () => {
      flush(80);
      await Promise.resolve();
    });
    expect(arrived).toBe(true);
    expect(lastView().framing).toEqual(baseFraming(lastOptions().size));
  });

  it("lights discs on demand", async () => {
    await mount();
    ready();
    act(() => api!.setLit(["customer"]));
    expect(handle.setLevels).toHaveBeenLastCalledWith(discLevels(["customer"]));
    act(() => api!.setLit(null));
    expect(handle.setLevels).toHaveBeenLastCalledWith(discLevels());
  });

  it("reports every frame's disc boxes", async () => {
    await mount();
    const seen: (readonly DiscBox[])[] = [];
    ready([box("G01", 10)]);
    act(() => void api!.onDiscBoxes((boxes) => seen.push(boxes)));
    act(() => lastOptions().onBoxes([box("G02", 20)]));
    expect(seen).toEqual([[box("G02", 20)]]);
    expect(api!.boxes()).toEqual([box("G02", 20)]);
  });

  /** The viewer's box on screen: jsdom lays nothing out. */
  const sized = () => {
    viewer().getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  };
  const boxAt = (disc: DiscId, left: number, size: number): DiscBox => ({ ...box(disc, size), left, anchor: { x: left + size, y: size / 2 } });
  const tapAt = async (x: number, pointerType: string) => {
    pointer("pointerdown", x, pointerType);
    pointer("pointerup", x, pointerType);
    await act(async () => {
      await Promise.resolve();
    });
  };

  it("picks a disc on a tap by its box on screen; on desktop a small disc takes taps anywhere in its 44 × 44 padding (W14-V T3)", async () => {
    await mount();
    sized();
    const events: DiscPickEvent[] = [];
    ready([boxAt("G05", 0, 60), boxAt("G03", 100, 20)]);
    act(() => void api!.onDiscPick((event) => events.push(event)));
    await tapAt(50, "touch");
    await tapAt(125, "touch");
    await tapAt(125, "mouse");
    expect(events.map((e) => [e.disc, e.via])).toEqual([["G05", "tap"], ["G03", "tap"], ["G03", "tap"]]);
    expect(events[1].box).toEqual(boxAt("G03", 100, 20));
  });

  it("on a phone, takes a touch only on a disc 44 × 44 px or more on screen (§11.3)", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
    await mount();
    sized();
    const events: DiscPickEvent[] = [];
    ready([boxAt("G05", 0, 60), boxAt("G03", 100, 20)]);
    act(() => void api!.onDiscPick((event) => events.push(event)));
    await tapAt(110, "touch");
    await tapAt(30, "touch");
    expect(events.map((e) => e.disc)).toEqual(["G05"]);
  });

  it("does not count a drag as a tap", async () => {
    await mount();
    const events: DiscPickEvent[] = [];
    ready([box("G05", 60)]);
    act(() => void api!.onDiscPick((event) => events.push(event)));
    picked = "G05";
    pointer("pointerdown", 50, "touch");
    pointer("pointermove", 120, "touch");
    pointer("pointerup", 120, "touch");
    await act(async () => {
      await Promise.resolve();
    });
    expect(events).toEqual([]);
  });

  it("reports a mouse hover moving onto a disc and off it", async () => {
    await mount();
    sized();
    const events: DiscPickEvent[] = [];
    ready([box("G06", 60)]);
    act(() => void api!.onDiscPick((event) => events.push(event)));
    pointer("pointermove", 40);
    await act(async () => {
      await Promise.resolve();
    });
    pointer("pointerleave", 400);
    expect(events.map((e) => [e.disc, e.via])).toEqual([["G06", "hover"], [null, "hover"]]);
  });
});

describe("giving the GPU back (W14-K)", () => {
  /** The viewer's own nearness watcher has a rootMargin; the drive's pause watcher has none. */
  let watchers: { callback: IntersectionObserverCallback; margin?: string; el: Element | null }[] = [];

  beforeEach(() => {
    watchers = [];
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private entry: (typeof watchers)[number];
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          this.entry = { callback, margin: options?.rootMargin, el: null };
          watchers.push(this.entry);
        }
        observe(el: Element) {
          this.entry.el = el;
        }
        unobserve() {}
        disconnect() {
          watchers = watchers.filter((w) => w !== this.entry);
        }
      },
    );
    let n = 0;
    startSpine.mockImplementation(() => ({ ...handle, dispose: vi.fn(), id: n++ }) as typeof handle);
  });

  const viewers = () => [...screen!.container.querySelectorAll<HTMLElement>("[data-testid=spine-viewer]")];
  const nearScreen = (el: HTMLElement, near: boolean) =>
    act(() =>
      watchers
        .filter((w) => w.margin && w.el === el)
        .forEach((w) => w.callback([{ isIntersecting: near, target: el } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)),
    );
  const two = (withTour: boolean) => (
    <>
      {ui()}
      {withTour && (
        <SpineViewer label="The tour">
          <img alt="The tour" src="/still.webp" />
        </SpineViewer>
      )}
    </>
  );

  /** The tour mounts after the hero, as on the plan (and two dynamic imports of a mocked module at once race vitest). */
  async function mountTwo() {
    await act(async () => {
      screen = render(two(false));
    });
    await act(async () => flush(2));
    await vi.waitFor(() => expect(startSpine).toHaveBeenCalledTimes(1));
    await act(async () => screen!.rerender(two(true)));
    await act(async () => flush(2));
    await vi.waitFor(() => expect(startSpine).toHaveBeenCalledTimes(2));
  }

  it("gives back an off-screen viewer's 3D once another is live, shows its still, and starts again as it nears", async () => {
    await mountTwo();
    const [hero, tour] = viewers();
    const [heroStart, tourStart] = startSpine.mock.calls.map((call, i) => ({ options: call[1], handle: startSpine.mock.results[i].value }));
    act(() => heroStart.options.onReady([], HARDWARE_GPU));
    act(() => tourStart.options.onReady([], HARDWARE_GPU));
    nearScreen(hero, false);
    expect(heroStart.handle.dispose).toHaveBeenCalled();
    expect(hero.dataset.spine).toBe("asleep");
    expect(hero.querySelector("[data-testid=spine-still]")!.className).not.toContain("invisible");
    expect(hero.querySelector("[data-testid=spine-canvas]")).toBeNull();
    expect(tour.dataset.spine).toBe("live");
    expect(tourStart.handle.dispose).not.toHaveBeenCalled();

    await act(async () => {
      nearScreen(hero, true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(startSpine).toHaveBeenCalledTimes(3);
    expect(hero.dataset.spine).toBe("loading");
    act(() => startSpine.mock.calls[2][1].onReady([], HARDWARE_GPU));
    expect(hero.dataset.spine).toBe("live");
    expect(onPhase.mock.calls).toEqual([["live", null]]);
  });

  it("ignores a late ready or fail from the 3D it gave back, once it has started again (W14-V T2)", async () => {
    await mountTwo();
    const [hero] = viewers();
    const [heroStart, tourStart] = startSpine.mock.calls.map((call) => call[1]);
    act(() => heroStart.onReady([], HARDWARE_GPU));
    act(() => tourStart.onReady([], HARDWARE_GPU));
    nearScreen(hero, false);
    await act(async () => {
      nearScreen(hero, true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(startSpine).toHaveBeenCalledTimes(3);
    act(() => heroStart.onReady([], HARDWARE_GPU));
    expect(hero.dataset.spine).toBe("loading");
    act(() => heroStart.onFail("context-lost"));
    expect(hero.dataset.spine).toBe("loading");
    expect(startSpine.mock.results[2].value.dispose).not.toHaveBeenCalled();
  });

  it("keeps an off-screen viewer's 3D while no other viewer is live", async () => {
    await mountTwo();
    const [hero] = viewers();
    act(() => startSpine.mock.calls[0][1].onReady([], HARDWARE_GPU));
    nearScreen(hero, false);
    expect(hero.dataset.spine).toBe("live");
    expect(startSpine.mock.results[0].value.dispose).not.toHaveBeenCalled();
  });
});

describe("every viewer on a software renderer (W14-X)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the plan's still, loads no 3D code and records the fallback", async () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      RENDERER: 0x1f01,
      getExtension: (ext: string) => (ext === "WEBGL_lose_context" ? { loseContext } : null),
      getParameter: () => "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    } as unknown as RenderingContext);
    const meshFetch = vi.fn(async () => new Response(new ArrayBuffer(1)));
    vi.stubGlobal("fetch", meshFetch);
    await mount();
    expect(startSpine).not.toHaveBeenCalled();
    expect(meshFetch).not.toHaveBeenCalled(); // W23-C: the mesh preload waits for the probe's answer
    expect(screen!.container.querySelector("[data-testid=spine-loading]")).toBeNull();
    expect(viewer().dataset.spine).toBe("fallback");
    expect(viewer().dataset.spineReason).toBe("software-gl");
    expect(still().className).not.toContain("invisible");
    expect(canvas()).toBeNull();
    expect(onPhase).toHaveBeenCalledWith("fallback", "software-gl");
    expect(loseContext).toHaveBeenCalled();
  });
});

describe("the idle spin on a weak GPU (W14-O)", () => {
  const SWIFTSHADER = "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)";
  const renders = () => handle.render.mock.calls.length;

  it("does not spin on a software renderer and draws only when moved, and a drag still turns it", async () => {
    await mount();
    ready([], SWIFTSHADER);
    flush(3);
    expect(viewer().dataset.spineSpin).toBe("off");
    expect(lastView().yaw).toBe(0);
    expect(frames).toHaveLength(0);
    pointer("pointerdown", 100);
    pointer("pointermove", 160);
    flush();
    expect(lastView().yaw).toBeGreaterThan(0.3);
  });

  it("stops spinning once the median of its first 30 frames is over 33 ms", async () => {
    await mount();
    ready();
    expect(viewer().dataset.spineSpin).toBe("on");
    act(() => flush(31, 50));
    expect(viewer().dataset.spineSpin).toBe("off");
    expect(frames).toHaveLength(0);
  });

  it("keeps spinning on a GPU that keeps up", async () => {
    await mount();
    ready();
    flush(40);
    expect(viewer().dataset.spineSpin).toBe("on");
    expect(frames).toHaveLength(1);
  });

  it("spins at 30 frames a second at most on a phone", async () => {
    vi.stubGlobal("innerWidth", 390);
    await mount();
    ready();
    const before = renders();
    flush(6);
    expect(renders() - before).toBe(3);
  });

  it("pauses the idle spin while the page isn't focused, and spins on once it is again", async () => {
    await mount();
    ready();
    flush(2);
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    flush(2);
    const paused = renders();
    flush(3);
    expect(renders()).toBe(paused);
    expect(frames).toHaveLength(0);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    flush(2);
    expect(renders()).toBeGreaterThan(paused);
  });
});

describe("the plan's viewer and the mesh (W15-D2, W23-C)", () => {
  it("W23-C: once the probe says the GPU is real, downloads its mesh beside the 3D code and hands the bytes over", async () => {
    const meshFetch = vi.fn(async () => new Response(new ArrayBuffer(1)));
    vi.stubGlobal("fetch", meshFetch);
    await mount();
    expect(startSpine).toHaveBeenCalledTimes(1);
    expect(meshFetch).toHaveBeenCalledTimes(1);
    expect(meshFetch.mock.calls[0]).toEqual([lastOptions().meshUrl]);
    expect(lastOptions().meshBytes).toBeDefined();
  });
});

describe("the loading cue on the still (W23-C, W23-C3)", () => {
  const cue = () => screen!.container.querySelector<HTMLElement>("[data-testid=spine-loading]");
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  it("shows on the still while the 3D loads, hidden from screen readers, only after CUE_DELAY_MS (L3: a timer, so reduced motion waits too)", async () => {
    await mountWith();
    expect(viewer().dataset.spine).toBe("loading");
    expect(cue()).toBeNull();
    await advance(CUE_DELAY_MS);
    expect(cue()).not.toBeNull();
    expect(cue()!.getAttribute("aria-hidden")).toBe("true");
  });

  it("never shows for a 3D that is live before CUE_DELAY_MS (a warm load)", async () => {
    await mountWith();
    ready();
    await advance(CUE_DELAY_MS);
    expect(cue()).toBeNull();
  });

  it("fades out with the handover and is gone once the 3D covers the still", async () => {
    await mountWith();
    await advance(CUE_DELAY_MS);
    ready();
    expect(cue()!.style.opacity).toBe("0");
    await advance(CROSSFADE_MS);
    expect(cue()).toBeNull();
  });

  it("M1: leaves once the load is slow (reason timeout), so a 3D that never draws leaves the still alone", async () => {
    await mountWith();
    await advance(CUE_DELAY_MS);
    expect(cue()).not.toBeNull();
    await advance(LOAD_TIMEOUT_MS);
    expect(viewer().dataset.spineReason).toBe("timeout");
    expect(cue()).toBeNull();
  });

  it("never stays up on the still a visitor keeps (no WebGL2)", async () => {
    Reflect.deleteProperty(window, "WebGL2RenderingContext");
    await mountWith();
    await advance(CUE_DELAY_MS);
    expect(viewer().dataset.spine).toBe("fallback");
    expect(cue()).toBeNull();
  });
});


describe("the plan's viewer and a mesh warmed during the questions (W15-M6)", () => {
  const meshBytes = new Uint8Array([7, 7, 7]).buffer;
  let meshFetch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    forgetWarmMeshes();
    meshFetch = vi.fn(async (_url: string) => new Response(meshBytes));
    vi.stubGlobal("fetch", meshFetch);
    // The probe runs in a worker, as in Chrome, Firefox and Safari 17, and says the GPU is real.
    vi.stubGlobal("OffscreenCanvas", class {});
    vi.stubGlobal(
      "Worker",
      class {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        onerror = null;
        terminate = () => undefined;
        constructor() {
          queueMicrotask(() => this.onmessage?.({ data: { software: false } }));
        }
      },
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Lets timers and the dynamic import of ./host run. */
  const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
  /** The plan's viewer: it starts after the first paint, in idle time. */
  async function mountPlanViewer() {
    await act(async () => {
      screen = render(ui());
    });
    act(() => flush(2));
    await wait(1);
    await wait(1);
  }

  it("hands a mesh warmed during the questions to the plan's 3D, with no second request", async () => {
    warmMesh(MESH_URLS.desktop);
    await mountPlanViewer();
    expect(startSpine).toHaveBeenCalledTimes(1);
    expect(lastOptions().meshUrl).toBe(MESH_URLS.desktop);
    expect(new Uint8Array((await lastOptions().meshBytes)!)).toEqual(new Uint8Array(meshBytes));
    expect(meshFetch).toHaveBeenCalledTimes(1);
  });

  it("W17-S: starts the big spine only, with no close-up to load", async () => {
    warmMesh(MESH_URLS.desktop);
    await mountPlanViewer();
    expect(startSpine).toHaveBeenCalledTimes(1);
    expect(Object.keys(lastOptions()).filter((k) => /closeup/i.test(k))).toEqual([]);
    expect(meshFetch).toHaveBeenCalledTimes(1);
  });

  it("hands the warm bytes to one build only; a later build fetches (from the HTTP cache)", async () => {
    warmMesh(MESH_URLS.desktop);
    await mountPlanViewer();
    const first = lastOptions().meshBytes;
    screen!.unmount();
    await mountPlanViewer();
    expect(first).toBeDefined();
    expect(lastOptions().meshBytes).toBeUndefined();
  });
});

describe("a 3D that never arrives (W14-V T6)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function mountLoading() {
    await act(async () => {
      screen = render(ui());
    });
    act(() => flush(2));
    // The dynamic import of ./host settles (vi.waitFor would run the fake clock on).
    for (let i = 0; i < 5 && !startSpine.mock.calls.length; i++) await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
    expect(startSpine).toHaveBeenCalled();
  }
  const started = () => startSpine.mock.results.at(-1)!.value as typeof handle;

  it("keeps loading past 20 s on a slow network: records the slow load, keeps the 3D, and fades it in when ready (W22-LOAD)", async () => {
    await mountLoading();
    expect(viewer().dataset.spine).toBe("loading");
    await act(async () => void (await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS)));
    expect(viewer().dataset.spine).toBe("loading");
    expect(viewer().dataset.spineReason).toBe("timeout");
    expect(onPhase).toHaveBeenCalledWith("fallback", "timeout");
    expect(started().dispose).not.toHaveBeenCalled();
    ready();
    expect(viewer().dataset.spine).toBe("live");
    expect(onPhase).toHaveBeenLastCalledWith("live", null);
  });

  it("never times out once the first frame is drawn", async () => {
    await mountLoading();
    ready();
    await act(async () => void (await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS * 2)));
    expect(viewer().dataset.spine).toBe("live");
  });
});

describe("what the viewer tells a screen reader, and how it moves, after it starts (W14-V T7, T8)", () => {
  let reduce = false;
  let changed: (() => void)[] = [];
  beforeEach(() => {
    reduce = false;
    changed = [];
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduced-motion") ? reduce : true,
      addEventListener: (_type: string, listener: () => void) => changed.push(listener),
      removeEventListener: (_type: string, listener: () => void) => (changed = changed.filter((l) => l !== listener)),
    }));
  });

  it("reads the canvas in the theme it is in now", async () => {
    const labelled = (label: string) => (
      <SpineViewer label={label}>
        <img alt={label} src="/still.webp" />
      </SpineViewer>
    );
    await act(async () => {
      screen = render(labelled("A dark spine"));
    });
    await act(async () => {
      flush(2);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    ready();
    await act(async () => screen!.rerender(labelled("A light spine")));
    expect(canvas()?.getAttribute("aria-label")).toBe("A light spine");
  });

  it("stops the idle spin when Reduce Motion is turned on while it runs, and says so through the API", async () => {
    await mount();
    ready();
    flush(2);
    expect(viewer().dataset.spineSpin).toBe("on");
    reduce = true;
    act(() => changed.forEach((listener) => listener()));
    expect(viewer().dataset.spineSpin).toBe("off");
    expect(api!.reducedMotion).toBe(true);
    flush(2);
    expect(frames).toHaveLength(0);
  });
});

describe("a real GPU always gets its 3D (W22-LOAD)", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => vi.useRealTimers());

  it("starts again on the main thread when the worker path fails before its first frame (Safari 16's OffscreenCanvas has no WebGL)", async () => {
    startSpine.mockImplementationOnce(() => ({ ...handle, offThread: true, dispose: vi.fn() }) as typeof handle);
    await mountWith();
    expect(startSpine.mock.calls[0][2]).toBe("auto");
    act(() => lastOptions().onFail("no-webgl2"));
    await advance(0);
    expect(startSpine).toHaveBeenCalledTimes(2);
    expect(startSpine.mock.calls[1][2]).toBe("inline");
    expect(viewer().dataset.spine).toBe("loading");
    expect(onPhase).not.toHaveBeenCalledWith("fallback", expect.anything());
    ready();
    expect(viewer().dataset.spine).toBe("live");
  });

  it.each(["context-lost", "mesh-failed", "error"] as const)("tries again after a %s, MAX_RETRIES times, then gives the still back", async (reason) => {
    await mountWith();
    for (let i = 0; i < MAX_RETRIES; i++) {
      act(() => lastOptions().onFail(reason));
      expect(viewer().dataset.spine).toBe("loading");
      await advance(RETRY_DELAYS_MS[i]);
      expect(startSpine).toHaveBeenCalledTimes(i + 2);
    }
    act(() => lastOptions().onFail(reason));
    expect(viewer().dataset.spine).toBe("fallback");
    expect(viewer().dataset.spineReason).toBe(reason);
  });

  it("comes back after a lost context once it was live", async () => {
    await mountWith();
    ready();
    act(() => lastOptions().onFail("context-lost"));
    await advance(RETRY_DELAYS_MS[0]);
    expect(startSpine).toHaveBeenCalledTimes(2);
    ready();
    expect(viewer().dataset.spine).toBe("live");
    expect(onPhase.mock.calls).toEqual([["live", null]]);
  });
});

describe("?why3d=1 shows why the 3D did or didn't take over (W22-LOAD)", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
    sessionStorage.clear();
  });
  const why = () => screen!.container.querySelector<HTMLElement>("[data-testid=why3d]");

  it("shows nothing without the flag", async () => {
    await mount();
    expect(why()).toBeNull();
  });

  it("shows the phase, the reason and the network, then the GPU once live", async () => {
    window.history.replaceState(null, "", "/?why3d=1");
    effectiveType = "3g";
    await mount();
    expect(why()!.textContent).toMatch(/loading/);
    expect(why()!.textContent).toMatch(/3g/);
    ready();
    expect(why()!.textContent).toMatch(/live/);
    expect(why()!.textContent).toMatch(/Apple M2/);
  });

  it("keeps showing once asked this session, after the funnel's steps change the address", async () => {
    window.history.replaceState(null, "", "/?why3d=1");
    await mount();
    screen!.unmount();
    window.history.replaceState(null, "", "/plan");
    await mount();
    expect(why()).not.toBeNull();
  });

  it("names the reason when it keeps the still", async () => {
    window.history.replaceState(null, "", "/?why3d=1");
    vi.stubGlobal("WebGL2RenderingContext", undefined);
    Reflect.deleteProperty(window, "WebGL2RenderingContext");
    await mount();
    expect(why()!.textContent).toMatch(/fallback/);
    expect(why()!.textContent).toMatch(/no-webgl2/);
  });
});
