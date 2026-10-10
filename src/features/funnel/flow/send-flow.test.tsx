// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { calendlyUrl, copy, type LeadRequest } from "@/features/funnel/data/light";
import { FunnelRoot } from "./FunnelRoot";
import { loadPlanData, prefetchPlan } from "./plan-chunk";
import { LEAD_BUDGET_MS } from "./send";
import { funnelSession, setLeadContact } from "./session";
import { button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "./test/dom";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/data", async (importOriginal) => ({  // the full entry, for composePlan
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));
vi.mock("@/features/funnel/plan/PlanPage", async () => {
  const { createElement } = await import("react");
  return {
    PlanPage: (props: { visitor: { name: string }; saveNotice: string | null; onProgress(fields: object): void }) =>
      createElement("button", { className: "plan-stub", onClick: () => props.onProgress({ planDepth: 2 }) },
        `${props.visitor.name} · ${props.saveNotice ?? "none"}`),
  };
});
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name),
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
  toE164: () => null,
}));
vi.mock("./plan-chunk", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("./plan-chunk")>();
  return {
    ...actual,
    loadPlanData: vi.fn(actual.loadPlanData),
    prefetchPlan: vi.fn(),
    LazyHeroPicturePrefetch: () => createElement("i", { "data-hero-prefetch": "" }),
  };
});
vi.mock("./region", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./region")>()),
  localTimeZone: () => "Asia/Kolkata",
}));
/** The spam check, under the test's control: no token by default, as with no site key. */
const turnstile = vi.hoisted(() => ({ wait: (_ms: number) => Promise.resolve(""), reset: vi.fn() }));
vi.mock("@/shared/hooks/useTurnstile", () => ({
  useTurnstile: () => ({ hostRef: { current: null }, token: "", waitForToken: (ms: number) => turnstile.wait(ms), reset: turnstile.reset }),
}));

type Reply = (signal?: AbortSignal) => Promise<Response>;
const json = (status: number, body: unknown): Reply => async () => new Response(JSON.stringify(body), { status });
const noAnswer: Reply = (signal) =>
  new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));

