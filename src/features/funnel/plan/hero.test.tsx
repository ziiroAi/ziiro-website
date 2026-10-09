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
  it("puts the stats directly under the buttons, in the words' column, and the plan's stage after them (W16-H)", () => {
    // The owner's reference (w16/owner/owner-11-hero-reference.png): the stats row sits under the CTAs, not at the
    // bottom of the screen. A phone reads the words and the stats first, then the band (D34).
    const { container } = renderHero(vi.fn(), createRef<HTMLHeadingElement>(), vi.fn(), <div data-testid="stage-slot" />);
    const order = [...container.querySelectorAll("h1, a, [data-hero-stats], [data-testid=stage-slot]")].map((el) => el.tagName);
    expect(order).toEqual(["H1", "A", "UL", "DIV"]);
    const words = container.querySelector("h1")!.parentElement!;
    expect(words.contains(container.querySelector("[data-hero-stats]"))).toBe(true);
    expect(container.querySelector("[data-hero-stats]")!.previousElementSibling!.contains(container.querySelector("a"))).toBe(true);
  });

  it("ends with a scroll cue at the bottom right of the hero from 1024 px, in our words, fading with them (W16-H)", () => {
    const { container } = renderHero();
    const cue = container.querySelector<HTMLElement>("[data-scroll-cue]")!;
    expect(cue.closest("section")).toBe(container.querySelector("section"));
    expect(cue.className).toContain("lg:absolute");
    // At the screen's bottom, not the section's (it ends a nav height short): mid-height it met the lowest callout.
    expect(cue.className).toContain("lg:bottom-[calc(1.5rem-var(--nav-h,84px))]");
    expect(cue.className).toContain("lg:right-10");
    expect(textOf(cue)).toContain(copy("hx.scroll"));
    expect(textOf(cue)).toContain(copy("ph.hx.scroll"));
    expect(cue.querySelector("[aria-hidden=true]")).not.toBeNull(); // the mouse icon says nothing to a screen reader
  });

  it("lets the stage fade the scroll cue out on the first scroll, on every width, and hide it once gone (W18-E N1)", () => {
    const cue = renderHero().container.querySelector<HTMLElement>("[data-scroll-cue]")!;
    expect(cue.className).toContain("opacity-[var(--scroll-cue,1)]");
    expect(cue.className).toContain("group-data-[cue-gone]/stage:invisible");
  });

  it("keeps a hold under the hero from 1024 px, so block 2 starts over a screen down and the stage holds the hero first (W16-H)", () => {
    // PlanStage starts the hero's travel a screen above block 2 (line + travel = 100vh): with the stats moved up into
    // the hero, block 2 came within a screen and reduced motion cut to the close-up at scroll 0. This keeps the
    // ~190 px the old stats row and scroll line gave.
    const { container } = renderHero(vi.fn(), createRef<HTMLHeadingElement>(), vi.fn(), <div data-testid="stage-slot" />);
    const hold = container.querySelector<HTMLElement>("[data-hero-hold]")!;
    expect(hold.previousElementSibling).toBe(container.querySelector("section"));
    expect(hold.getAttribute("aria-hidden")).toBe("true");
    expect(hold.className.split(" ")).toEqual(expect.arrayContaining(["hidden", "lg:block", "lg:h-48"]));
  });

  it("for a visitor from S1b: the sample note first in the words' column, above the eyebrow, and the cue says explore (W17-B)", () => {
    screen = render(
      <Hero heroText={heroText} name="" email="" headingRef={createRef<HTMLHeadingElement>()} onBook={vi.fn()} onProgress={vi.fn()} guest />,
    );
    const words = screen.container.querySelector("h1")!.parentElement!;
    const note = screen.container.querySelector("[data-guest-note]")!;
    expect(note.parentElement).toBe(words);
    expect(words.firstElementChild).toBe(note);
    expect(textOf(note)).toBe(copy("sp.guest.note"));
    expect(textOf(screen.container.querySelector("[data-scroll-cue]"))).toContain(copy("hx.scroll.guest"));
    expect(textOf(screen.container.querySelector("[data-scroll-cue]"))).not.toContain(copy("hx.scroll"));
  });

  it("shows no sample note and keeps hx.scroll for a visitor who answered the questions (W17-B)", () => {
    const { container } = renderHero();
    expect(container.querySelector("[data-guest-note]")).toBeNull();
    expect(textOf(container.querySelector("[data-scroll-cue]"))).toContain(copy("hx.scroll"));
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

  it("fades its words, stats and cue with the stage's --hero-words, and hides them once gone, from 1024 px (W15-B3)", () => {
    const { container } = renderHero();
    const section = container.querySelector("section")!;
    expect(section.contains(container.querySelector("[data-hero-stats]"))).toBe(true);
    expect(section.className).toContain("lg:opacity-[var(--hero-words,1)]");
    expect(section.className).toContain("lg:group-data-[hero-hidden]/stage:invisible");
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
    const button = Array.from(container.querySelectorAll("button")).find((b) => textOf(b).startsWith(copy("hx.btn2")));
    click(button ?? null);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("shows the three stats, with the phone's own label for the second", () => {
    const { container } = renderHero();
    const stats = textOf(container.querySelector("[data-hero-stats]"));
    for (const id of ["hx.stat1.n", "hx.stat1.l", "hx.stat2.n", "hx.stat2.l", "ph.hx.stat2.l", "hx.stat3.n", "hx.stat3.l"]) {
      expect(stats).toContain(copy(id));
    }
  });
});
