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
import { MESH_URLS, SpineViewer } from "./SpineViewer";

let picked: DiscId | null = null;
const handle = {
  render: vi.fn(),
  pick: vi.fn(async () => picked),
  resize: vi.fn(),
  setTheme: vi.fn(async (_theme: string) => undefined),
  setLevels: vi.fn(),
  dispose: vi.fn(),
};
const startSpine = vi.fn((_canvas: HTMLCanvasElement, _options: StartOptions) => handle);
vi.mock("./host", () => ({ startSpine: (canvas: HTMLCanvasElement, options: StartOptions) => startSpine(canvas, options) }));

let screen: Rendered | null = null;
let saveData = false;
let frames: FrameRequestCallback[] = [];
let now = 0;
let api: SpineViewerApi | null = null;
const onPhase = vi.fn();

/** Runs the queued animation frames, n times over, 16 ms apart. */
function flush(n = 1) {
  for (let i = 0; i < n; i++) {
    now += 16;
    frames.splice(0).forEach((frame) => frame(now));
  }
}

beforeEach(() => {
  saveData = false;
  picked = null;
  frames = [];
  api = null;
  document.documentElement.dataset.theme = "light";
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.stubGlobal("WebGL2RenderingContext", class {});
  vi.stubGlobal("requestIdleCallback", (run: () => void) => {
    run();
    return 1;
  });
  Object.defineProperty(navigator, "connection", { configurable: true, get: () => ({ saveData }) });
});

afterEach(() => {
  screen?.unmount();
  screen = null;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
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

const ready = (boxes: DiscBox[] = []) => act(() => lastOptions().onReady(boxes));

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

  it("swaps the still out only once the first frame is drawn, and hands over the API", async () => {
    await mount();
    expect(api).toBeNull();
    ready();
    expect(viewer().dataset.spine).toBe("live");
    expect(still().className).toContain("invisible");
    expect(canvas()?.getAttribute("role")).toBe("img");
    expect(canvas()?.getAttribute("aria-label")).toBe("The spine");
    expect(canvas()?.hasAttribute("aria-hidden")).toBe(false);
    expect(api).not.toBeNull();
  });

  it.each(["no-webgl2", "context-lost", "mesh-failed", "error"] as const)(
    "gives the still back, drops the canvas and withdraws the API on %s",
    async (reason) => {
      await mount();
      ready();
      act(() => lastOptions().onFail(reason));
      expect(viewer().dataset.spine).toBe("fallback");
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

  it("reports live once, and the fallback with its reason, for the plan_view record (§9)", async () => {
    await mount();
    ready();
    act(() => lastOptions().onFail("mesh-failed"));
    expect(onPhase.mock.calls).toEqual([["live", null], ["fallback", "mesh-failed"]]);
  });

  it("never loads the 3D on a 3G connection", async () => {
    Object.defineProperty(navigator, "connection", { configurable: true, get: () => ({ saveData: false, effectiveType: "3g" }) });
    await mount();
    expect(startSpine).not.toHaveBeenCalled();
    expect(viewer().dataset.spineReason).toBe("slow-connection");
    expect(onPhase).toHaveBeenCalledWith("fallback", "slow-connection");
  });

  it("never loads the 3D under Save-Data", async () => {
    saveData = true;
    await mount();
    expect(startSpine).not.toHaveBeenCalled();
    expect(viewer().dataset.spine).toBe("fallback");
    expect(viewer().dataset.spineReason).toBe("save-data");
    expect(canvas()).toBeNull();
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
    ready();
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(handle.setTheme).toHaveBeenLastCalledWith("dark");
    expect(viewer().dataset.spine).toBe("live");
    expect(still().className).not.toContain("invisible");
    expect(canvas()?.style.opacity).toBe("0");
    await act(async () => drawn());
    expect(still().className).toContain("invisible");
    expect(canvas()?.style.opacity).toBe("1");
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
    expect(spun).toBeGreaterThan(0);
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

  it("picks a disc on a tap, but on touch only when its box is 44 × 44 px or more", async () => {
    await mount();
    const events: DiscPickEvent[] = [];
    ready([box("G05", 60), box("G03", 20)]);
    act(() => void api!.onDiscPick((event) => events.push(event)));
    const tap = async (pointerType: string) => {
      pointer("pointerdown", 50, pointerType);
      pointer("pointerup", 50, pointerType);
      await act(async () => {
        await Promise.resolve();
      });
    };

    picked = "G05";
    await tap("touch");
    picked = "G03";
    await tap("touch");
    await tap("mouse");
    expect(events.map((e) => [e.disc, e.via])).toEqual([["G05", "tap"], ["G03", "tap"]]);
    expect(events[1].box).toEqual(box("G03", 20));
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
    const events: DiscPickEvent[] = [];
    ready([box("G06", 60)]);
    act(() => void api!.onDiscPick((event) => events.push(event)));
    picked = "G06";
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
    act(() => heroStart.options.onReady([]));
    act(() => tourStart.options.onReady([]));
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
    act(() => startSpine.mock.calls[2][1].onReady([]));
    expect(hero.dataset.spine).toBe("live");
    expect(onPhase.mock.calls).toEqual([["live", null]]);
  });

  it("keeps an off-screen viewer's 3D while no other viewer is live", async () => {
    await mountTwo();
    const [hero] = viewers();
    act(() => startSpine.mock.calls[0][1].onReady([]));
    nearScreen(hero, false);
    expect(hero.dataset.spine).toBe("live");
    expect(startSpine.mock.results[0].value.dispose).not.toHaveBeenCalled();
  });
});
