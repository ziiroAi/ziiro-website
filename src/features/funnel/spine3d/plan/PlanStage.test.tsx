// @vitest-environment jsdom
// (C) W15-B: the plan's one 3D stage. The owner (wave15.md item 5): "when i scroll down, the big spine is not
// transitioning". One spine starts at the hero on the right and, scrolled into block 2, travels left as it zooms in.
import { act, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composePlan } from "../../data";
import { render, type Rendered } from "../../plan/test-utils";
import type { SpineViewerApi } from "../api";
import type { FallbackReason } from "../rules";
import { ACROSS, stageKeys } from "./stagePath";
import { LEGEND_STRIP_PX } from "./tour";

/** The viewer stand-in: renders the still, hands over the API in `nextApi`, and reports `nextPhase`. */
const viewer = vi.hoisted(() => ({
  nextApi: null as SpineViewerApi | null,
  nextPhase: null as null | ["live" | "fallback", FallbackReason | null],
  mounts: 0,
}));
vi.mock("../SpineViewer", () => ({
  SpineViewer: ({ children, onApi, onPhase }: {
    children: ReactNode;
    onApi?: (api: SpineViewerApi | null) => void;
    onPhase?: (phase: "live" | "fallback", reason: FallbackReason | null) => void;
  }) => {
    useEffect(() => {
      viewer.mounts += 1;
      onApi?.(viewer.nextApi);
      if (viewer.nextPhase) onPhase?.(...viewer.nextPhase);
    }, [onApi, onPhase]);
    return <div data-testid="spine-viewer">{children}</div>;
  },
}));

const { PlanStage } = await import("./PlanStage");

class FakeResize {
  static all: FakeResize[] = [];
  constructor(readonly callback: ResizeObserverCallback) { FakeResize.all.push(this); }
  observe() {}
  unobserve() {}
  disconnect() {}
  resize(width: number, height: number) {
    act(() => this.callback([{ contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver));
  }
}

const ANANYA = composePlan({
  teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [],
  problemText: "Enquiries come in, but by the time someone calls back they've gone cold.",
});
const STOPS = ["deals", "sales", "marketing", "back-office"] as const;
const DISCS = ["G04", "G05", "G06", "G01"] as const;
const VIEW = { width: 1440, height: 816 };

/** The page: block 2 from y 1000, each stop 1000 tall after it, then the close. Rects follow the fake scroll. */
let pageY = 0;
function layOut(sections: HTMLElement[]) {
  sections.forEach((el) => {
    const top = 1000 + 1000 * Number(el.dataset.depth);
    el.getBoundingClientRect = () => ({ top: top - pageY, bottom: top + 1000 - pageY, left: 0, right: 600, width: 600, height: 1000 }) as DOMRect;
  });
}
async function scrollTo(y: number) {
  pageY = y;
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  });
}
const settle = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });
/** Where block 2 (depth 0) and the stops reach the desktop reading line, the screen's middle. */
const arrival = (depth: number) => 1000 + 1000 * depth - window.innerHeight / 2;

function fakeApi(reducedMotion = false) {
  return {
    scrub: vi.fn(),
    flyTo: vi.fn(() => Promise.resolve()),
    setLit: vi.fn(),
    onDiscBoxes: () => () => undefined,
    onDiscPick: () => () => undefined,
    pick: () => Promise.resolve(null),
    boxes: () => [],
    reducedMotion,
  } as unknown as SpineViewerApi & { scrub: ReturnType<typeof vi.fn>; setLit: ReturnType<typeof vi.fn>; flyTo: ReturnType<typeof vi.fn> };
}

let view: Rendered | null = null;
beforeEach(() => {
  viewer.mounts = 0;
  viewer.nextApi = null;
  viewer.nextPhase = null;
  pageY = 0;
  FakeResize.all = [];
  vi.stubGlobal("ResizeObserver", FakeResize);
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => pageY });
});
afterEach(() => {
  view?.unmount();
  view = null;
  vi.unstubAllGlobals();
});

