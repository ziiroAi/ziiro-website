// @vitest-environment jsdom
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, copy } from "../data";
import { FILM_READY, Hero } from "./Hero";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

vi.mock("../../home/sections/BrandFilm", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("video") };
});

const heroText = { desktop: copy("hx.p", { name: "Ananya" }), phone: copy("ph.hx.p", { name: "Ananya" }) };
let screen: Rendered | null = null;
let allowNavigation: () => void = () => undefined;
beforeEach(() => {
  allowNavigation = stopNavigation();
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  allowNavigation();
});

function renderHero(onBook = vi.fn(), headingRef = createRef<HTMLHeadingElement>(), onProgress = vi.fn()) {
  screen = render(
    <Hero heroText={heroText} name="Ananya" email="ananya@studio.in" headingRef={headingRef} onBook={onBook} onProgress={onProgress} />,
  );
  return screen;
}

describe("Hero (§6.2 block 1)", () => {
  it("records plan_view as the still, and why, when the live spine can't run (§9): here, no WebGL2", () => {
    const onProgress = vi.fn();
    renderHero(vi.fn(), createRef<HTMLHeadingElement>(), onProgress);
    expect(onProgress).toHaveBeenCalledWith({ planView: "still", stillReason: "unsupported" });
  });

  it("paints the r17 still inside the live spine viewer, which replaces it once its first frame is drawn (W14-C)", () => {
    const { container } = renderHero();
    const still = container.querySelector("[data-testid=spine-viewer] [data-testid=spine-still] picture img");
    expect(still).not.toBeNull();
    expect(container.querySelector("[data-testid=spine-viewer]")?.getAttribute("data-spine")).not.toBe("live");
  });


  it("shows the eyebrow, both title lines, and their words with the name", () => {
    const { container } = renderHero();
    expect(textOf(container.querySelector("h1"))).toBe(`${copy("hx.h1")} ${copy("hx.h2")}`);
    expect(textOf(container)).toContain(copy("hx.eyebrow"));
    expect(textOf(container)).toContain(heroText.desktop);
    expect(textOf(container)).toContain(heroText.phone);
  });

  it("gives the page its h1, focusable from code", () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const { container } = renderHero(vi.fn(), headingRef);
    expect(headingRef.current).toBe(container.querySelector("h1"));
    expect(headingRef.current?.tabIndex).toBe(-1);
  });

  it("books a call from the hero, with their name and email", () => {
    const onBook = vi.fn();
    const { container } = renderHero(onBook);
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(calendlyUrl("Ananya", "ananya@studio.in"));
    expect(textOf(link)).toBe(`${copy("hx.btn1")}↗`);
    click(link);
    expect(onBook).toHaveBeenCalledWith("hero");
  });

  it("opens the film from hx.btn2", () => {
    expect(FILM_READY).toBe(true);
    const { container } = renderHero();
    const button = Array.from(container.querySelectorAll("button")).find((b) => textOf(b) === copy("hx.btn2"));
    click(button ?? null);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("shows the three stats, with the phone's own label for the second", () => {
    const { container } = renderHero();
    const stats = textOf(container.querySelector("ul"));
    for (const id of ["hx.stat1.n", "hx.stat1.l", "hx.stat2.n", "hx.stat2.l", "ph.hx.stat2.l", "hx.stat3.n", "hx.stat3.l"]) {
      expect(stats).toContain(copy(id));
    }
  });

  it("fades the spine's last 15 % into the page, still or live, and sets the stats on the page colour, so no edge shows", () => {
    const { container } = renderHero();
    expect(container.querySelector("[data-testid=spine-viewer]")?.className).toContain("[mask-image:linear-gradient(to_bottom,#000_85%,transparent)]");
    expect(container.querySelector("ul")?.className).toContain("bg-[color:var(--funnel-bg)]");
  });

  it("fades the phone band's first 12 % in from the page too, keeping the bottom fade", () => {
    const { container } = renderHero();
    expect(container.querySelector("[data-testid=spine-viewer]")?.className).toContain(
      "max-[599px]:[mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_85%,transparent)]",
    );
  });

  it("keeps the callouts out of the accessibility tree, since the stats say the same", () => {
    const { container } = renderHero();
    const hidden = Array.from(container.querySelectorAll('[aria-hidden="true"]')).map(textOf).join(" ");
    for (const id of ["hx.call1.n", "hx.call1.l", "hx.call2.n", "hx.call2.l"]) {
      expect(hidden).toContain(copy(id));
    }
  });
});
