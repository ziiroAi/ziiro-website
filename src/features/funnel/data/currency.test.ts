import { describe, expect, it } from "vitest";
import { currencyFor } from "./currency";

describe("currencyFor (§5.3, D10)", () => {
  it("uses the country when there is one", () => {
    expect(currencyFor("IN", "Europe/London")).toBe("INR");
    expect(currencyFor("in", null)).toBe("INR");
    expect(currencyFor("GB", "Asia/Kolkata")).toBe("USD");
    expect(currencyFor("US", null)).toBe("USD");
  });

  it("falls back to the time zone when the country is unknown", () => {
    expect(currencyFor(null, "Asia/Kolkata")).toBe("INR");
    expect(currencyFor("", "Asia/Calcutta")).toBe("INR");
    expect(currencyFor(null, "Asia/Dubai")).toBe("USD");
    expect(currencyFor(null, null)).toBe("USD");
  });
});
