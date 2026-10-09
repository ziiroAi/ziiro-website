// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composePlan } from "../../data";
import { render, type Rendered } from "../../plan/test-utils";
import type { SpineViewerApi } from "../api";
import { meshFor } from "../rules";
import { LEGEND_STRIP_PX, tourFraming, type Stop } from "./tour";

/** The viewer stand-in: renders the still and hands over whatever API the test put in `nextApi`. */
const viewer = vi.hoisted(() => ({ nextApi: null as SpineViewerApi | null, mounts: 0 }));
vi.mock("../SpineViewer", () => ({
  SpineViewer: ({ children, onApi }: { children: ReactNode; onApi?: (api: SpineViewerApi | null) => void }) => {
    useEffect(() => {
      viewer.mounts += 1;
      onApi?.(viewer.nextApi);
    }, [onApi]);
    return <div data-testid="spine-viewer">{children}</div>;
  },
}));

const { SpineTour } = await import("./SpineTour");

/** A controllable IntersectionObserver: tests say which elements intersect. */
class FakeObserver {
  static all: FakeObserver[] = [];
  readonly targets: Element[] = [];
  constructor(readonly callback: IntersectionObserverCallback, readonly options?: IntersectionObserverInit) {
    FakeObserver.all.push(this);
  }
  observe(el: Element) { this.targets.push(el); }
  unobserve() {}
  disconnect() { this.targets.length = 0; }
  takeRecords() { return []; }
}
function intersect(el: Element) {
  act(() => {
    for (const o of FakeObserver.all.filter((o) => o.targets.includes(el))) {
      o.callback([{ target: el, isIntersecting: true } as unknown as IntersectionObserverEntry], o as unknown as IntersectionObserver);
    }
  });
}
/** What the tour sends flyTo for a stop: its own framing on the stage's size (jsdom: 0 × 0 until resized). */
const framed = (stop: Stop, view = { width: 0, height: 0 }) =>
  ({ kind: "framing", framing: tourFraming(stop, meshFor(window.innerWidth), view, LEGEND_STRIP_PX.desktop) });

/** A ResizeObserver the tests drive. */
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
/**
 * The words' sections laid out 1000 px tall from y 2000, so the test can scroll the page: each section's rect follows
 * the fake scroll position, and scrollToDepth puts a section's top 40 px above the screen's middle line.
 */
let pageY = 0;
function layOut(sections: HTMLElement[]) {
  sections.forEach((el) => {
    const top = 2000 + 1000 * Number(el.dataset.depth);
    el.getBoundingClientRect = () => ({ top: top - pageY, bottom: top + 1000 - pageY, left: 0, right: 600, width: 600, height: 1000 }) as DOMRect;
  });
}
async function scrollToDepth(n: number) {
  pageY = 2000 + 1000 * n - window.innerHeight / 2 + 40;
  await act(async () => {
    window.dispatchEvent(new Event("scroll"));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  });
}
const settle = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });

function fakeApi(reducedMotion = false) {
  const flights: unknown[] = [];
  /** Whether each flight asked the model to hold its side view (W14-X). */
  const holds: boolean[] = [];
  const api = {
    flyTo: vi.fn((target: unknown, options?: { animate?: boolean; hold?: boolean }) => {
      flights.push(options?.animate === false ? { cut: target } : target);
      holds.push(options?.hold === true);
      return Promise.resolve();
    }),
    setLit: vi.fn(),
    onDiscBoxes: () => () => undefined,
    onDiscPick: () => () => undefined,
    pick: () => Promise.resolve(null),
    boxes: () => [],
    reducedMotion,
  } as unknown as SpineViewerApi;
  return { api, flights, holds };
}

const ANANYA = composePlan({
  teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [],
  problemText: "Enquiries come in, but by the time someone calls back they've gone cold.",
});
const STOPS = ["deals", "sales", "marketing", "back-office"] as const;

let view: Rendered | null = null;
beforeEach(() => {
  FakeObserver.all = [];
  viewer.mounts = 0;
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  FakeResize.all = [];
  vi.stubGlobal("ResizeObserver", FakeResize);
});
afterEach(() => {
  view?.unmount();
  view = null;
  vi.unstubAllGlobals();
});

function mount() {
  view = render(
    <SpineTour departments={STOPS} planAgentIds={ANANYA.agentIds}>
      <section data-depth={0}>need</section>
      {STOPS.map((d, i) => <section key={d} data-depth={i + 1}>{d}</section>)}
    </SpineTour>,
  );
  const q = (sel: string) => view!.container.querySelector<HTMLElement>(sel)!;
  layOut([...view.container.querySelectorAll<HTMLElement>("[data-depth]")]);
  return {
    tour: q("[data-testid=spine-tour]"),
    stage: q("[data-testid=spine-tour-stage]"),
    depth: (n: number) => q(`[data-depth="${n}"]`),
  };
}

