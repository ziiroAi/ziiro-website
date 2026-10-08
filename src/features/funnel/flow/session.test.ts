import { describe, expect, it, vi } from "vitest";
import { funnelSession } from "./session";
import source from "./session.ts?raw";

describe("the funnelSession stub (index §1.3)", () => {
  it("knows no contact, is at the questions, and ignores call-button taps", () => {
    expect(funnelSession.leadContact()).toBeNull();
    expect(funnelSession.stage()).toBe("questions");
    expect(() => funnelSession.reportCta("header")).not.toThrow();
  });

  it("takes a listener and hands back an unsubscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = funnelSession.subscribe(onChange);
    expect(unsubscribe).toBeTypeOf("function");
    unsubscribe();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("has no runtime imports, so the header can load it on every page (index §1.5)", () => {
    const imports = source.split("\n").filter((line) => line.startsWith("import "));
    expect(imports.every((line) => line.startsWith("import type "))).toBe(true);
  });
});
