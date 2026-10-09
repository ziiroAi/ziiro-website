// @vitest-environment jsdom
import { createRef, type ReactNode } from "react";
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

function renderHero(onBook = vi.fn(), headingRef = createRef<HTMLHeadingElement>(), onProgress = vi.fn(), stage?: ReactNode) {
  screen = render(
    <Hero heroText={heroText} name="Ananya" email="ananya@studio.in" headingRef={headingRef} onBook={onBook} onProgress={onProgress} stage={stage} />,
  );
  return screen;
}

describe("Hero (§6.2 block 1)", () => {
  it("puts the plan's stage between the words and the stats, so a phone reads the words first (D34, W15-B)", () => {
    const { container } = renderHero(vi.fn(), createRef<HTMLHeadingElement>(), vi.fn(), <div data-testid="stage-slot" />);
    const order = [...container.querySelectorAll("h1, [data-testid=stage-slot], ul")].map((el) => el.tagName);
    expect(order).toEqual(["H1", "DIV", "UL"]);
  });

  it("sits over the stage from 1024 px: the words in the left 55 %, and only they take the pointer (W15-B)", () => {
    const { container } = renderHero();
    const section = container.querySelector("section")!;
    expect(section.className).toContain("lg:z-10");
    expect(section.className).toContain("lg:pointer-events-none");
    const words = container.querySelector("h1")!.parentElement!;
    expect(words.className).toContain("lg:w-[55%]");
    expect(words.className).toContain("lg:pointer-events-auto");
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
});
