import { describe, expect, it } from "vitest";
import * as c from "./contract";

const LISTS = {
  STEPS: c.STEPS, SEGMENTS: c.SEGMENTS, NON_OWNER_REASONS: c.NON_OWNER_REASONS, BUSINESS_TYPES: c.BUSINESS_TYPES,
  YEARS_BANDS: c.YEARS_BANDS, TEAM_BANDS: c.TEAM_BANDS, REVENUE_BANDS: c.REVENUE_BANDS, CURRENCIES: c.CURRENCIES,
  CHIPS: c.CHIPS, INPUT_MODES: c.INPUT_MODES, BUCKETS: c.BUCKETS, TEMPLATES: c.TEMPLATES,
  ORDER_VARIANTS: c.ORDER_VARIANTS, LANES: c.LANES, TIERS: c.TIERS, DEPARTMENTS: c.DEPARTMENTS, DISCS: c.DISCS,
  AGENT_IDS: c.AGENT_IDS, JOB_STATUSES: c.JOB_STATUSES, DAY_PARTS: c.DAY_PARTS, THEMES: c.THEMES,
  DEVICE_CLASSES: c.DEVICE_CLASSES, CONTACT_ERRORS: c.CONTACT_ERRORS, CTA_FROM: c.CTA_FROM, FILM_PCTS: c.FILM_PCTS,
  PLAN_VIEWS: c.PLAN_VIEWS, STILL_REASONS: c.STILL_REASONS, LEAD_FIELDS: c.LEAD_FIELDS, LEAD_FLAGS: c.LEAD_FLAGS,
  PLAN_EMAIL_STATUSES: c.PLAN_EMAIL_STATUSES, VISIT_FIELD_KEYS: c.VISIT_FIELD_KEYS,
};

describe("the funnel contract", () => {
  it.each(Object.entries(LISTS))("%s has no repeated value", (_name, values) => {
    expect(new Set<unknown>(values).size).toBe(values.length);
  });

  it("has one ID per option on screen (§4.3)", () => {
    expect(c.SEGMENTS).toHaveLength(5);          // s1.o1–s1.o5
    expect(c.NON_OWNER_REASONS).toHaveLength(5); // s1b.o1–s1b.o5
    expect(c.BUSINESS_TYPES).toHaveLength(12);   // s2.o
    expect(c.YEARS_BANDS).toHaveLength(5);       // s3.o
    expect(c.TEAM_BANDS).toHaveLength(5);        // s4.o
    expect(c.REVENUE_BANDS).toHaveLength(6);     // five bands and s5.skip
    expect(c.CHIPS).toHaveLength(9);             // s6.chips
  });

  it("lists the 33 agents by number, each under one of the 7 departments", () => {
    expect(c.AGENT_IDS).toHaveLength(33);
    expect(c.AGENT_IDS[15]).toBe("deals-inbound");          // 16, Enquiry responder
    expect(c.AGENT_IDS[28]).toBe("back-office-money-in");   // 29, Collections agent
    expect(c.AGENT_IDS[32]).toBe("back-office-talent");     // 33, Hiring assistant
    for (const id of c.AGENT_IDS) {
      expect(c.DEPARTMENTS.filter((d) => id.startsWith(`${d}-`))).toHaveLength(1);
    }
  });

  it("maps every chip to its problem and every department to its disc (§5.2, §6.7)", () => {
    expect(Object.keys(c.CHIP_BUCKET).sort()).toEqual([...c.CHIPS].sort());
    expect(c.CHIP_BUCKET.followups).toBe("sales");
    expect(c.DEPARTMENT_DISC).toEqual({
      intelligence: "G07", marketing: "G06", sales: "G05", deals: "G04",
      customer: "G03", operations: "G02", "back-office": "G01",
    });
  });

  it("sizes the tiers 3, 6 and 9, and keeps the schema's limits (§5.3, Appendix C)", () => {
    expect(c.TIER_SIZE).toEqual({ S: 3, M: 6, L: 9 });
    expect(c.LIMITS).toMatchObject({
      nameChars: 80, problemTextChars: 600, businessOtherChars: 80, chips: 3, agentIds: 9,
      visitBodyBytes: 4_096, leadBodyBytes: 10_000, contactErrors: 10, discsOpened: 7,
    });
  });

  it("tells allowed values from others with isOneOf", () => {
    expect(c.isOneOf(c.CHIPS, "ads")).toBe(true);
    expect(c.isOneOf(c.CHIPS, "Ads burn money")).toBe(false);
    expect(c.isOneOf(c.FILM_PCTS, 50)).toBe(true);
    expect(c.isOneOf(c.FILM_PCTS, "50")).toBe(false);
  });
});
