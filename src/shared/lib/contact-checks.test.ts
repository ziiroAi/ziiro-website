import { describe, expect, it } from "vitest";
import {
  DISPOSABLE_DOMAINS, cleanEcho, cleanName, isDisposableEmail, isE164, isValidEmail, isValidName, toE164,
} from "./contact-checks";

const ANANYA_WORDS = "Enquiries come in, but by the time someone calls back they've gone cold.";

describe("isValidEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isValidEmail("ananya@example.com")).toBe(true);
  });

  it.each(["a@b", "a b@example.com", "<a>@example.com", `${"a".repeat(250)}@example.com`])("refuses %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("refuses a throwaway domain in any case, from the list /contact has always used", () => {
    expect(isDisposableEmail("x@MAILINATOR.com")).toBe(true);
    expect(isValidEmail("x@mailinator.com")).toBe(false);
    expect(DISPOSABLE_DOMAINS.size).toBe(54);
  });
});

describe("cleanEcho (§13.3)", () => {
  it("keeps ordinary words, years and money as they are", () => {
    expect(cleanEcho(ANANYA_WORDS, 140)).toBe(ANANYA_WORDS);
    expect(cleanEcho("Since 2019 we made ₹50,000 a month.", 140)).toBe("Since 2019 we made ₹50,000 a month.");
    expect(cleanEcho("We do 3.5 lakh a month, e.g. tiles.", 140)).toBe("We do 3.5 lakh a month, e.g. tiles.");
  });

  it.each([
    ["see https://evil.example/x?y=1 now", "see now"],
    ["go to www.evil.com today", "go to today"],
    ["mail me at x@evil.com please", "mail me at please"],
    ["visit evil.co.in/offer today", "visit today"],
    ["call 98765 43210 now", "call now"],
    ["फोन ९८७६५४३२१० करो", "फोन करो"],
    ["one\ntwo\r\nthree", "one two three"],
    ["https://evil.com", ""],
  ])("cleans %j to %j", (input, output) => {
    expect(cleanEcho(input, 140)).toBe(output);
  });

  it("cuts at the limit with an ellipsis, without splitting an emoji", () => {
    const words = cleanEcho("word ".repeat(60), 140);
    expect(Array.from(words)).toHaveLength(140);
    expect(words.endsWith("…")).toBe(true);
    expect(cleanEcho("😀".repeat(200), 140)).toBe(`${"😀".repeat(139)}…`);
  });
});

describe("names (§13.2, §13.3)", () => {
  it.each(["Ananya", "अनन्या", "José María", "  Ananya  ", "a".repeat(80)])("accepts %j", (name) => {
    expect(isValidName(name)).toBe(true);
  });

  it.each(["", "   ", "😀", "12345", "https://evil.com", "a".repeat(81)])("refuses %j", (name) => {
    expect(isValidName(name)).toBe(false);
  });

  it("prints a name on one line, with links removed", () => {
    expect(cleanName("  Ananya \n Rao ")).toBe("Ananya Rao");
    expect(cleanName("Ananya https://evil.com")).toBe("Ananya");
  });
});

describe("phones (§4.4)", () => {
  it.each([
    ["+91 98765 43210", "+91", "+919876543210"],
    ["098765 43210", "+91", "+919876543210"],
    ["0091 98765 43210", "+91", "+919876543210"],
    ["(415) 555-0132", "+1", "+14155550132"],
  ])("turns %j with %s into %s", (raw, dialCode, e164) => {
    expect(toE164(raw, dialCode)).toBe(e164);
  });

  it.each(["", "12", "+0123456789", "abc"])("gives null for %j", (raw) => {
    expect(toE164(raw, "+91")).toBeNull();
  });

  it("checks E.164 strictly", () => {
    expect(isE164("+919876543210")).toBe(true);
    expect(isE164("919876543210")).toBe(false);
  });
});
