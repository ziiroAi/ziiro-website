// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadRequest } from "@/features/funnel/data/light";
import { FunnelRoot } from "./FunnelRoot";
import { prefetchPlan } from "./plan-chunk";
import { setLeadContact } from "./session";
import { button, click, mount, stubBrowser, stubClock, tap, tapThrough, typeInto, type Mounted } from "./test/dom";
import { KEEP_MS } from "./resume";
import { peekVisit } from "./visit-id";

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
  return {
    ...(await importOriginal<typeof import("./plan-chunk")>()),
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

let replies: Reply[] = [];
let leads: LeadRequest[] = [];
let visitPosts = 0;
let visitBodies: { step: string; fields: Record<string, unknown> }[] = [];
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
  visitPosts = 0;
  visitBodies = [];
  turnstile.wait = () => Promise.resolve("");
  turnstile.reset.mockClear();
  setLeadContact(null);
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/funnel/visit") {
      visitPosts += 1;
      visitBodies.push(JSON.parse(String(init?.body)) as { step: string; fields: Record<string, unknown> });
    }
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

/** The visitor taps a header link at S9 (FunnelRoot unmounts), then Back brings the plan's entry back. */
function leaveAndComeBack(): void {
  comeBack({ funnel: "plan" });
}

/** "/" mounts again on an entry with this tag: null is a new one, as the logo or a link to "/" makes (W24-C). */
function comeBack(entry: { funnel: string } | null): void {
  view.unmount();
  window.history.replaceState(entry, "", "/");
  view = mount(<MemoryRouter><FunnelRoot /></MemoryRouter>);
}

const KEPT = "ziiro.funnel.plan";
const kept = () => JSON.parse(sessionStorage.getItem(KEPT) ?? "null") as Record<string, unknown> & { visitId: string; savedAt: number } | null;

async function reachPlan(): Promise<string> {
  send();
  await run(2_100);
  expect(screenNow()).toBe("plan");
  return leads[0].visitId;
}

describe("leaving / from the plan and coming back (review M3)", () => {
  it("shows the same plan on the same visit, and sends no second lead", async () => {
    const visitId = await reachPlan();
    leaveAndComeBack();
    expect(screenNow()).toBe("plan");
    expect(planText()).toBe("Ananya · none");
    expect(peekVisit()).toMatchObject({ id: visitId, lead: true });
    expect(window.history.state?.funnel).toBe("plan");
    await run(0);
    expect(leads).toHaveLength(1);
  });

  it("still treats Back from the restored plan as leaving it: S6, and a new visit (§4.1)", async () => {
    const visitId = await reachPlan();
    leaveAndComeBack();
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: { funnel: "s6" } })));
    expect(screenNow()).toBe("s6");
    expect(peekVisit()?.id).not.toBe(visitId);
  });

  it("starts over once the visitor has left the plan, or the visit has changed", async () => {
    await reachPlan();
    act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: { funnel: "s6" } })));
    leaveAndComeBack();
    expect(screenNow()).toBe("s1");
  });
});

describe("\"/\" opens on the plan for the rest of the visit (W24-C)", () => {
  it("the logo: a new entry for \"/\" after another page shows the same plan, and sends nothing new", async () => {
    const visitId = await reachPlan();
    comeBack(null);
    expect(screenNow()).toBe("plan");
    expect(planText()).toBe("Ananya · none");
    expect(peekVisit()).toMatchObject({ id: visitId, lead: true });
    expect(window.history.state?.funnel).toBe("plan");
    await run(0);
    expect(leads).toHaveLength(1);
  });

  it("a reload: the plan comes back from sessionStorage, kept beside its visit without the S7 draft", async () => {
    const visitId = await reachPlan();
    const copy = kept();
    expect(copy?.visitId).toBe(visitId);
    expect(copy).toMatchObject({ name: "Ananya" });
    // What storage holds is what "/" opens on, not a copy in memory.
    sessionStorage.setItem(KEPT, JSON.stringify({ ...copy, name: "Ananya R" }));
    comeBack(null);
    expect(planText()).toBe("Ananya R · none");
    sessionStorage.removeItem(KEPT);
    comeBack(null);
    expect(screenNow()).toBe("s1");
  });

  it("keeps only what the plan draws: the name, the plan and the taps; never the email, the S7 draft or words it doesn't quote (review C-2)", async () => {
    await reachPlan();
    await run(0);  // the words check
    const copy = kept();
    expect(Object.keys(copy ?? {}).sort()).toEqual(["answers", "name", "plan", "progress", "round", "saveNotice", "savedAt", "secondsToResult", "seq", "v", "visitId", "words"]);
    expect(copy?.words).toBe("");  // the fake plan has no stops, so nothing quotes them
    expect(Object.keys(copy?.answers as object)).not.toContain("problemText");
    expect(Object.keys(copy?.answers as object)).not.toContain("businessOther");
    const raw = sessionStorage.getItem(KEPT) ?? "";
    expect(raw).not.toContain("ananya@example.com");
    // Their typed sentence. (The plan keeps the classifier's matched phrases, from its own word list.)
    expect(raw).not.toContain("by the time someone calls back");
  });

  it("drops a copy older than 30 minutes, even on its own visit, and asks the questions (review C-2)", async () => {
    await reachPlan();
    const copy = kept();
    sessionStorage.setItem(KEPT, JSON.stringify({ ...copy, savedAt: Date.now() - KEEP_MS - 1 }));
    comeBack(null);
    expect(screenNow()).toBe("s1");
    expect(kept()).toBeNull();
  });

  it("a resumed plan posts no /visit: the visit row keeps its landing context (review C-1)", async () => {
    await reachPlan();
    await run(1_000);
    const before = visitPosts;
    expect(before).toBeGreaterThan(0);
    comeBack(null);
    await run(5_000);
    expect(screenNow()).toBe("plan");
    expect(visitPosts).toBe(before);
    comeBack({ funnel: "plan" });
    await run(5_000);
    expect(visitPosts).toBe(before);
  });

  it("what a resumed plan does save carries only what it adds: no landing context, no answers (review C-1b, N-2)", async () => {
    await reachPlan();
    await run(1_000);
    comeBack(null);
    await run(1_000);
    const before = visitBodies.length;
    click(root().querySelector(".plan-stub"));  // the stub reports planDepth 2
    await run(1_000);
    expect(visitBodies.slice(before)).toEqual([{ id: peekVisit()?.id, step: "S9", fields: { noticeVersion: expect.any(String), planDepth: 2 } }]);
  });

  it("start over straight after a resume is not swallowed by the tap gate (review C-3)", async () => {
    await reachPlan();
    comeBack(null);
    click(button(root(), "Start over"));  // no time passes: nothing changed step, so nothing locks the gate
    expect(screenNow()).toBe("s1");
  });

  it("drops a plan kept for another visit, and asks the questions", async () => {
    await reachPlan();
    sessionStorage.setItem("ziiro.funnel.visit", JSON.stringify({ id: "another-visit", lead: false, step: "S1" }));
    comeBack(null);
    expect(screenNow()).toBe("s1");
    expect(kept()).toBeNull();
  });

  it("start over: S1 on a new visit, the kept plan gone, and \"/\" asks the questions again", async () => {
    const visitId = await reachPlan();
    tap(button(root(), "Start over"));
    expect(screenNow()).toBe("s1");
    expect(peekVisit()?.id).not.toBe(visitId);
    expect(kept()).toBeNull();
    expect(window.history.state?.funnel).toBe("s1");
    comeBack(null);
    expect(screenNow()).toBe("s1");
    await run(0);
    expect(leads).toHaveLength(1);
  });
});
