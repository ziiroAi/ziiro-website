// @vitest-environment jsdom
// (C) W16-B: the owner: "the rounded advert is on the form page… this underlying orange section should be just on the
// landing page". The orange footer and the sheet's rounded bottom show on every page but the funnel's questions.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FunnelStage } from "@/features/funnel/data/light";

const session = vi.hoisted(() => {
  let stage: FunnelStage = "questions";
  const listeners = new Set<() => void>();
  return {
    reportCta: vi.fn(),
    leadContact: () => null,
    stage: () => stage,
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    set(next: FunnelStage) {
      stage = next;
      listeners.forEach((onChange) => onChange());
    },
  };
});
vi.mock("@/features/funnel/flow/session", () => ({ funnelSession: session }));
vi.mock("@/shared/motion/SmoothScroll", () => ({ scrollTo: vi.fn() }));

import Footer from "./Footer";
import { SiteSheet } from "./funnel-form";

class Inert {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let host: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("IntersectionObserver", Inert);
  vi.stubGlobal("ResizeObserver", Inert);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  act(() => session.set("questions"));
});

function render(path: string, stage: FunnelStage) {
  act(() => session.set(stage));
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
  act(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <SiteSheet>
          <p>page</p>
        </SiteSheet>
        <Footer />
      </MemoryRouter>,
    ),
  );
}

const footer = () => host.querySelector("footer.site-footer");
const sheet = () => host.querySelector(".site-sheet");

describe("the orange footer and the rounded sheet (W16-B)", () => {
  it("are not on the funnel's questions: the sheet is flat and there is no footer to scroll to", () => {
    render("/", "questions");
    expect(footer()).toBeNull();
    expect(sheet()?.hasAttribute("data-flat")).toBe(true);
    expect(sheet()?.textContent).toBe("page");
  });

  it("leave the site's links in a hidden footer on the questions, for search engines and screen readers (§8.2)", () => {
    render("/", "questions");
    const links = host.querySelector("footer.sr-only");
    const hrefs = [...(links?.querySelectorAll("a[href]") ?? [])].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/book-a-call", "/pricing", "/products", "/docs", "/faq", "/mission"]));
  });

  it("come back on the plan", () => {
    render("/", "plan");
    expect(footer()).not.toBeNull();
    expect(sheet()?.hasAttribute("data-flat")).toBe(false);
  });

  it("follow the funnel as it moves to the plan and Back to the questions", () => {
    render("/", "questions");
    act(() => session.set("plan"));
    expect(footer()).not.toBeNull();
    act(() => session.set("questions"));
    expect(footer()).toBeNull();
  });

  it("stay on every other page", () => {
    render("/pricing", "questions");
    expect(footer()).not.toBeNull();
    expect(sheet()?.hasAttribute("data-flat")).toBe(false);
  });
});
