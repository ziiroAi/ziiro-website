// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { composePlan, copy, departments } from "../../data";
import type { DiscId } from "../../data/contract";
import { render, textOf, type Rendered } from "../../plan/test-utils";
import type { DiscBox, DiscPickEvent, SpineViewerApi } from "../api";
import { SpineOverlay } from "./SpineOverlay";
import { calloutsFor, LEGEND_STRIP_PX } from "./tour";

/** Ananya (§5.8): Deals, Sales, Marketing and Back Office lit. */
const ANANYA = composePlan({
  teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [],
  problemText: "Enquiries come in, but by the time someone calls back they've gone cold.",
});
const VIEW = { width: 1440, height: 810 };
const DISCS: DiscId[] = ["G00", "G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08"];
/** Discs stacked bottom (G00) to top (G08), each 120 × 40, anchor on the right end. */
const BOXES: DiscBox[] = DISCS.map((disc, i) => {
  const top = 700 - i * 80;
  return { disc, left: 900, top, width: 120, height: 40, anchor: { x: 1020, y: top + 8 }, onScreen: true };
});

function fakeApi() {
  let boxListener: ((boxes: readonly DiscBox[]) => void) | null = null;
  let pickListener: ((event: DiscPickEvent) => void) | null = null;
  const api: SpineViewerApi = {
    flyTo: vi.fn(() => Promise.resolve()),
    scrub: vi.fn(),
    setPose: vi.fn(),
    setLit: vi.fn(),
    onDiscBoxes: (l) => { boxListener = l; return () => { boxListener = null; }; },
    onDiscPick: (l) => { pickListener = l; return () => { pickListener = null; }; },
    pick: vi.fn(() => Promise.resolve(null)),
    boxes: () => BOXES,
    reducedMotion: false,
  };
  const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
  return {
    api,
    async emitBoxes(boxes: readonly DiscBox[]) {
      await act(async () => { boxListener?.(boxes); await frame(); });
    },
    pick(event: DiscPickEvent) {
      act(() => pickListener?.(event));
    },
    get listening() { return boxListener !== null && pickListener !== null; },
  };
}

const ananyaDepartments = ["deals", "sales", "marketing", "back-office"] as const;
const callouts = calloutsFor(ananyaDepartments, ANANYA.agentIds);

let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
});

function mount(api: SpineViewerApi | null, variant: "desktop" | "phone" = "desktop", clearRight?: number, spineSide?: "left" | "right") {
  view = render(<SpineOverlay api={api} callouts={callouts} planAgentIds={ANANYA.agentIds} variant={variant} view={VIEW} clearRight={clearRight} spineSide={spineSide} />);
  return view.container;
}

const escape = () =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  });

describe("calloutsFor: §6.7's callout for each lit disc, in plan order", () => {
  it("gives Ananya's Deals disc its heading and three names", () => {
    expect(callouts.map((c) => c.disc)).toEqual(["G04", "G05", "G06", "G01"]);
    expect(callouts[0].head).toBe("Deals · 3 of 5");
    expect(callouts[0].lines.map((l) => l.replace(/^\d+\. /, ""))).toEqual(["Enquiry responder", "Reply sorter", "Call companion"]);
  });
});

describe("SpineOverlay: keyboard buttons over the discs (§6.2 'Opening a disc')", () => {
  it("lays one button per department disc, in spine order from the top, each named with sp.disc.aria", () => {
    const container = mount(fakeApi().api);
    const buttons = [...container.querySelectorAll<HTMLButtonElement>("button[data-disc]")];
    expect(buttons.map((b) => b.dataset.disc)).toEqual(["G07", "G06", "G05", "G04", "G03", "G02", "G01"]);
    const deals = departments.find((d) => d.id === "deals")!;
    expect(buttons[3].getAttribute("aria-label")).toBe(copy("sp.disc.aria", { Department: deals.name, k: 3, m: deals.agentIds.length }));
    const intel = departments.find((d) => d.id === "intelligence")!;
    expect(buttons[0].getAttribute("aria-label")).toBe(copy("sp.disc.aria.none", { Department: intel.name }));
  });

  it("puts each button over its disc's hit area, padded to 44 px on desktop", () => {
    const container = mount(fakeApi().api);
    const g04 = container.querySelector<HTMLButtonElement>('button[data-disc="G04"]')!;
    expect(g04.style.left).toBe("900px");
    expect(g04.style.top).toBe(`${700 - 4 * 80 - 2}px`);
    expect(g04.style.height).toBe("44px");
  });

  it("leaves pointer input to the canvas, so a drag on a disc still turns the spine", () => {
    const container = mount(fakeApi().api);
    expect(container.querySelector('button[data-disc="G04"]')!.className).toContain("pointer-events-none");
  });

  it("opens the panel on focus without taking focus, and Enter moves focus into it", () => {
    const container = mount(fakeApi().api);
    const g01 = container.querySelector<HTMLButtonElement>('button[data-disc="G01"]')!;
    act(() => g01.focus());
    const panel = () => container.querySelector<HTMLElement>("[role=dialog]");
    expect(panel()?.dataset.disc).toBe("G01");
    expect(document.activeElement).toBe(g01);
    act(() => g01.click());
    expect(document.activeElement).toBe(panel());
  });

  it("closes on Escape and puts focus back on the disc's button", () => {
    const container = mount(fakeApi().api);
    const g04 = container.querySelector<HTMLButtonElement>('button[data-disc="G04"]')!;
    act(() => g04.focus());
    act(() => g04.click());
    escape();
    expect(container.querySelector("[role=dialog]")).toBeNull();
    expect(document.activeElement).toBe(g04);
  });

  it("renders nothing until the 3D is live (the still has no panels)", () => {
    const container = mount(null);
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });
});

