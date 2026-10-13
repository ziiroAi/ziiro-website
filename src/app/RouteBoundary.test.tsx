// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/features/funnel/data/light";
import { mount, type Mounted } from "@/features/funnel/flow/test/dom";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";
import { RouteBoundary } from "./RouteBoundary";

function Broken(): JSX.Element {
  throw new TypeError("crypto.randomUUID is not a function");
}

let go: (path: string) => void = () => undefined;
function Navigator(): null {
  const navigate = useNavigate();
  go = (path) => act(() => navigate(path));
  return null;
}

let view: Mounted | undefined;
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);  // React reports the caught error
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
});

function site(): HTMLElement {
  view = mount(
    <MemoryRouter initialEntries={["/"]}>
      <Navigator />
      <RouteBoundary>
        <Routes>
          <Route path="/" element={<Broken />} />
          <Route path="/pricing" element={<p>Pricing page</p>} />
        </Routes>
      </RouteBoundary>
    </MemoryRouter>,
  );
  return view.container;
}

describe("RouteBoundary (review M5)", () => {
  it("shows g.error, the booking link and a reload instead of a blank page when a route throws", () => {
    const root = site();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(copy("g.error"));
    const link = [...root.querySelectorAll("a")].find((a) => a.textContent === copy("nav.btn"));
    expect(link?.getAttribute("href")).toBe(INTERIM_BOOKING_URL);
    expect([...root.querySelectorAll("button")].map((b) => b.textContent)).toContain(copy("g.reload"));
  });

  it("lets the next page render after the visitor moves on", () => {
    const root = site();
    go("/pricing");
    expect(root.textContent).toContain("Pricing page");
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
