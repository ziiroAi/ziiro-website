// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type VisitIdModule = typeof import("./visit-id");
let visits: VisitIdModule;
let n = 0;
const nextId = () => `id-${++n}`;

beforeEach(async () => {
  vi.resetModules();   // a fresh page: no visit in memory
  visits = await import("./visit-id");
  sessionStorage.clear();
  n = 0;
});
afterEach(() => vi.restoreAllMocks());

describe("the visit ID (§13.2, §4.1)", () => {
  it("has none before the funnel makes one", () => {
    expect(visits.peekVisit()).toBeNull();
  });

  it("makes a v4 UUID on landing and keeps it in sessionStorage", () => {
    const visit = visits.startVisit();
    expect(visit.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(JSON.parse(sessionStorage.getItem("ziiro.funnel.visit") ?? "{}")).toEqual({ id: visit.id, lead: false, step: "S0" });
  });

  it("keeps a visit that hasn't sent a lead across a reload, and starts a new one after a send", () => {
    const first = visits.startVisit(nextId);
    expect(visits.startVisit(nextId).id).toBe(first.id);
    visits.markLeadSent();
    expect(visits.startVisit(nextId)).toEqual({ id: "id-2", lead: false, step: "S0" });
  });

  it("starts a new visit when the visitor leaves the plan", () => {
    visits.startVisit(nextId);
    visits.markLeadSent();
    expect(visits.rotateVisit(nextId)).toEqual({ id: "id-2", lead: false, step: "S0" });
  });

  it("keeps the furthest step", () => {
    visits.startVisit(nextId);
    visits.markStep("S5");
    visits.markStep("S2");
    expect(visits.peekVisit()?.step).toBe("S5");
  });

  it("lives in memory when storage is blocked (§10)", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const visit = visits.currentVisit(nextId);
    expect(visits.currentVisit(nextId)).toEqual(visit);
  });

  it("still makes a v4 UUID where crypto.randomUUID is missing (iOS Safari before 15.4, review M5)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    try {
      const ids = [visits.rotateVisit().id, visits.rotateVisit().id];
      for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(ids[0]).not.toBe(ids[1]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