function mount(onProgress = vi.fn()) {
  view = render(
    <PlanStage departments={STOPS} planAgentIds={ANANYA.agentIds} onProgress={onProgress}>
      {(stage) => (
        <>
          <section>hero</section>
          {stage}
          <section data-depth={0}>need</section>
          {STOPS.map((d, i) => <section key={d} data-depth={i + 1}>{d}</section>)}
          <section data-depth={STOPS.length + 1}>close</section>
        </>
      )}
    </PlanStage>,
  );
  const q = (sel: string) => view!.container.querySelector<HTMLElement>(sel)!;
  layOut([...view.container.querySelectorAll<HTMLElement>("[data-depth]")]);
  FakeResize.all.forEach((o) => o.resize(VIEW.width, VIEW.height));
  return { stage: q("[data-testid=spine-stage]"), still: q("[data-stage-still]") };
}
const keys = () => stageKeys(DISCS, "desktop", "desktop", VIEW, LEGEND_STRIP_PX.desktop).keys;
/** The stage's latest camera move, as [framing, hold]: a scrub, or the eased flight it makes when the 3D arrives. */
function lastScrub(api: ReturnType<typeof fakeApi>): unknown[] | undefined {
  const scrubbed = api.scrub.mock.invocationCallOrder.at(-1) ?? -1;
  const flown = api.flyTo.mock.invocationCallOrder.at(-1) ?? -1;
  if (scrubbed > flown) return api.scrub.mock.calls.at(-1);
  const flight = api.flyTo.mock.calls.at(-1) as [{ framing: unknown }, { hold?: boolean }] | undefined;
  return flight && [flight[0].framing, flight[1].hold ? 1 : 0];
}

describe("PlanStage: one spine for the whole plan (W15-B)", () => {
  it("draws exactly one viewer, in the flow where the plan puts it", () => {
    const { stage } = mount();
    expect(view!.container.querySelectorAll("[data-testid=spine-viewer]")).toHaveLength(1);
    expect(stage.previousElementSibling?.textContent).toBe("hero");
  });

  it("is a sticky band under the bar on a phone, and from 1024 px a full screen behind the words", () => {
    const { stage } = mount();
    expect(stage.className).toContain("sticky");
    expect(stage.className).toContain("top-[var(--nav-h,84px)]");
    expect(stage.className).toContain("lg:absolute");
    expect(stage.className).toContain("lg:inset-0");
    const screen = stage.querySelector<HTMLElement>("[data-stage-screen]")!;
    expect(screen.className).toContain("lg:sticky");
    expect(screen.className).toContain("lg:h-[calc(100vh-var(--nav-h,84px))]");
    expect(view!.container.querySelector("img")?.className).toContain("max-lg:aspect-[1290/1356]");
  });

  it("fades the canvas into the page at its edges, with the overlay outside the fade (W14-M)", () => {
    const { stage } = mount();
    const soft = stage.querySelector<HTMLElement>("[data-soft-edges]")!;
    expect(soft.querySelector("[data-testid=spine-viewer]")).not.toBeNull();
    expect(soft.style.maskImage || soft.style.getPropertyValue("-webkit-mask-image")).toContain("linear-gradient");
    expect(stage.querySelector("[data-soft-edges] [data-legend], [data-soft-edges] [data-callout]")).toBeNull();
  });

  it("puts no filter on the stage in either theme: the canvas itself now paints the page colour (W15-A)", async () => {
    document.documentElement.dataset.theme = "light";
    const { stage } = mount();
    const soft = () => stage.querySelector<HTMLElement>("[data-soft-edges]")!;
    expect(soft().style.filter).toBe("");
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await Promise.resolve();
    });
    expect(soft().style.filter).toBe("");
    delete document.documentElement.dataset.theme;
  });

  it("records plan_view: motion once live, else the still and why (§9)", () => {
    const onProgress = vi.fn();
    viewer.nextPhase = ["fallback", "software-gl"];
    mount(onProgress);
    expect(onProgress).toHaveBeenCalledWith({ planView: "still", stillReason: "unsupported" });
  });

  it("lights the plan's departments when the 3D arrives", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await settle();
    expect(api.setLit).toHaveBeenCalledWith(STOPS);
  });
});