describe("SpineOverlay: the disc panel docks on the spine's side (W15-B4 H1)", () => {
  // worker-2: at the hero the panel opened bottom-left, under the hero's words; its buttons and stats printed over it.
  const panelBox = (container: HTMLElement) => container.querySelector<HTMLElement>("[role=dialog]")!.parentElement!.className;

  it("opens on the right while the spine stands right (the hero), clear of the words on the left", () => {
    const fake = fakeApi();
    const container = mount(fake.api, "desktop", 0, "right");
    fake.pick({ disc: "G04", via: "tap", box: BOXES[3] });
    expect(panelBox(container)).toMatch(/(^| )right-4( |$)/);
    expect(panelBox(container)).not.toMatch(/(^| )left-4( |$)/);
  });

  it("opens on the left while the spine stands left (the stops), clear of the text column", () => {
    const fake = fakeApi();
    const container = mount(fake.api, "desktop", 0, "left");
    fake.pick({ disc: "G04", via: "tap", box: BOXES[3] });
    expect(panelBox(container)).toMatch(/(^| )left-4( |$)/);
  });
});

describe("SpineOverlay: picks from the canvas (onDiscPick)", () => {
  it("opens the tapped disc's panel and gives it focus", () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    fake.pick({ disc: "G05", via: "tap", box: BOXES[5] });
    const panel = container.querySelector<HTMLElement>("[role=dialog]")!;
    expect(panel.dataset.disc).toBe("G05");
    expect(document.activeElement).toBe(panel);
  });

  it("opens on hover and closes when the hover leaves every disc", () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    fake.pick({ disc: "G06", via: "hover", box: BOXES[6] });
    expect(container.querySelector<HTMLElement>("[role=dialog]")?.dataset.disc).toBe("G06");
    fake.pick({ disc: null, via: "hover", box: null });
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  it("keeps a tapped panel open when a hover leaves", () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    fake.pick({ disc: "G05", via: "tap", box: BOXES[5] });
    fake.pick({ disc: null, via: "hover", box: null });
    expect(container.querySelector("[role=dialog]")).not.toBeNull();
  });

  it("ignores a pick on an end disc", () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    fake.pick({ disc: "G08", via: "tap", box: BOXES[8] });
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });
});

describe("SpineOverlay: pinned callouts from onDiscBoxes (§6.7)", () => {
  it("pins Ananya's four callouts to their discs, with the Deals names", async () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    await fake.emitBoxes(BOXES);
    const labels = [...container.querySelectorAll<HTMLElement>("[data-callout]")];
    expect(labels.map((l) => l.dataset.callout)).toEqual(["G04", "G05", "G06", "G01"]);
    expect(textOf(labels[0])).toContain("Deals · 3 of 5");
    expect(textOf(labels[0])).toContain("Enquiry responder");
    expect(container.querySelectorAll("svg line")).toHaveLength(4);
  });

  it("moves a callout with its disc on the next frame", async () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    await fake.emitBoxes(BOXES);
    const before = container.querySelector<HTMLElement>('[data-callout="G04"]')!.style.top;
    await fake.emitBoxes(BOXES.map((b) => ({ ...b, top: b.top - 30, anchor: { x: b.anchor.x, y: b.anchor.y - 30 } })));
    expect(container.querySelector<HTMLElement>('[data-callout="G04"]')!.style.top).not.toBe(before);
  });

  it("gives the stop in view the first claim on space, so its callout wins a clash (W14-M)", async () => {
    const fake = fakeApi();
    view = render(<SpineOverlay api={fake.api} callouts={callouts} planAgentIds={ANANYA.agentIds} variant="desktop" view={VIEW} focus="G05" />);
    await fake.emitBoxes(BOXES);
    expect([...view.container.querySelectorAll<HTMLElement>("[data-callout]")].map((l) => l.dataset.callout)[0]).toBe("G05");
  });

  it("drops the callout of a disc that leaves the screen", async () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    await fake.emitBoxes(BOXES.map((b) => (b.disc === "G06" ? { ...b, onScreen: false } : b)));
    expect(container.querySelector('[data-callout="G06"]')).toBeNull();
    expect(container.querySelector('[data-callout="G04"]')).not.toBeNull();
  });

  it("stops listening when it unmounts", () => {
    const fake = fakeApi();
    mount(fake.api);
    expect(fake.listening).toBe(true);
    view!.unmount();
    view = null;
    expect(fake.listening).toBe(false);
  });
});

