import { beforeEach, describe, expect, it, vi } from "vitest";
import { funnelSession, setCtaReporter, setLeadContact, setStage } from "./session";
import source from "./session.ts?raw";

beforeEach(() => {
  setLeadContact(null);
  setStage("questions");
  setCtaReporter(null);
});

describe("funnelSession (index §1.3, D6, D14)", () => {
  it("knows no contact until S7 has been sent, and keeps the same object until it changes", () => {
    expect(funnelSession.leadContact()).toBeNull();
    setLeadContact({ name: "Ananya", email: "ananya@example.com" });
    const first = funnelSession.leadContact();
    expect(first).toEqual({ name: "Ananya", email: "ananya@example.com" });
    setLeadContact({ name: "Ananya", email: "ananya@example.com" });
    expect(funnelSession.leadContact()).toBe(first);  // useSyncExternalStore needs a stable snapshot
  });

  it("tells subscribers when the stage or the contact changes, and only then", () => {
    const onChange = vi.fn();
    const unsubscribe = funnelSession.subscribe(onChange);
    setStage("questions");
    expect(onChange).not.toHaveBeenCalled();
    setStage("plan");
    expect(funnelSession.stage()).toBe("plan");
    setLeadContact({ name: "Ananya", email: "ananya@example.com" });
    expect(onChange).toHaveBeenCalledTimes(2);
    unsubscribe();
    setStage("questions");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("does nothing on a call-button tap while no funnel is mounted", () => {
    expect(() => funnelSession.reportCta("header")).not.toThrow();
  });

  it("hands a call-button tap to the mounted funnel, which saves it on its visit", () => {
    const report = vi.fn();
    setCtaReporter(report);
    funnelSession.reportCta("header");
    expect(report).toHaveBeenCalledWith("header");
  });

  it("still has no runtime imports, so the header can load it on every page (index §1.5)", () => {
    const imports = source.split("\n").filter((line) => line.startsWith("import "));
    expect(imports.every((line) => line.startsWith("import type "))).toBe(true);
  });
});
