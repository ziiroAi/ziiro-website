import { afterEach, describe, expect, it, vi } from "vitest";
import { DIAL_CODES, dialCodeFor, localTimeZone } from "./region";

describe("where the visitor is (§4.4, D10)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the device's time zone", () => {
    expect(localTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("asks Intl once, on the first call, not when the module loads (W15-E)", async () => {
    vi.resetModules();
    const spy = vi.spyOn(Intl, "DateTimeFormat");
    const fresh = await import("./region");
    expect(spy).not.toHaveBeenCalled();
    const zone = fresh.localTimeZone();
    expect(fresh.localTimeZone()).toBe(zone);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("prefills the dial code of the country /visit returned", () => {
    expect(dialCodeFor("IN", null)).toBe("+91");
    expect(dialCodeFor("us", "Asia/Kolkata")).toBe("+1");
    expect(dialCodeFor("ZZ", null)).toBe("");
  });

  it("falls back to India's code on India's clock, and to none elsewhere", () => {
    expect(dialCodeFor(null, "Asia/Kolkata")).toBe("+91");
    expect(dialCodeFor(null, "Asia/Calcutta")).toBe("+91");
    expect(dialCodeFor(null, "Europe/London")).toBe("");
    expect(dialCodeFor(null, null)).toBe("");
  });

  it("writes every code as + and digits", () => {
    for (const code of Object.values(DIAL_CODES)) expect(code).toMatch(/^\+\d{1,4}$/);
  });
});
