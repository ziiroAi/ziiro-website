// @vitest-environment jsdom
// (C) W17-B: a visitor who runs no business (S1's "I freelance", "I'm starting something", "Student, or just
// curious") answers S1b and lands on the plan page with a sample plan, not on /products. The owner vetoed D15.
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitRequest } from "@/features/funnel/data/light";
import { FunnelRoot } from "./FunnelRoot";
import { button, click, mount, stubBrowser, stubClock, tap, tapThrough, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/plan/PlanPage", async () => {
  const { createElement } = await import("react");
  return {
    PlanPage: (props: { visitor: { name: string; email: string }; guest?: boolean; plan: { fallback: boolean } }) =>
      createElement("p", { className: "plan-stub" },
        `${props.guest ? "guest" : "owner"} · ${props.visitor.name || "no name"} · ${props.plan.fallback ? "fallback" : "own"}`),
  };
});
vi.mock("./plan-chunk", async (importOriginal) => {
  const { createElement } = await import("react");
  return {
    ...(await importOriginal<typeof import("./plan-chunk")>()),
    LazyHeroPicturePrefetch: () => createElement("i", { "data-hero-prefetch": "" }),
  };
});

let view: Mounted;
let visits: VisitRequest[] = [];
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const planText = () => root().querySelector(".plan-stub")?.textContent;

beforeAll(async () => {
  await import("@/features/funnel/data");
  await import("@/features/funnel/plan/PlanPage");
});

beforeEach(() => {
  stubBrowser();
  stubClock();
  visits = [];
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/funnel/visit") visits.push(JSON.parse(String(init?.body)) as VisitRequest);
    return new Response(JSON.stringify({ success: true, country: "IN" }));
  }));
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
});
afterEach(() => {
  view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S1b leads to the plan page (W17-B)", () => {
  it("a student who picks a reason lands on the plan, with the sample plan and no name, in a new entry", async () => {
    tapThrough(root(), "Student, or just curious");
    const entries = window.history.length;
    tap(button(root(), "Learning how businesses use AI"));
    await vi.waitFor(() => expect(screenNow()).toBe("plan"), { timeout: 2_000, interval: 20 });
    expect(planText()).toBe("guest · no name · fallback");
    expect(window.history.state?.funnel).toBe("plan");
    expect(window.history.length).toBe(entries + 1);
    expect(root().querySelector('a[href="/products"]')).toBeNull();
    expect(visits.some((v) => v.step === "S1b" && v.fields.nonOwnerReason === "learning")).toBe(true);
  });

  it("does the same for a freelancer and for someone starting out", async () => {
    tapThrough(root(), "I freelance", "Ideas for my own work");
    await vi.waitFor(() => expect(screenNow()).toBe("plan"), { timeout: 2_000, interval: 20 });
    expect(planText()).toBe("guest · no name · fallback");
  });

  it("Back from the sample plan shows S1b's answer with a button back to the plan, never a link to /products", async () => {
    tapThrough(root(), "I'm starting something", "Saw a reel or a post");
    await vi.waitFor(() => expect(screenNow()).toBe("plan"), { timeout: 2_000, interval: 20 });
    window.history.back();
    await vi.waitFor(() => expect(screenNow()).toBe("s1b"), { timeout: 2_000, interval: 20 });
    expect(root().querySelector('a[href="/products"]')).toBeNull();
    click(button(root(), "Show me a sample plan"));
    await vi.waitFor(() => expect(screenNow()).toBe("plan"), { timeout: 2_000, interval: 20 });
    expect(planText()).toBe("guest · no name · fallback");
  });
});
