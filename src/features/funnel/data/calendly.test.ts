import { describe, expect, it } from "vitest";
import { INTERIM_BOOKING_URL } from "../../pricing/entities/rates";
import { calendlyUrl } from "./calendly";

describe("calendlyUrl (§6.3)", () => {
  it("starts from the interim booking link", () => {
    expect(INTERIM_BOOKING_URL).toBe("https://calendly.com/ziiro-work/30min");
  });

  it("adds name and email as Calendly's link parameters", () => {
    expect(calendlyUrl("Ananya Rao", "ananya@studio.in")).toBe(`${INTERIM_BOOKING_URL}?name=Ananya%20Rao&email=ananya%40studio.in`);
  });

  it("encodes spaces and symbols, so the link can't break", () => {
    expect(calendlyUrl("A&B Studio #1", "a+b@x.co")).toBe(`${INTERIM_BOOKING_URL}?name=A%26B%20Studio%20%231&email=a%2Bb%40x.co`);
    expect(calendlyUrl("José", "")).toBe(`${INTERIM_BOOKING_URL}?name=Jos%C3%A9`);
    expect(calendlyUrl("अनु", "")).toBe(`${INTERIM_BOOKING_URL}?name=%E0%A4%85%E0%A4%A8%E0%A5%81`);
  });

  it("leaves out whatever is blank", () => {
    expect(calendlyUrl("", "a@b.co")).toBe(`${INTERIM_BOOKING_URL}?email=a%40b.co`);
    expect(calendlyUrl("   ", "")).toBe(INTERIM_BOOKING_URL);
  });
});
