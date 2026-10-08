// @vitest-environment jsdom
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunnelRoot } from "../FunnelRoot";
import { localTimeZone } from "../region";
import { button, mount, stubBrowser, stubClock, tap, tapThrough, type Mounted } from "../test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("../test/fake-data")).FAKE_DATA,
}));
vi.mock("../region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../region")>()),
  localTimeZone: vi.fn(() => "Asia/Kolkata"),
}));

let view: Mounted | undefined;
const root = () => view?.container ?? document.body;
const toS5 = () => {
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Clinic / healthcare", "3–5 years", "2–5");
};
const labels = () => [...root().querySelectorAll(".f-options button")].map((b) => b.textContent);

beforeEach(() => {
  stubBrowser();
  stubClock();
  vi.mocked(localTimeZone).mockReturnValue("Asia/Kolkata");
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S5 (§4.3, D10)", () => {
  it("shows rupee bands on India's clock, then Rather not say, on step 4 of 6", () => {
    toS5();
    expect(root().querySelector("h2")?.textContent).toBe("Roughly, what does it make in a year?");
    expect(labels()).toEqual(["Under ₹25L", "₹25L–1Cr", "₹1–5Cr", "₹5–25Cr", "₹25Cr+", "Rather not say"]);
    expect(root().querySelectorAll(".f-bar .is-on")).toHaveLength(4);
  });

  it("shows dollar bands elsewhere", () => {
    vi.mocked(localTimeZone).mockReturnValue("America/New_York");
    toS5();
    expect(labels()).toEqual(["Under $250k", "$250k–1M", "$1–5M", "$5–25M", "$25M+", "Rather not say"]);
  });

  it("takes Rather not say as a full answer", () => {
    toS5();
    tap(button(root(), "Rather not say"));
    expect(root().querySelector(".f-root")?.getAttribute("data-screen")).toBe("s6");
  });
});
