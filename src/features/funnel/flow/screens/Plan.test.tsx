// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, copy } from "@/features/funnel/data/light";
import { initialFlow, type FlowState } from "../state";
import { mount, stubBrowser, type Mounted } from "../test/dom";
import { PlanScreen } from "./Plan";
import type { FlowEnv } from "./types";

vi.mock("../plan-chunk", () => ({
  LazyPlanPage: () => {
    throw new Error("PlanPage chunk failed to load");
  },
  LazyHeroPicturePrefetch: () => null,
}));

const VISITOR = { name: "Ananya", email: "ananya@studio.in" };
const ENV = { boot: { t0: 0 }, starter: "", startOver: vi.fn() } as unknown as FlowEnv;
let view: Mounted | undefined;

function showPlan(saveNotice: FlowState["saveNotice"]): HTMLElement {
  const state: FlowState = { ...initialFlow(""), screen: "plan", plan: {} as FlowState["plan"], visitor: VISITOR, saveNotice };
  view = mount(<PlanScreen state={state} act={vi.fn()} edit={vi.fn()} env={ENV} />);
  return view.container;
}

beforeEach(() => {
  stubBrowser();
  vi.spyOn(console, "error").mockImplementation(() => undefined);  // React reports the caught error
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S9 when the plan page can't show (review M4)", () => {
  it("says the plan is in their inbox, and offers the booking link and a reload", () => {
    const root = showPlan(null);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(copy("s9.err.sent", { email: VISITOR.email }));
    const link = [...root.querySelectorAll("a")].find((a) => a.textContent === copy("nav.btn"));
    expect(link?.getAttribute("href")).toBe(calendlyUrl(VISITOR.name, VISITOR.email));
    expect([...root.querySelectorAll("button")].map((b) => b.textContent)).toContain(copy("g.reload"));
  });

  it("doesn't claim an email went out when the save failed or is unsure", () => {
    for (const notice of ["fail", "unsure"] as const) {
      const root = showPlan(notice);
      expect(root.textContent).toContain(copy("s9.err.unsent"));
      expect(root.textContent).not.toContain(VISITOR.email);
      view?.unmount();
      view = undefined;
    }
  });
});

describe("S9's start over (W24-C)", () => {
  it("shows under the plan even when the plan can't, and asks the questions again", () => {
    const root = showPlan(null);
    const restart = [...root.querySelectorAll(".f-restart button")].find((b) => b.textContent === copy("s9.restart"));
    expect(restart).toBeDefined();
    (restart as HTMLButtonElement).click();
    expect(ENV.startOver).toHaveBeenCalledTimes(1);
  });
});
