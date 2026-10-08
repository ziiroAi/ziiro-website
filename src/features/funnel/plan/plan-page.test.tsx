// @vitest-environment jsdom
import { act } from "react";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, composePlan, copy } from "../data";
import type { PlanPageProps } from "../data/contract";
import { PlanPage } from "./PlanPage";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

vi.mock("../../home/sections/BrandFilm", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("video") };
});

/** jsdom has no IntersectionObserver. This one lets a test say which block came into view. */
class FakeObserver {
  static last: FakeObserver | null = null;
  readonly targets: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    FakeObserver.last = this;
  }
  observe(el: Element): void {
    this.targets.push(el);
  }
  disconnect(): void {
    this.targets.length = 0;
  }
  show(depth: number): void {
    const target = this.targets.find((t) => (t as HTMLElement).dataset.depth === String(depth));
    if (!target) throw new Error(`no block at depth ${depth}`);
    act(() => this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver));
  }
}

async function waitFor(check: () => boolean, ms = 1_000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error("waitFor: timed out");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
}

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";
const plan = composePlan({ teamBand: "6_20", revenueBand: "band_3", currency: "INR", chips: [], problemText: ANANYA_WORDS });
const visitor = { name: "Ananya", email: "ananya@studio.in" };

let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
let onProgress = vi.fn();

function renderPage(over: Partial<PlanPageProps> = {}): Rendered {
  screen = render(
    <HelmetProvider>
      <PlanPage plan={plan} visitor={visitor} words={{ problemText: ANANYA_WORDS, chips: [] }} saveNotice={null} onProgress={onProgress} {...over} />
    </HelmetProvider>,
  );
  return screen;
}

beforeEach(() => {
  onProgress = vi.fn();
  allowNavigation = stopNavigation();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlanPage (§6)", () => {
  it("draws Ananya's plan: the hero, then blocks at plan_depth 0 to 5", () => {
    const { container } = renderPage();
    expect(textOf(container.querySelector("h1"))).toBe(`${copy("hx.h1")} ${copy("hx.h2")}`);
    expect(Array.from(container.querySelectorAll<HTMLElement>("[data-depth]")).map((el) => el.dataset.depth)).toEqual([
      "0", "1", "2", "3", "4", "5",
    ]);
  });

  it("starts at the top, with focus on the h1", () => {
    const { container } = renderPage();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(container.querySelector("h1"));
  });

  it("sets the tab title to seo.plan.title (§6.1)", async () => {
    renderPage();
    await waitFor(() => document.title === `${copy("seo.plan.title")} | Ziiro AI`);
    expect(document.title).toBe("Your plan | Ziiro AI");
  });

  it("puts the save notice above everything else (§10)", () => {
    const { container } = renderPage({ saveNotice: "unsure" });
    const alert = container.querySelector('[role="alert"]');
    const h1 = container.querySelector("h1");
    expect(textOf(alert)).toBe(copy("sp.save.unsure"));
    expect(alert && h1 ? alert.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING : 0).toBeTruthy();
  });

  it("reports the furthest block reached, and only when it's further (§9 plan_depth)", () => {
    renderPage();
    FakeObserver.last?.show(0);
    FakeObserver.last?.show(2);
    FakeObserver.last?.show(1);
    FakeObserver.last?.show(5);
    expect(onProgress.mock.calls.map(([fields]) => fields)).toEqual([{ planDepth: 0 }, { planDepth: 2 }, { planDepth: 5 }]);
  });

  it("reports which Book a call was tapped (§9 cta_from)", () => {
    const { container } = renderPage();
    const links = Array.from(container.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      calendlyUrl(visitor.name, visitor.email), calendlyUrl(visitor.name, visitor.email),
    ]);
    links.forEach((a) => click(a));
    expect(onProgress.mock.calls.map(([fields]) => fields)).toEqual([
      { ctaFrom: "hero", ctaClicked: true }, { ctaFrom: "close", ctaClicked: true },
    ]);
  });

  it("shows no price anywhere on the plan (§6.3, Appendix A)", () => {
    const { container } = renderPage();
    expect(textOf(container)).not.toMatch(/₹|\$\d/);
  });
});