describe("SpineTour: the sticky stage beside the words (blocks 2 and 3)", () => {
  it("is sticky under the site's bar, beside the words from 1024 px and a band above them below that", () => {
    const { stage } = mount();
    expect(stage.className).toContain("sticky");
    expect(stage.className).toContain("top-[var(--nav-h,84px)]");
    expect(stage.className).toContain("lg:order-2");
  });

  it("shows the still and starts no second 3D viewer until the tour reaches the screen", () => {
    const { tour, stage } = mount();
    expect(viewer.mounts).toBe(0);
    expect(stage.querySelector("picture img")).not.toBeNull();
    intersect(tour);
    expect(viewer.mounts).toBe(1);
    expect(stage.querySelector("[data-testid=spine-viewer] picture img")).not.toBeNull();
  });

  it("gives the phone band the lens window's own shape, so the spine isn't stretched (W14-M)", () => {
    const { stage } = mount();
    expect(stage.querySelector("picture img")!.className).toContain("max-lg:aspect-[1290/1356]");
  });

  it("fades the canvas into the page at its edges instead of a hard rectangle (W14-M)", () => {
    const { tour, stage } = mount();
    intersect(tour);
    const soft = stage.querySelector<HTMLElement>("[data-soft-edges]")!;
    expect(soft.querySelector("[data-testid=spine-viewer]")).not.toBeNull();
    expect(soft.style.maskImage || soft.style.getPropertyValue("-webkit-mask-image")).toContain("linear-gradient");
    expect(stage.querySelector("[data-soft-edges] [data-legend], [data-soft-edges] [data-callout]")).toBeNull();
  });

  it("lifts the light stage so its background meets the page colour, and leaves dark alone (W14-X)", async () => {
    document.documentElement.dataset.theme = "light";
    const { stage } = mount();
    const soft = () => stage.querySelector<HTMLElement>("[data-soft-edges]")!;
    // The stage's light background renders (235, 234, 232) against the page's (250, 250, 248).
    expect(soft().style.filter).toMatch(/^brightness\(1\.06\d*\)$/);
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await Promise.resolve();
    });
    expect(soft().style.filter).toBe("");
    delete document.documentElement.dataset.theme;
  });

  it("starts at once where IntersectionObserver is missing", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    mount();
    expect(viewer.mounts).toBe(1);
  });
});

describe("SpineTour: scroll flights (§6.2 block 3, D30)", () => {
  it("lights the plan's departments and cuts to the overview when the 3D arrives", async () => {
    const { api, flights } = fakeApi();
    viewer.nextApi = api;
    const { tour, stage } = mount();
    intersect(tour);
    await settle();
    expect(api.setLit).toHaveBeenCalledWith(STOPS);
    expect(flights).toEqual([{ cut: framed(null) }]);
    expect(stage.dataset.stop).toBe("overview");
  });

  it("flies into each stop's disc, pulling back to the full spine between two stops", async () => {
    const { api, flights } = fakeApi();
    viewer.nextApi = api;
    const { tour, stage, depth } = mount();
    intersect(tour);
    await settle();
    await scrollToDepth(1);
    await settle();
    expect(stage.dataset.stop).toBe("G04");
    await scrollToDepth(2);
    await settle();
    expect(flights.slice(1)).toEqual([framed("G04"), framed(null), framed("G05")]);
    await scrollToDepth(0);
    await settle();
    expect(flights.at(-1)).toEqual(framed(null));
  });

  it("holds the side view at each stop, and lets the overview spin (W14-X)", async () => {
    const { api, holds } = fakeApi();
    viewer.nextApi = api;
    const { tour } = mount();
    intersect(tour);
    await settle();
    await scrollToDepth(1);
    await settle();
    await scrollToDepth(3);
    await settle();
    // the first cut to the overview, G04, then G04 → overview → G06
    expect(holds).toEqual([false, true, false, true]);
  });

  it("re-frames the stop with a cut when the stage changes size", async () => {
    const { api, flights } = fakeApi();
    viewer.nextApi = api;
    const { tour, depth } = mount();
    intersect(tour);
    await settle();
    await scrollToDepth(1);
    await settle();
    FakeResize.all.forEach((o) => o.resize(648, 816));
    await settle();
    expect(flights.at(-1)).toEqual({ cut: framed("G04", { width: 648, height: 816 }) });
  });

  it("cuts straight from stop to stop under reduced motion", async () => {
    const { api, flights } = fakeApi(true);
    viewer.nextApi = api;
    const { tour, depth } = mount();
    intersect(tour);
    await settle();
    await scrollToDepth(1);
    await settle();
    await scrollToDepth(2);
    await settle();
    expect(flights.slice(1)).toEqual([framed("G04"), framed("G05")]);
  });

  it("reads the section crossing the screen's middle line on scroll, at most once a frame (W14-M)", async () => {
    // W14-M: an IntersectionObserver with a negative rootMargin missed the scroll to stop 1 in 6 of 12 Chromium runs.
    const { stage } = mount();
    await scrollToDepth(3);
    expect(stage.dataset.stop).toBe("G06");
    await scrollToDepth(0);
    expect(stage.dataset.stop).toBe("overview");
    const spy = vi.fn();
    const frames = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { spy(); return setTimeout(() => cb(0), 0) as unknown as number; });
    act(() => {
      for (let i = 0; i < 5; i += 1) window.dispatchEvent(new Event("scroll"));
    });
    expect(spy).toHaveBeenCalledTimes(1);
    frames.mockRestore();
  });

  it("keeps the last stop while the middle line is between sections", async () => {
    const { stage } = mount();
    await scrollToDepth(2);
    pageY = 99999;
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(stage.dataset.stop).toBe("G05");
  });

  it("on a phone, reads below the sticky band, so a stop is in view while its heading shows under the band (W14-M2)", async () => {
    vi.stubGlobal("matchMedia", (query: string) =>
      ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
    const { stage } = mount();
    const bandBottom = 494; // 84 px bar + the 390 × 410 band
    stage.getBoundingClientRect = () => ({ top: 84, bottom: bandBottom, left: 0, right: 390, width: 390, height: 410 }) as DOMRect;
    pageY = 2000 + 1000 - bandBottom - 16; // stop 1's heading sits 16 px under the band
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(stage.dataset.stop).toBe("G04");
  });

  it("flies nowhere while the still is showing", async () => {
    viewer.nextApi = null;
    const { tour, depth, stage } = mount();
    intersect(tour);
    await scrollToDepth(1);
    await settle();
    expect(stage.dataset.stop).toBe("G04");
  });
});
