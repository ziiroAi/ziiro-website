// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composePlan } from "../../data";
import { render, type Rendered } from "../../plan/test-utils";
import type { SpineViewerApi } from "../api";
import { meshFor } from "../rules";
import { centredTarget, type Stop } from "./tour";

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
/** What the tour sends flyTo for a stop: its centred framing (tour.ts). */
const framed = (stop: Stop) => centredTarget(stop, meshFor(window.innerWidth));
const settle = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });

function fakeApi(reducedMotion = false) {
  const flights: unknown[] = [];
  const api = {
    flyTo: vi.fn((target: unknown, options?: { animate?: boolean }) => {
      flights.push(options?.animate === false ? { cut: target } : target);
      return Promise.resolve();
    }),
    setLit: vi.fn(),
    onDiscBoxes: () => () => undefined,
    onDiscPick: () => () => undefined,
    pick: () => Promise.resolve(null),
    boxes: () => [],
    reducedMotion,
  } as unknown as SpineViewerApi;
  return { api, flights };
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
    intersect(depth(1));
    await settle();
    expect(stage.dataset.stop).toBe("G04");
    intersect(depth(2));
    await settle();
    expect(flights.slice(1)).toEqual([framed("G04"), framed(null), framed("G05")]);
    intersect(depth(0));
    await settle();
    expect(flights.at(-1)).toEqual(framed(null));
  });

  it("cuts straight from stop to stop under reduced motion", async () => {
    const { api, flights } = fakeApi(true);
    viewer.nextApi = api;
    const { tour, depth } = mount();
    intersect(tour);
    await settle();
    intersect(depth(1));
    await settle();
    intersect(depth(2));
    await settle();
    expect(flights.slice(1)).toEqual([framed("G04"), framed("G05")]);
  });

  it("watches the line through the middle of the screen for the stop in view", () => {
    mount();
    const watcher = FakeObserver.all.find((o) => o.targets.some((t) => t.hasAttribute("data-depth")))!;
    expect(watcher.options?.rootMargin).toBe("-50% 0px -50% 0px");
    expect(watcher.targets).toHaveLength(5);
  });

  it("flies nowhere while the still is showing", async () => {
    viewer.nextApi = null;
    const { tour, depth, stage } = mount();
    intersect(tour);
    intersect(depth(1));
    await settle();
    expect(stage.dataset.stop).toBe("G04");
  });
});
