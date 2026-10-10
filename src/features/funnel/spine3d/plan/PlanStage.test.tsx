// @vitest-environment jsdom
// (C) W15-B: the plan's one 3D stage. The owner (wave15.md item 5): "when i scroll down, the big spine is not
// transitioning". One spine starts at the hero on the right and, scrolled into block 2, travels left as it zooms in.
import { act, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composePlan, copy, departments } from "../../data";
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
  closeup: undefined as boolean | undefined,
}));
vi.mock("../SpineViewer", () => ({
  // No crossfade here: the camera follows the scroll as soon as the API arrives (the wait is SpineViewer's to test).
  CROSSFADE_MS: 0,
  RINGS_IN_MS: 0,
  SpineViewer: ({ children, onApi, onPhase, closeup }: {
    children: ReactNode;
    closeup?: boolean;
    onApi?: (api: SpineViewerApi | null) => void;
    onPhase?: (phase: "live" | "fallback", reason: FallbackReason | null) => void;
  }) => {
    viewer.closeup = closeup;
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
/** W18-A: every department, in the data's order. */
const ALL_DEPARTMENTS = departments.map((d) => d.id);
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
/** Where the close has landed: its pull-back runs a screen and arrives up to a screen late (final review L1). */
const closeRest = () => arrival(STOPS.length + 1) + window.innerHeight;

function fakeApi(reducedMotion = false) {
  return {
    scrub: vi.fn(),
    setPose: vi.fn(),
    flyTo: vi.fn(() => Promise.resolve()),
    setLit: vi.fn(),
    onDiscBoxes: () => () => undefined,
    onDiscPick: () => () => undefined,
    pick: () => Promise.resolve(null),
    boxes: () => [],
    reducedMotion,
  } as unknown as SpineViewerApi & { scrub: ReturnType<typeof vi.fn>; setPose: ReturnType<typeof vi.fn>; setLit: ReturnType<typeof vi.fn>; flyTo: ReturnType<typeof vi.fn> };
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

function mount(onProgress = vi.fn(), guest = false) {
  view = render(
    <PlanStage departments={STOPS} planAgentIds={ANANYA.agentIds} onProgress={onProgress} guest={guest}>
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
const keys = () => stageKeys(DISCS, "desktop", "desktop", VIEW, LEGEND_STRIP_PX.desktop);
/** The stage's latest camera move, as [framing, hold]: a scrub, or the eased flight it makes when the 3D arrives. */
function lastScrub(api: ReturnType<typeof fakeApi>): unknown[] | undefined {
  const scrubbed = api.scrub.mock.invocationCallOrder.at(-1) ?? -1;
  const flown = api.flyTo.mock.invocationCallOrder.at(-1) ?? -1;
  if (scrubbed > flown) return api.scrub.mock.calls.at(-1)?.slice(0, 2);
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

  it("fades the canvas into the page at its edges, with the overlay outside the fade (W14-M)", async () => {
    viewer.nextApi = fakeApi();
    const { stage } = mount();
    await scrollTo(0);
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

  it("lights every department for the guest's sample plan, while the stops stay the plan's (W18-A)", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    const { stage } = mount(vi.fn(), true);
    await settle();
    expect(api.setLit).toHaveBeenLastCalledWith(ALL_DEPARTMENTS);
    expect(stage.querySelectorAll("[data-callout]").length).toBe(0);  // no boxes yet in jsdom; the lit set is the claim
    expect(api.setLit).not.toHaveBeenCalledWith(STOPS);
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
    expect(lastScrub(api)).toEqual([keys()[1].framing, 0]); // block 2 still sways (W15-B2, W17-S)
    expect(stage.dataset.stop).toBe("overview");
    await scrollTo(arrival(1) + 10);
    expect(lastScrub(api)).toEqual([keys()[2].framing, 1]);
    expect(stage.dataset.stop).toBe("G04");
    await scrollTo(arrival(3) + 10);
    expect(stage.dataset.stop).toBe("G06");
  });

  it("spreads each zoom over most of a screen of scroll, so it reads as a move (W16-R's bar)", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(arrival(1) - window.innerHeight * 0.6); // into department 1's zoom
    expect(lastScrub(api)![0]).not.toEqual(keys()[1].framing);
  });

  it("makes faded words let go of the pointer, so the discs answer under them, at the close too (W16-R M1)", async () => {
    viewer.nextApi = fakeApi();
    const { stage } = mount();
    const root = stage.parentElement!.closest<HTMLElement>(".group\\/stage")!;
    await scrollTo(arrival(1)); // department 1: spine left, words right
    expect(root.hasAttribute("data-words-right-off")).toBe(false);
    expect(root.hasAttribute("data-words-left-off")).toBe(true);
    await scrollTo(arrival(2)); // department 2: spine right, words left
    expect(root.hasAttribute("data-words-right-off")).toBe(true);
    expect(root.hasAttribute("data-words-left-off")).toBe(false);
    await scrollTo(closeRest()); // the close: spine left, the left column's words gone
    expect(root.hasAttribute("data-words-left-off")).toBe(true);
    expect(root.hasAttribute("data-words-right-off")).toBe(false);
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

  it("lets a re-read with the stage where it was leave the arrival flight alone; a real scroll takes over (W18-C)", async () => {
    vi.stubGlobal("matchMedia", (query: string) =>
      ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(0);
    expect(api.flyTo).toHaveBeenCalledTimes(1);
    // The ResizeObserver's first call (or a late layout) re-reads the same key: a scrub there would end the flight.
    FakeResize.all.forEach((o) => o.resize(VIEW.width, VIEW.height));
    await scrollTo(0);
    expect(api.scrub).not.toHaveBeenCalled();
    await scrollTo(arrival(0));
    expect(api.scrub).toHaveBeenCalled();
  });

  it("cuts from keyframe to keyframe under reduced motion (§11.8)", async () => {
    const api = fakeApi(true);
    viewer.nextApi = api;
    mount();
    // W15-B4 M3: the cut comes as the travel starts (3/4 of a screen before department 1 reaches the line), not at
    // its end.
    const travel = window.innerHeight * 0.75;
    await scrollTo(arrival(1) - travel - 1);
    expect(lastScrub(api)).toEqual([keys()[1].framing, 0]);
    await scrollTo(arrival(1) - travel + 1);
    expect(lastScrub(api)).toEqual([keys()[2].framing, 1]);
  });

  it("reads only the scroll position per frame; the sections are measured again on a resize (W15-B4 L3)", async () => {
    // worker-2's trace: a getComputedStyle and every section's rect each frame, 600 forced style recalcs in 10 s.
    mount();
    await scrollTo(0);
    let reads = 0;
    view!.container.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => {
      const rect = el.getBoundingClientRect.bind(el);
      el.getBoundingClientRect = () => { reads += 1; return rect(); };
    });
    const styles = vi.spyOn(window, "getComputedStyle");
    await scrollTo(500);
    await scrollTo(1500);
    expect(reads).toBe(0);
    expect(styles).not.toHaveBeenCalled();
    act(() => { window.dispatchEvent(new Event("resize")); });
    await scrollTo(1600);
    expect(reads).toBeGreaterThan(0);
    styles.mockRestore();
  });

  it("puts a phone's legend in a row under the band, not over the spine, once the 3D is live (W15-B4 L1)", async () => {
    vi.stubGlobal("matchMedia", (query: string) =>
      ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
    viewer.nextApi = fakeApi();
    const { stage } = mount();
    await scrollTo(0);
    const legends = stage.querySelectorAll("[data-legend]");
    expect(legends).toHaveLength(1);
    expect(stage.querySelector("[data-stage-screen]")!.contains(legends[0])).toBe(false);
    expect(legends[0].textContent).toContain(copy("sp.legend.today"));
  });

  it("fades a phone's legend row out at a zoomed department stop, and back at the close (W17-S)", async () => {
    vi.stubGlobal("matchMedia", (query: string) =>
      ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
    viewer.nextApi = fakeApi();
    const { stage } = mount();
    const row = () => stage.querySelector<HTMLElement>("[data-legend]")!;
    await scrollTo(0);
    expect(stage.style.getPropertyValue("--zoomed-out")).toBe("1");
    expect(row().style.opacity).toBe("var(--zoomed-out, 1)");
    await scrollTo(3000); // a department, whatever the phone's reading line
    expect(stage.dataset.stop).not.toBe("overview");
    expect(stage.style.getPropertyValue("--zoomed-out")).toBe("0");
  });

  it("masks the moving still itself, on its own layer, while the 3D isn't live, and the canvas once it is (W15-B4 M5 + L2)", async () => {
    // worker-2 on SwiftShader: the still moved inside a masked box, so every frame of the travel repainted the masked
    // layer (frame gaps over 50 ms against 9be55e5), and its own edge showed as a hard seam.
    const { stage, still } = mount();
    const edges = stage.querySelector<HTMLElement>("[data-soft-edges]")!;
    await scrollTo(0);
    expect(edges.style.maskImage).toBe("");
    expect(still.style.maskImage).toContain("linear-gradient");
    expect(still.style.willChange).toBe("transform");
    view!.unmount();
    viewer.nextApi = fakeApi();
    const live = mount();
    await scrollTo(0);
    expect(live.stage.querySelector<HTMLElement>("[data-soft-edges]")!.style.maskImage).toContain("linear-gradient");
  });

  it("ends before the footer: a phone's band stops short of the plan's end, and the legend leaves with the stage (W15-B4)", async () => {
    // worker-4's W15-S LOW 3: at 100 % the legend sat over the footer's top with no spine on screen (desktop), and
    // the phone band rode over the footer's top edge.
    const { stage } = mount();
    const root = view!.container.firstElementChild as HTMLElement;
    expect(root.className).toContain("max-lg:pb-24");
    const end = 1000 + 1000 * (STOPS.length + 2); // the close's bottom, the plan's end
    root.getBoundingClientRect = () => ({ top: -pageY, bottom: end - pageY, height: end }) as DOMRect;
    act(() => { window.dispatchEvent(new Event("resize")); });
    const screen = stage.querySelector<HTMLElement>("[data-stage-screen]")!;
    await scrollTo(end - window.innerHeight);
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("1");
    await scrollTo(end - window.innerHeight * 0.6);
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("0");
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

  it("fades the hero's words out as the spine sets off left, and hides them once gone (W15-B3)", async () => {
    mount();
    const root = view!.container.firstElementChild as HTMLElement;
    await scrollTo(0);
    expect(root.style.getPropertyValue("--hero-words")).toBe("1");
    expect(root.hasAttribute("data-hero-hidden")).toBe(false);
    await scrollTo(arrival(0));
    expect(root.style.getPropertyValue("--hero-words")).toBe("0");
    expect(root.hasAttribute("data-hero-hidden")).toBe(true);
    expect(root.className).toContain("group/stage");
  });

  it("fades the hero's scroll cue as the visitor starts to scroll, and hides it once gone (W18-E N1)", async () => {
    mount();
    const root = view!.container.firstElementChild as HTMLElement;
    await scrollTo(0);
    expect(root.style.getPropertyValue("--scroll-cue")).toBe("1");
    expect(root.hasAttribute("data-cue-gone")).toBe(false);
    await scrollTo(200);
    expect(root.style.getPropertyValue("--scroll-cue")).toBe("0");
    expect(root.hasAttribute("data-cue-gone")).toBe(true);
    await scrollTo(0);
    expect(root.hasAttribute("data-cue-gone")).toBe(false);
  });

  it("keeps block 2's words faded out while the spine is still on their side, and shows them once it's left (W15-B3)", async () => {
    mount();
    const root = view!.container.firstElementChild as HTMLElement;
    await scrollTo(0);
    expect(root.style.getPropertyValue("--words-right")).toBe("0");
    await scrollTo(arrival(0));
    expect(root.style.getPropertyValue("--words-right")).toBe("1");
  });

  it("shows each department's words on the side the spine isn't on (W16-A, W17-S)", async () => {
    mount();
    const root = view!.container.firstElementChild as HTMLElement;
    const sides = () => [root.style.getPropertyValue("--words-left"), root.style.getPropertyValue("--words-right")];
    await scrollTo(arrival(1));
    expect(sides()).toEqual(["0", "1"]); // department 1: spine left, words right
    await scrollTo(arrival(2));
    expect(sides()).toEqual(["1", "0"]); // department 2: spine right, words left
    await scrollTo(arrival(3));
    expect(sides()).toEqual(["0", "1"]);
  });

  it("records the scroll position it last framed, so a test can wait for a slow GPU's frame to catch up (W15-B3)", async () => {
    const { stage } = mount();
    await scrollTo(arrival(0));
    expect(stage.dataset.scrolled).toBe(String(Math.round(arrival(0))));
  });

  it("tells the overlay where the spine stands, for the legend to follow it (W15-B2)", async () => {
    const { stage } = mount();
    const screen = stage.querySelector<HTMLElement>("[data-stage-screen]")!;
    await scrollTo(0);
    expect(screen.style.getPropertyValue("--spine-across")).toBe(String(ACROSS.desktop.hero));
    await scrollTo(arrival(1));
    expect(screen.style.getPropertyValue("--spine-across")).toBe(String(ACROSS.desktop.left));
    await scrollTo(arrival(2));
    expect(screen.style.getPropertyValue("--spine-across")).toBe(String(ACROSS.desktop.right));
  });

  it("hides the legend while the spine travels and at a zoomed stop, and shows it under the whole spine (W15-B4 M1, W17-S)", async () => {
    const { stage } = mount();
    const screen = stage.querySelector<HTMLElement>("[data-stage-screen]")!;
    await scrollTo(0);
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("1");
    await scrollTo(arrival(0) - window.innerHeight / 4); // halfway through the travel to block 2
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("0");
    await scrollTo(arrival(0)); // block 2: the whole spine on the left, its legend back under it
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("1");
    await scrollTo(arrival(1)); // a department: zoomed in on its disc
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("0");
    await scrollTo(closeRest());
    expect(screen.style.getPropertyValue("--legend-shown")).toBe("1");
  });

  it("asks the viewer for no close-up: the big spine is the only model (W17-S)", () => {
    mount();
    expect(viewer.closeup).toBeUndefined();
  });

  it("turns the spine a little at each department stop, by its side, and back to none at the close (W17-S)", async () => {
    const api = fakeApi();
    viewer.nextApi = api;
    mount();
    await scrollTo(0);
    expect(api.setPose).toHaveBeenLastCalledWith({ turn: 0 });
    await scrollTo(arrival(0));
    expect(api.setPose).toHaveBeenLastCalledWith({ turn: 0 });
    await scrollTo(arrival(1));
    expect(api.setPose).toHaveBeenLastCalledWith({ turn: keys()[2].turn });
    await scrollTo(arrival(2));
    expect(api.setPose).toHaveBeenLastCalledWith({ turn: keys()[3].turn });
    expect(keys()[3].turn).not.toBe(keys()[2].turn);
    await scrollTo(closeRest());
    expect(api.setPose).toHaveBeenLastCalledWith({ turn: 0 });
  });

  it("hides the whole spine's buttons, callouts and panels at a zoomed department stop (W17-S)", async () => {
    viewer.nextApi = fakeApi();
    const { stage } = mount();
    const overlay = () => stage.querySelector<HTMLElement>("[data-overlay]")!;
    await scrollTo(0);
    expect(overlay().style.visibility).toBe("");
    await scrollTo(arrival(0));
    expect(overlay().style.visibility).toBe("");
    await scrollTo(arrival(1));
    expect(overlay().style.visibility).toBe("hidden");
    await scrollTo(closeRest());
    expect(overlay().style.visibility).toBe("");
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