/** Answers after ms, unless the send gives up first. */
const after = (ms: number, reply: Reply): Reply => (signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(reply(signal)), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

let replies: Reply[] = [];
let leads: LeadRequest[] = [];
let view: Mounted;
const root = () => view.container;
const screenNow = () => root().querySelector(".f-root")?.getAttribute("data-screen");
const s8Line = () => root().querySelector(".f-s8")?.textContent;
const planText = () => root().querySelector(".plan-stub")?.textContent;
const alertLine = () => root().querySelector('form [role="alert"]')?.textContent;
const run = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const send = () => click(button(root(), "Show me my plan"));

beforeAll(async () => {
  // Load the plan's modules once, on real timers, so no send waits on a module load while the clock is fake.
  await import("@/features/funnel/data");
  await import("@/features/funnel/plan/PlanPage");
});

beforeEach(() => {
  stubBrowser();
  stubClock();   // the tap gate's clock
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });   // S8's clock
  replies = [];
  leads = [];
  turnstile.wait = () => Promise.resolve("");
  turnstile.reset.mockClear();
  setLeadContact(null);
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url !== "/api/funnel/lead") return new Response(JSON.stringify({ success: true, country: "IN" }));
    leads.push(JSON.parse(String(init?.body)) as LeadRequest);
    return (replies.shift() ?? json(200, { success: true, planEmail: "sent" }))(init?.signal ?? undefined);
  }));
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
  tapThrough(root(), "I run a business", "Interior design / architecture", "5–10 years", "6–20", "₹1–5Cr");
  typeInto(root().querySelector("textarea"), "Enquiries come in, but by the time someone calls back they've gone cold.");
  tap(button(root(), "That's it"));
  typeInto(root().querySelector("#f-name"), "Ananya");
  typeInto(root().querySelector("#f-email"), "ananya@example.com");
  click(root().querySelector("#f-consent"));
});
afterEach(() => {
  view.unmount();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sending S7 (§4.3, §10, §13.2)", () => {
  it("puts S8 in S7's place at once, keeping S7 and its fields hidden underneath", () => {
    const entries = window.history.length;
    send();
    expect(screenNow()).toBe("s8");
    expect(root().querySelector("form")?.hidden).toBe(true);
    expect(root().querySelector<HTMLInputElement>("#f-name")?.value).toBe("Ananya");
    expect(s8Line()).toBe("Reading what you wrote…");
    expect(window.history.state?.funnel).toBe("s8");
    expect(window.history.length).toBe(entries);
  });

  it("plays S8's three lines, then opens the plan in the same entry with the header open", async () => {
    send();
    expect(funnelSession.stage()).toBe("questions");
    await run(700);
    expect(s8Line()).toBe("Matching it against a map of 137 business jobs…");
    await run(700);
    expect(s8Line()).toBe("Sizing it for a team of 6–20…");
    await run(700);
    expect(screenNow()).toBe("plan");
    expect(planText()).toBe("Ananya · none");
    expect(window.history.state?.funnel).toBe("plan");
    expect(funnelSession.stage()).toBe("plan");
    expect(document.documentElement.dataset.funnel).toBe("plan");
  });

  it("sends the body the fixture expects: no retry, phone or token on a first try with no token", async () => {
    send();
    await run(0);
    expect(leads).toHaveLength(1);
    expect(Object.keys(leads[0]).sort()).toEqual(["answers", "consent", "email", "name", "plan", "visitId"]);
    expect(leads[0]).toMatchObject({
      name: "Ananya", email: "ananya@example.com", consent: { given: true, version: "2026-10-08" },
      answers: { problemText: "Enquiries come in, but by the time someone calls back they've gone cold.", chips: [], inputMode: "typed" },
    });
  });

  it("sends one lead for a double tap (index I-T2)", async () => {
    send();
    send();
    await run(2_100);
    expect(leads).toHaveLength(1);
  });

  it("waits for the spam check's token, up to 3 s, and sends it (Review Focus 4)", async () => {
    const asked: number[] = [];
    turnstile.wait = (ms) => {
      asked.push(ms);
      return new Promise((resolve) => setTimeout(() => resolve("tok"), 1_000));
    };
    send();
    await run(999);
    expect(leads).toHaveLength(0);
    await run(1);
    expect(asked).toEqual([3_000]);
    expect(leads[0]).toMatchObject({ turnstileToken: "tok" });
  });

  it("tells the nav pill who sent it (D14)", () => {
    send();
    expect(funnelSession.leadContact()).toEqual({ name: "Ananya", email: "ananya@example.com" });
  });

  it("goes back to S7 once with every field kept, then the second try says retry (§10, D18)", async () => {
    replies = [json(403, { success: false }), json(200, { success: true, planEmail: "held" })];
    send();
    await run(2_100);
    expect(screenNow()).toBe("s7");
    expect(alertLine()).toBe("The spam check didn't go through. Mind trying once more?");
    expect(root().querySelector<HTMLInputElement>("#f-name")?.value).toBe("Ananya");
    expect(root().querySelector<HTMLInputElement>("#f-consent")?.checked).toBe(true);
    expect(turnstile.reset).toHaveBeenCalledTimes(1);  // a token is single use: the retry gets a fresh one
    send();
    await run(2_100);
    expect(leads[1]).toMatchObject({ retry: true, visitId: leads[0].visitId });
    expect(planText()).toBe("Ananya · none");
  });

  it("opens the plan with sp.save.fail's notice after a server failure twice", async () => {
    replies = [json(502, { success: false }), json(502, { success: false })];
    send();
    await run(2_100);
    expect(alertLine()).toBe("Something went wrong on our end. Try that again?");
    send();
    await run(2_100);
    expect(planText()).toBe("Ananya · fail");
  });

  it("sends the lead with the fallback plan when the plan's code can't load, and says the plan is on its way (review H2)", async () => {
    vi.mocked(loadPlanData).mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"));
    send();
    await run(2_100);
    expect(leads).toHaveLength(1);
    expect(leads[0].plan).toEqual({
      template: "A", orderVariant: "A-default", tier: "M",
      agentIds: ["back-office-money-in", "back-office-finance-reporting", "back-office-records", "back-office-office", "operations-client-comms", "operations-build-ops"],
      matchedPhrases: [], classifierVersion: "none", agentsVersion: "2026-10-04", fallback: true,
    });
    expect(screenNow()).toBe("plan");
    expect(root().querySelector(".f-plan .f-err")?.textContent).toBe(copy("s9.err.sent", { email: "ananya@example.com" }));
    expect(root().querySelector<HTMLAnchorElement>(".f-plan a.f-act")?.href).toBe(calendlyUrl("Ananya", "ananya@example.com"));
  });

  it.each(["held", "failed"])("without a plan, doesn't say the email is on its way when /lead's planEmail is %s (review H2 recheck)", async (planEmail) => {
    vi.mocked(loadPlanData).mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"));
    replies = [json(200, { success: true, planEmail })];
    send();
    await run(2_100);
    expect(leads).toHaveLength(1);
    expect(screenNow()).toBe("plan");
    expect(root().querySelector(".f-plan .f-err")?.textContent).toBe(copy("s9.err.unsent"));
  });

  it("with a plan, a held plan email adds no notice: the details were saved (review H2 recheck)", async () => {
    replies = [json(200, { success: true, planEmail: "held" })];
    send();
    await run(2_100);
    expect(planText()).toBe("Ananya · none");
  });

  it("never offers S7 a third time when the plan's code and /lead both fail (review H2)", async () => {
    const lost = new TypeError("Failed to fetch dynamically imported module");
    vi.mocked(loadPlanData).mockRejectedValueOnce(lost).mockRejectedValueOnce(lost);
    replies = [json(502, { success: false }), json(502, { success: false })];
    send();
    await run(2_100);
    expect(alertLine()).toBe("Something went wrong on our end. Try that again?");
    send();
    await run(2_100);
    expect(leads.map((lead) => lead.retry)).toEqual([undefined, true]);
    expect(screenNow()).toBe("plan");
    expect(root().querySelector(".f-plan .f-err")?.textContent).toBe(copy("s9.err.unsent"));
  });

  it("waits out a slow server that saves the lead, instead of calling it a failure (review M2)", async () => {
    replies = [after(12_000, json(200, { success: true, planEmail: "sent" }))];
    send();
    await run(12_000);
    expect(planText()).toBe("Ananya · none");
    expect(leads).toHaveLength(1);
  });

  it("opens the plan with sp.save.unsure's notice after no answer twice", async () => {
    replies = [noAnswer, noAnswer];
    send();
    await run(LEAD_BUDGET_MS);
    expect(screenNow()).toBe("s7");
    expect(alertLine()).toBe("Something went wrong on our end. Try that again?");
    send();
    await run(LEAD_BUDGET_MS);
    expect(leads[1]).toMatchObject({ retry: true, visitId: leads[0].visitId });  // the replay check answers it (review M2)
    expect(planText()).toBe("Ananya · unsure");
  });

  it("lands on S6 on Back from the plan, and the next send is a new visit (§4.1)", async () => {
    send();
    await run(2_100);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { funnel: "s6" } }));
    });
    expect(screenNow()).toBe("s6");
    expect(funnelSession.stage()).toBe("questions");
    tap(button(root(), "That's it"));
    send();
    await run(2_100);
    expect(leads).toHaveLength(2);
    expect(leads[1].visitId).not.toBe(leads[0].visitId);
    expect(leads[1]).not.toHaveProperty("retry");
  });

  it("starts the plan's code at S5, and keeps the hero still mounted out of sight until the plan (§6.6, §13.1)", async () => {
    expect(prefetchPlan).toHaveBeenCalled();
    expect(root().querySelector("[data-hero-prefetch]")).not.toBeNull();
    send();
    await run(2_100);
    expect(screenNow()).toBe("plan");
    expect(root().querySelector("[data-hero-prefetch]")).toBeNull();
  });
});