describe("PlanStage: scrubbed by the scroll (W15-B)", () => {
  it("starts on the hero's framing, the spine on the right, with the idle spin", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(0);
    expect(lastScrub(api)).toEqual([keys()[0].framing, 0]);
  });

  it("travels left and zooms in as block 2 reaches the middle line, then flies into each stop", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    const { stage } = mount();
    await scrollTo(arrival(0));
    expect(lastScrub(api)).toEqual([keys()[1].framing, 0]);
    expect(stage.dataset.stop).toBe("overview");
    await scrollTo(arrival(1) + 10);
    expect(lastScrub(api)).toEqual([keys()[2].framing, 1]);
    expect(stage.dataset.stop).toBe("G04");
    await scrollTo(arrival(3) + 10);
    expect(stage.dataset.stop).toBe("G06");
  });

  it("moves part way between two keyframes, never jumping straight to the next", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(arrival(0) - 100);
    const [framing] = lastScrub(api)!;
    expect(framing).not.toEqual(keys()[0].framing);
    expect(framing).not.toEqual(keys()[1].framing);
  });

  it("eases from the viewer's first frame (r17's) to the stage's framing once when the 3D arrives, then scrubs (W15-B2)", async () => {
    vi.stubGlobal("matchMedia", (query: string) =>
      ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(0);
    expect(api.flyTo).toHaveBeenCalledTimes(1);
    expect(api.flyTo.mock.calls[0][0]).toMatchObject({ kind: "framing" });
    expect(api.flyTo.mock.calls[0][1]).toMatchObject({ animate: true });
    await scrollTo(arrival(0));
    expect(api.flyTo).toHaveBeenCalledTimes(1);
    expect(api.scrub).toHaveBeenCalled();
  });

  it("cuts from keyframe to keyframe under reduced motion (§11.8)", async () => {
    const api = fakeApi(true);
    viewer.nextApi = api;
    mount();
    await scrollTo(arrival(0) - 100);
    expect(lastScrub(api)).toEqual([keys()[0].framing, 0]);
    await scrollTo(arrival(1) - 1);
    expect(lastScrub(api)).toEqual([keys()[1].framing, 0]);
  });

  it("reads the scroll at most once a frame", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(0);
    const spy = vi.fn();
    const frames = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { spy(); return setTimeout(() => cb(0), 0) as unknown as number; });
    act(() => {
      for (let i = 0; i < 5; i += 1) window.dispatchEvent(new Event("scroll"));
    });
    expect(spy).toHaveBeenCalledTimes(1);
    frames.mockRestore();
  });

  it("tells the overlay where the spine stands, for the legend to follow it (W15-B2)", async () => {
    const { stage } = mount();
    const screen = stage.querySelector<HTMLElement>("[data-stage-screen]")!;
    await scrollTo(0);
    expect(screen.style.getPropertyValue("--spine-across")).toBe(String(ACROSS.desktop.hero));
    await scrollTo(arrival(1));
    expect(screen.style.getPropertyValue("--spine-across")).toBe(String(ACROSS.desktop.left));
  });

  it("slides the still left with the spine while the 3D isn't live, so the words on the right stay clear", async () => {
    const { still } = mount();
    await scrollTo(0);
    expect(still.style.transform).toBe("translateX(0%)");
    await scrollTo(arrival(1));
    const shift = (ACROSS.desktop.left - ACROSS.desktop.hero) * 100;
    expect(still.style.transform).toBe(`translateX(${Number(shift.toFixed(2))}%)`);
  });
});
