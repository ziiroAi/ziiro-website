// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, copy } from "../data";
import { BookCallLink } from "./BookCallLink";
import { SaveBanner } from "./SaveBanner";
import { DESKTOP_ONLY, PHONE_ONLY, Swap } from "./Swap";
import { click, render, stopNavigation, textOf, type Rendered } from "./test-utils";

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

describe("Swap (§6.4)", () => {
  it("renders one element when both lines are the same", () => {
    screen = render(<Swap lines={{ desktop: "Scroll", phone: "Scroll" }} />);
    expect(screen.container.querySelectorAll("span")).toHaveLength(1);
  });

  it("renders both lines, each hidden by CSS on the other side of 600 px", () => {
    screen = render(<Swap lines={{ desktop: "Part 1 of 4", phone: "1/4 · Deals" }} />);
    const [desktop, phone] = Array.from(screen.container.querySelectorAll("span"));
    expect([desktop.textContent, desktop.className]).toEqual(["Part 1 of 4", DESKTOP_ONLY]);
    expect([phone.textContent, phone.className]).toEqual(["1/4 · Deals", PHONE_ONLY]);
  });

  it("renders the element it's asked for, with its class", () => {
    screen = render(<Swap as="h2" className="text-xl" lines={{ desktop: "a", phone: "b" }} />);
    expect(Array.from(screen.container.querySelectorAll("h2")).map((h) => h.className)).toEqual([
      `text-xl ${DESKTOP_ONLY}`, `text-xl ${PHONE_ONLY}`,
    ]);
  });
});

describe("BookCallLink (§6.3)", () => {
  it("opens Calendly in a new tab, with their name and email", () => {
    screen = render(<BookCallLink name="Ananya Rao" email="ananya@studio.in" from="hero" onBook={() => undefined}>{copy("hx.btn1")}</BookCallLink>);
    const link = screen.container.querySelector("a");
    expect([link?.getAttribute("href"), link?.target, link?.rel, textOf(link)]).toEqual([
      calendlyUrl("Ananya Rao", "ananya@studio.in"), "_blank", "noopener noreferrer", "Book a call",
    ]);
  });

  it("reports where the tap came from", () => {
    const onBook = vi.fn();
    screen = render(<BookCallLink name="A" email="a@b.co" from="close" onBook={onBook}>{copy("cta.btn")}</BookCallLink>);
    click(screen.container.querySelector("a"));
    expect(onBook).toHaveBeenCalledTimes(1);
    expect(onBook).toHaveBeenCalledWith("close");
  });
});

describe("SaveBanner (§10)", () => {
  it("shows nothing when the save went through", () => {
    screen = render(<SaveBanner notice={null} />);
    expect(screen.container.innerHTML).toBe("");
  });

  it("shows sp.save.fail or sp.save.unsure as an alert", () => {
    screen = render(<SaveBanner notice="fail" />);
    expect(textOf(screen.container.querySelector('[role="alert"]'))).toBe(copy("sp.save.fail"));
    screen.rerender(<SaveBanner notice="unsure" />);
    expect(textOf(screen.container.querySelector('[role="alert"]'))).toBe(copy("sp.save.unsure"));
  });
});
