// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "../FunnelRoot";
import { advance, button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));

let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");

beforeEach(() => {
  stubBrowser();
  stubClock();
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S2 (§4.3)", () => {
  it("asks its question with its hint and 12 types, on step 2 of 6", () => {
    tap(button(root(), "I run a business"));
    expect(root().querySelector("h2")?.textContent).toBe("What kind of business?");
    expect(root().querySelector(".f-hint")?.textContent).toBe("Pick the closest one.");
    expect(root().querySelectorAll(".f-tile")).toHaveLength(12);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(2);
  });

  it("preselects the agency type after s1.o2, and still waits for a tap", () => {
    tap(button(root(), "I run an agency"));
    expect(button(root(), "Marketing or creative agency")?.classList.contains("is-selected")).toBe(true);
    expect(screenNow()).toBe("s2");
    tap(button(root(), "Marketing or creative agency"));
    expect(screenNow()).toBe("s34");
  });

  it("opens a box for Other that stops at 80 characters, and its button moves on", () => {
    tapThrough(root(), "I run a business", "Other");
    expect(screenNow()).toBe("s2");
    expect(button(root(), "Other")?.getAttribute("aria-expanded")).toBe("true");
    const box = root().querySelector<HTMLInputElement>("#f-s2-other-text");
    expect(box?.maxLength).toBe(80);
    typeInto(box, "Printing press");
    expect(box?.value).toBe("Printing press");
    tap(button(root(), "That's it"));
    expect(screenNow()).toBe("s34");
  });

  it("ignores the second tap of a double tap, which lands on S3 + S4 (Review Focus 2)", () => {
    tapThrough(root(), "I run a business", "Interior design / architecture");
    advance(120);
    click(button(root(), "Less than a year"));
    expect(button(root(), "Less than a year")?.getAttribute("aria-pressed")).toBe("false");
    advance(400);
    click(button(root(), "Less than a year"));
    expect(button(root(), "Less than a year")?.getAttribute("aria-pressed")).toBe("true");
  });
});
