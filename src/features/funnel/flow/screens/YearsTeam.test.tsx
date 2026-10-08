// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "../FunnelRoot";
import { button, mount, settle, stubBrowser, stubClock, tap, tapThrough, type Mounted } from "../test/dom";

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
  window.history.replaceState(null, "", "/");
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Interior design / architecture");
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S3 + S4 (§4.3, §11.1)", () => {
  it("asks both on one screen, step 3 of 6", () => {
    expect([...root().querySelectorAll("h2")].map((h) => h.textContent)).toEqual(["How long have you been at it?", "How big is the team?"]);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(3);
  });

  it("presses the first tap, brings the team row forward and moves focus to its question", () => {
    tap(button(root(), "5–10 years"));
    expect(button(root(), "5–10 years")?.getAttribute("aria-pressed")).toBe("true");
    expect(root().querySelector(".f-row2")?.classList.contains("is-forward")).toBe(true);
    expect(document.activeElement?.textContent).toBe("How big is the team?");
    expect(screenNow()).toBe("s34");
  });

  it("moves on with the second tap, whichever row comes first", () => {
    tapThrough(root(), "Just me", "1–3 years");
    expect(screenNow()).toBe("s5");
  });

  it("keeps both answers when Back comes from S5", async () => {
    tapThrough(root(), "5–10 years", "6–20");
    window.history.back();
    await settle(20);
    expect(screenNow()).toBe("s34");
    expect(button(root(), "5–10 years")?.getAttribute("aria-pressed")).toBe("true");
    expect(button(root(), "6–20")?.classList.contains("is-selected")).toBe(true);
  });
});
