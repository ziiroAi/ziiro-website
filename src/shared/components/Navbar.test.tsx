// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { copy, type FunnelStage } from "@/features/funnel/data/light";
import { THEME_KEY, resetThemeChoice } from "@/features/funnel/flow/theme";
import { stubLocalStorage } from "@/features/funnel/flow/test/memory-storage";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";

type Stage = FunnelStage;
type Lead = { name: string; email: string } | null;

const session = vi.hoisted(() => {
  let stage: Stage = "questions";
  let lead: Lead = null;
  const listeners = new Set<() => void>();
  return {
    reportCta: vi.fn(),
    leadContact: () => lead,
    stage: () => stage,
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    set(next: Stage, contact: Lead) {
      stage = next;
      lead = contact;
      listeners.forEach((onChange) => onChange());
    },
  };
});
vi.mock("@/features/funnel/flow/session", () => ({ funnelSession: session }));
vi.mock("@/shared/motion/SmoothScroll", () => ({ scrollTo: vi.fn() }));

import Navbar from "./Navbar";

const ANANYA = { name: "Ananya & Co+ अनन्या", email: "a+b@x.com" };
let host: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {},
       addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  // jsdom can't navigate: stop the anchor's default action after React's handler has run.
  document.addEventListener("click", (e) => e.preventDefault());
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  session.set("questions", null);
  session.reportCta.mockClear();
});

function show(path: string) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<MemoryRouter initialEntries={[path]}><Navbar /></MemoryRouter>));
}

const links = () => [...host.querySelectorAll<HTMLAnchorElement>("a")];
const named = (id: string) => links().filter((a) => a.textContent?.trim() === copy(id));
const click = (el: HTMLElement) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));

describe("the header (§6.2 block 0)", () => {
  it("shows only the logo on / while the questions run (D6)", () => {
    show("/");
    expect(links()).toHaveLength(1);
    expect(links()[0].getAttribute("aria-label")).toBe(copy("nav.home.aria"));
    expect([...host.querySelectorAll("button")].map((el) => el.hasAttribute("data-theme-toggle"))).toEqual([true]);
  });

  it("brings the links and the pill once the plan is on screen, and hides them again on Back (§4.1)", () => {
    show("/");
    act(() => session.set("plan", ANANYA));
    for (const id of ["nav.mission", "nav.who", "nav.products"]) expect(named(id)).toHaveLength(1);
    expect(named("nav.btn")).toHaveLength(2);
    act(() => session.set("questions", ANANYA));
    expect(links()).toHaveLength(1);
  });

  it("shows the links on every other page, with the burger labelled ph.nav.menu (D14)", () => {
    show("/mission");
    expect(named("nav.mission")).toHaveLength(1);
    expect(host.querySelector("button[aria-controls='site-menu']")?.getAttribute("aria-label")).toBe(copy("ph.nav.menu"));
  });

  it("opens Calendly in a new tab with the name and email from S7, intact (§6.3)", () => {
    show("/");
    act(() => session.set("plan", ANANYA));
    for (const pill of named("nav.btn")) {
      click(pill);
      const url = new URL(pill.href);
      expect(`${url.origin}${url.pathname}`).toBe(INTERIM_BOOKING_URL);
      expect(url.searchParams.get("name")).toBe(ANANYA.name);
      expect(url.searchParams.get("email")).toBe(ANANYA.email);
      expect(pill.target).toBe("_blank");
      expect(pill.rel).toContain("noopener");
    }
    expect(session.reportCta).toHaveBeenCalledWith("header");
  });

  it("opens the plain Calendly event before anyone has sent S7 (D14)", () => {
    show("/mission");
    const [pill] = named("nav.btn");
    click(pill);
    expect(pill.href).toBe(INTERIM_BOOKING_URL);
  });

  it("takes the funnel's colours on /, so it follows the visitor's theme (D9)", () => {
    show("/");
    expect(host.querySelector("nav")?.getAttribute("style")).toContain("--background: var(--funnel-bg)");
  });

  it("asks for a solid page-colour backdrop on the plan only, so scrolled plan text never shows through (W14-M2)", () => {
    show("/");
    const nav = () => host.querySelector("nav")!;
    expect(nav().dataset.backdrop).toBeUndefined();
    act(() => session.set("plan", ANANYA));
    expect(nav().dataset.backdrop).toBe("solid");
    act(() => root.unmount());
    host.remove();
    show("/mission");
    expect(nav().dataset.backdrop).toBeUndefined();
  });

  it("has a light/dark toggle on / that switches the page live and remembers it (W15-A)", () => {
    stubLocalStorage();
    document.documentElement.setAttribute("data-funnel", "questions");
    document.documentElement.setAttribute("data-theme", "dark");
    show("/");
    const toggle = () => host.querySelector<HTMLButtonElement>("button[data-theme-toggle]")!;
    expect(toggle().getAttribute("aria-label")).toBe(copy("nav.theme.light"));
    click(toggle());
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    expect(toggle().getAttribute("aria-label")).toBe(copy("nav.theme.dark"));
    click(toggle());
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => session.set("plan", ANANYA));
    expect(host.querySelectorAll("button[data-theme-toggle]")).toHaveLength(1);
    document.documentElement.removeAttribute("data-funnel");
    document.documentElement.removeAttribute("data-theme");
    vi.unstubAllGlobals();
    resetThemeChoice();
  });

  it("has no toggle on the other pages, which stay dark (D9)", () => {
    show("/mission");
    expect(host.querySelector("button[data-theme-toggle]")).toBeNull();
  });

  it("keeps the site's colours on every other page", () => {
    show("/mission");
    const nav = host.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(nav!.getAttribute("style") ?? "").not.toContain("--funnel-bg");
  });
});
