// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "./FunnelRoot";
import { screenOfEntry, tagEntry } from "./history";
import { button, mount, settle, stubBrowser, stubClock, tap, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

let view: Mounted | undefined;
const root = () => view?.container ?? document.body;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const start = () => {
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
};

beforeEach(() => {
  stubBrowser();
  stubClock();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("history entries (§4.1)", () => {
  it("keep react-router's state and add the screen, on the same URL", () => {
    window.history.replaceState({ usr: null, key: "k1", idx: 0 }, "");
    const length = window.history.length;
    tagEntry(window, "s2", "push");
    expect(window.history.state).toEqual({ usr: null, key: "k1", idx: 0, funnel: "s2" });
    expect(window.history.length).toBe(length + 1);
    expect(window.location.pathname).toBe("/");
  });

  it("read back as a screen, and an entry that isn't the funnel's reads as none", () => {
    expect(screenOfEntry({ funnel: "s34" })).toBe("s34");
    expect(screenOfEntry({ funnel: "s9" })).toBeNull();
    expect(screenOfEntry(null)).toBeNull();
  });
});

describe("S1b and Back", () => {
  it("tags the landing entry, then adds one for S1b", () => {
    start();
    expect(window.history.state?.funnel).toBe("s1");
    tap(button(root(), "I'm starting something"));
    expect(screenNow()).toBe("s1b");
    expect(window.history.state?.funnel).toBe("s1b");
  });

  it("S1b has a Back arrow and no bar; its answer shows s1b.done and a button to the sample plan in the same entry (W17-B)", () => {
    start();
    tap(button(root(), "I freelance"));
    expect(root().querySelector(".f-bar")).toBeNull();
    expect(button(root(), "Back")).not.toBeNull();
    const length = window.history.length;
    tap(button(root(), "Saw a reel or a post"));
    const done = "Got it, thanks. Everything's open, have a look around.";
    expect(root().querySelector("h2")?.textContent).toBe(done);
    expect(document.activeElement?.textContent).toBe(done);
    expect(root().querySelector('a[href="/products"]')).toBeNull();  // the owner vetoed D15 (W17-B)
    expect(button(root(), "Show me a sample plan")).not.toBeNull();
    expect(window.history.length).toBe(length);
    expect(document.documentElement.dataset.funnel).toBe("questions");
  });

  it("Back goes one step with the answer kept, and Forward comes back (§4.1)", async () => {
    start();
    tap(button(root(), "Student, or just curious"));
    tap(button(root(), "Back"));
    // Wait for the screen to change, not a fixed time: popstate can land late when the whole suite runs at once.
    await vi.waitFor(async () => {
      await settle();
      expect(screenNow()).toBe("s1");
    }, { timeout: 2_000, interval: 20 });
    expect(button(root(), "Student, or just curious")?.classList.contains("is-selected")).toBe(true);
    window.history.forward();
    await vi.waitFor(async () => {
      await settle();
      expect(screenNow()).toBe("s1b");
    }, { timeout: 2_000, interval: 20 });
  });
});
