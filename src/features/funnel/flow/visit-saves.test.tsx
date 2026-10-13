// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitRequest } from "@/features/funnel/data/light";
import { FunnelRoot } from "./FunnelRoot";
import { localTimeZone } from "./region";
import { funnelSession } from "./session";
import { button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/data", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/plan/PlanPage", async () => {
  const { createElement } = await import("react");
  return { PlanPage: () => createElement("p", { className: "plan-stub" }, "plan") };
});
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name),
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  toE164: () => null,
}));
vi.mock("./plan-chunk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./plan-chunk")>()),
  prefetchPlan: vi.fn(),
  LazyHeroPicturePrefetch: () => null,
}));
vi.mock("./region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./region")>()),
  localTimeZone: vi.fn(() => "Asia/Kolkata"),
}));

let country: string | null = "IN";
let failVisits = false;
let saves: VisitRequest[] = [];
let view: Mounted;
const root = () => view.container;
const run = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const steps = () => saves.map((save) => save.step);
const last = () => saves[saves.length - 1];

function start() {
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
}

beforeAll(async () => {
  // As in send-flow.test.tsx: the plan's modules load once, on real timers.
  await import("@/features/funnel/data");
  await import("@/features/funnel/plan/PlanPage");
});

beforeEach(() => {
  stubBrowser();
  stubClock();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  country = "IN";
  failVisits = false;
  saves = [];
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/funnel/lead") return new Response(JSON.stringify({ success: true, planEmail: "sent" }));
    saves.push(JSON.parse(String(init?.body)) as VisitRequest);
    if (failVisits) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ success: true, country }));
  }));
});
afterEach(() => {
  view.unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the background saves (§9, §10)", () => {
  it("saves S0 with the landing context at first paint, then S1 once it has risen", async () => {
    start();
    await run(0);
    expect(saves[0]).toMatchObject({ step: "S0", fields: { noticeVersion: "2026-10-08", landingPath: "/", timezone: "Asia/Kolkata" } });
    expect(typeof saves[0].id).toBe("string");
    await run(1_400);
    expect(steps()).toEqual(["S0", "S1"]);
    expect(new Set(saves.map((save) => save.id)).size).toBe(1);
  });

  it("looks the time zone up in a task of its own, after the first commit's effects (W15-E)", async () => {
    vi.mocked(localTimeZone).mockClear();
    start();
    expect(localTimeZone).not.toHaveBeenCalled();
    expect(saves).toEqual([]);
    await run(0);
    expect(localTimeZone).toHaveBeenCalled();
    expect(saves[0]).toMatchObject({ step: "S0", fields: { timezone: "Asia/Kolkata" } });
  });

  it("saves each tap with every answer so far", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years");
    await run(0);
    expect(steps()).toEqual(["S0", "S2", "S3", "S4"]);
    expect(last().fields).toMatchObject({ segment: "business", businessType: "interior", yearsBand: "5_10", landingPath: "/" });
  });

  it("never saves while they type, and never sends what they typed (D13)", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
    await run(0);
    const before = saves.length;
    typeInto(root().querySelector("textarea"), "Leads go cold after the site visit");
    await run(0);
    expect(saves.length).toBe(before);
    tap(button(root(), "That's it"));
    typeInto(root().querySelector("#f-name"), "Ananya");
    await run(0);
    expect(last()).toMatchObject({ step: "S7", fields: { chips: [], inputMode: "typed" } });
    expect(JSON.stringify(saves)).not.toMatch(/Leads go cold|Ananya/);
  });

  it("lets the first answer's country pick S5's currency and S7's dial code (§4.4, §5.3)", async () => {
    country = "US";
    start();
    await run(0);
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20");
    expect(button(root(), "$1–5M")).not.toBeNull();
    tapThrough(root(), "$1–5M");
    typeInto(root().querySelector("textarea"), "Leads go cold");
    tap(button(root(), "That's it"));
    expect(root().querySelector<HTMLInputElement>("#f-phone")?.value).toBe("+1 ");
    expect(last().fields).toMatchObject({ revenueCurrency: "USD" });
  });

  it("keeps the flow moving when a save fails", async () => {
    failVisits = true;
    start();
    await run(0);
    tapThrough(root(), "I run a business");
    await run(0);
    expect(root().querySelector(".f-root")?.getAttribute("data-screen")).toBe("s2");
    expect(steps()).toEqual(["S0", "S2"]);
  });

  it("saves the plan at S8, the time to plan at S9, and a header tap there (§9, D14)", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
    typeInto(root().querySelector("textarea"), "Leads go cold");
    tap(button(root(), "That's it"));
    typeInto(root().querySelector("#f-name"), "Ananya");
    typeInto(root().querySelector("#f-email"), "ananya@example.com");
    click(root().querySelector("#f-consent"));
    click(button(root(), "Show me my plan"));
    await run(0);  // the plan is composed and saved at S8; one act scope would batch it with the send's end
    await run(2_100);
    await run(0);  // the plan's lazy chunk resolves, then it paints
    expect(saves.find((save) => save.step === "S8" && save.fields.template)).toBeDefined();
    expect(last()).toMatchObject({ step: "S9", fields: { template: "B", tier: "M" } });
    expect(typeof last().fields.secondsToResult).toBe("number");
    act(() => funnelSession.reportCta("header"));
    await run(0);
    expect(last().fields).toMatchObject({ ctaFrom: "header", ctaClicked: true });
  });

  it("saves a new visit after Back from the plan (§4.1)", async () => {
    start();
    tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
    typeInto(root().querySelector("textarea"), "Leads go cold");
    tap(button(root(), "That's it"));
    typeInto(root().querySelector("#f-name"), "Ananya");
    typeInto(root().querySelector("#f-email"), "ananya@example.com");
    click(root().querySelector("#f-consent"));
    click(button(root(), "Show me my plan"));
    await run(2_100);
    await run(0);
    const firstId = last().id;
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { funnel: "s6" } }));
    });
    await run(0);
    expect(last()).toMatchObject({ step: "S6" });
    expect(last().id).not.toBe(firstId);
  });
});