describe("SpineOverlay: the lit and quiet legend", () => {
  it("keeps callouts out of the legend's strip at the bottom of the stage", async () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    const low = BOXES.map((b) => (b.disc === "G01" ? { ...b, top: VIEW.height - 30, anchor: { x: b.anchor.x, y: VIEW.height - 25 } } : b));
    await fake.emitBoxes(low);
    expect(container.querySelector('[data-callout="G01"]')).toBeNull();
    for (const label of container.querySelectorAll<HTMLElement>("[data-callout]")) {
      expect(parseFloat(label.style.top) + parseFloat(label.style.height)).toBeLessThanOrEqual(VIEW.height - LEGEND_STRIP_PX.desktop);
    }
  });

  it("keeps every callout out of the band the plan's text column covers on the right (W15-B2)", async () => {
    const fake = fakeApi();
    const left = BOXES.map((b) => ({ ...b, left: b.left - 700, anchor: { x: b.anchor.x - 700, y: b.anchor.y } }));
    // The band starts 40 px right of the spine: too tight for a label on that side.
    const clear = VIEW.width - Math.max(...left.map((b) => b.left + b.width)) - 40;
    const container = mount(fake.api, "desktop", clear);
    await fake.emitBoxes(left);
    for (const label of container.querySelectorAll<HTMLElement>("[data-callout]")) {
      expect(parseFloat(label.style.left) + parseFloat(label.style.width)).toBeLessThanOrEqual(VIEW.width - clear);
    }
  });

  it("still shows the callouts beside the spine when the band leaves them room, as the plan's left spine does", async () => {
    const fake = fakeApi();
    const left = BOXES.map((b) => ({ ...b, left: b.left - 700, anchor: { x: b.anchor.x - 700, y: b.anchor.y } }));
    const clear = Math.round(VIEW.width * 0.46) + 16;
    const container = mount(fake.api, "desktop", clear);
    await fake.emitBoxes(left);
    const shown = [...container.querySelectorAll<HTMLElement>("[data-callout]")];
    expect(shown.length).toBeGreaterThan(0);
    for (const label of shown) {
      expect(parseFloat(label.style.left) + parseFloat(label.style.width)).toBeLessThanOrEqual(VIEW.width - clear);
    }
  });

  it("stands under the spine, following it across the stage, so it never sits on the text column (W15-B2)", () => {
    const legend = mount(fakeApi().api).querySelector<HTMLElement>("[data-legend]")!;
    expect(legend.style.left).toContain("var(--spine-across, 1)");
    expect(legend.style.transform).toContain("var(--spine-across, 1)");
    // W15-B4 M1: PlanStage hides it while the spine travels past block 2's rising words.
    expect(legend.style.opacity).toBe("var(--legend-shown, 1)");
    expect(legend.className).not.toContain("right-3");
  });

  it("puts the hover hint in the legend's box, not over the callouts", () => {
    const container = mount(fakeApi().api);
    expect(textOf(container.querySelector("[data-legend]"))).toContain(copy("sp.hint.hover"));
  });

  it("names both states in words, never colour alone (§11.10)", () => {
    const container = mount(fakeApi().api);
    const legend = container.querySelector("[data-legend]")!;
    expect(textOf(legend)).toContain(copy("sp.legend.today"));
    expect(textOf(legend)).toContain(copy("sp.legend.later"));
  });

  it("lays no legend over a phone's spine: PlanStage puts it under the band (W15-B4 L1)", () => {
    // worker-2: on a 390 px phone the legend wrapped to four lines over the lower vertebrae.
    expect(mount(fakeApi().api, "phone").querySelector("[data-legend]")).toBeNull();
  });

  it("shows the hover hint on desktop until the first panel opens, and never on a phone", () => {
    const fake = fakeApi();
    const container = mount(fake.api);
    expect(textOf(container)).toContain(copy("sp.hint.hover"));
    fake.pick({ disc: "G05", via: "hover", box: BOXES[5] });
    fake.pick({ disc: null, via: "hover", box: null });
    expect(textOf(container)).not.toContain(copy("sp.hint.hover"));
    view!.unmount();
    expect(textOf(mount(fakeApi().api, "phone"))).not.toContain(copy("sp.hint.hover"));
  });
});
