// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadTurnstile } from "@/shared/lib/turnstile";
import { FunnelRoot } from "../FunnelRoot";
import { button, mount, settle, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));
vi.mock("../plan-chunk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../plan-chunk")>()),
  prefetchPlan: vi.fn(),
  LazyHeroPicturePrefetch: () => null,
}));
// S5 shows rupee bands only on India's clock (D10); pin the zone so CI in UTC taps the same buttons.
vi.mock("../region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../region")>()),
  localTimeZone: () => "Asia/Kolkata",
}));
vi.mock("@/shared/lib/turnstile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/turnstile")>()),
  loadTurnstile: vi.fn(async () => null),
}));

let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const box = () => root().querySelector("textarea");

beforeEach(() => {
  stubBrowser();
  stubClock();
  window.history.replaceState(null, "", "/");
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Clinic / healthcare", "3–5 years", "2–5", "₹1–5Cr");
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S6 (§4.3, §4.4)", () => {
  it("shows the bridge, the question, the hint, the starter in the box and nine chips, on step 5 of 6", () => {
    expect(root().querySelector(".f-bridge")?.textContent).toBe("Now let's talk about why you're here.");
    expect(root().querySelector(".f-bridge-hold")?.getAttribute("aria-hidden")).toBe("true");
    expect(root().querySelector("h2")?.textContent).toBe("Between you and me, what's the one thing in your business that's hurting right now?");
    expect(box()?.value).toBe("Honestly, I'm struggling with ___ because ___.");
    expect(box()?.maxLength).toBe(600);
    expect(root().querySelectorAll(".f-chip")).toHaveLength(9);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(5);
  });

  describe("the cursor on the first blank (copy.md)", () => {
    let nextFrame: FrameRequestCallback | null;
    beforeEach(() => {
      nextFrame = null;
      vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        nextFrame = callback;
        return 1;
      });
    });

    it("selects the first blank a frame after the untouched starter gets focus", () => {
      box()?.focus();
      nextFrame?.(0);
      expect([box()?.selectionStart, box()?.selectionEnd]).toEqual([30, 33]);
    });

    it("leaves a selection made before that frame alone, so select-all then typing replaces the whole box", () => {
      const field = box()!;
      field.focus();
      field.setSelectionRange(0, field.value.length);
      nextFrame?.(0);
      expect([field.selectionStart, field.selectionEnd]).toEqual([0, field.value.length]);
    });
  });

  it("loads the spam check's script when it opens (§4.4)", () => {
    expect(loadTurnstile).toHaveBeenCalled();
  });

  it("asks for something when That's it comes with the untouched starter and no chip", () => {
    tap(button(root(), "That's it"));
    expect(screenNow()).toBe("s6");
    expect(root().querySelector('[role="alert"]')?.textContent).toBe("Give me something to work with: a few words, a chip, anything.");
  });

  it("moves on with their own words", () => {
    typeInto(box(), "Patients book and then don't show up.");
    tap(button(root(), "That's it"));
    expect(screenNow()).toBe("s7");
  });

  it("moves on with a chip alone", () => {
    tapThrough(root(), "Payments get stuck", "That's it");
    expect(screenNow()).toBe("s7");
  });

  it("takes three chips at most, and says so on a fourth", () => {
    tapThrough(root(), "Not enough leads", "Ads burn money", "Team chaos", "Customer support");
    expect(root().querySelectorAll('.f-chip[aria-pressed="true"]')).toHaveLength(3);
    expect(button(root(), "Customer support")?.getAttribute("aria-pressed")).toBe("false");
    expect(root().querySelector('[role="status"]')?.textContent).toBe("Three's plenty. Untap one to swap.");
  });

  it("keeps the words when Back comes from S7", async () => {
    typeInto(box(), "Patients don't show up.");
    tap(button(root(), "That's it"));
    window.history.back();
    // Wait for the screen to change, not a fixed time: popstate can land late when the whole suite runs at once.
    await vi.waitFor(async () => {
      await settle();
      expect(screenNow()).toBe("s6");
    }, { timeout: 2_000, interval: 20 });
    expect(box()?.value).toBe("Patients don't show up.");
  });
});
