import { describe, expect, it, vi } from "vitest";
import { checkContact, readPhone } from "./contact";

// The shape of lane B's checks, faked so this test doesn't depend on their exact rules.
vi.mock("@/shared/lib/contact-checks", () => ({
  isValidName: (name: string) => /\p{L}/u.test(name) && name.length <= 80,
  isValidEmail: (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !email.endsWith("@mailinator.com"),
  toE164: (raw: string, dialCode: string) => {
    const digits = raw.replace(/[\s()-]/g, "");
    const full = digits.startsWith("+") ? digits : `${dialCode}${digits.replace(/^0+/, "")}`;
    return /^\+[1-9]\d{7,14}$/.test(full) ? full : null;
  },
}));

const DRAFT = { name: " Ananya ", email: " ananya@example.com ", phone: "+91 ", consent: true };

describe("readPhone (§4.4)", () => {
  it("reads an empty box, or only the prefilled code, as blank", () => {
    expect(readPhone("", "+91")).toEqual({ kind: "blank" });
    expect(readPhone("+91 ", "+91")).toEqual({ kind: "blank" });
  });

  it("reads a number into E.164, and anything else as bad", () => {
    expect(readPhone("+91 98765 43210", "+91")).toEqual({ kind: "ok", e164: "+919876543210" });
    expect(readPhone("098765 43210", "+91")).toEqual({ kind: "ok", e164: "+919876543210" });
    expect(readPhone("+91 12", "+91")).toEqual({ kind: "bad" });
  });
});

describe("checkContact (§4.4, D19)", () => {
  it("passes a good contact, trimmed, with no phone key when the phone is blank", () => {
    expect(checkContact(DRAFT, "+91")).toEqual({ ok: true, contact: { name: "Ananya", email: "ananya@example.com" } });
  });

  it("adds a typed phone in E.164", () => {
    expect(checkContact({ ...DRAFT, phone: "+91 98765 43210" }, "+91")).toEqual({
      ok: true, contact: { name: "Ananya", email: "ananya@example.com", phone: "+919876543210" },
    });
  });

  it("names every field that fails, in the form's order", () => {
    expect(checkContact({ name: "  ", email: "a@mailinator.com", phone: "12", consent: false }, "+91")).toEqual({
      ok: false, fields: ["name", "email", "phone", "consent"],
    });
  });
});
