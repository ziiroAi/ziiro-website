import { describe, expect, it } from "vitest";
import { parseVisit } from "../../../api/funnel/_validate";
import {
  AGENT_IDS, BUCKETS, BUSINESS_TYPES, CHIPS, CONTACT_ERRORS, CTA_FROM, CURRENCIES, DAY_PARTS, DEPARTMENTS,
  DEVICE_CLASSES, FILM_PCTS, INPUT_MODES, NON_OWNER_REASONS, ORDER_VARIANTS, PLAN_VIEWS, REVENUE_BANDS, SEGMENTS,
  STEPS, STILL_REASONS, TEAM_BANDS, TEMPLATES, THEMES, TIERS, YEARS_BANDS,
} from "../../../src/features/funnel/data/contract";
import { FULL_VISIT_FIELDS, VISIT_ID } from "./visit-fields";

const visit = (fields: Record<string, unknown>, step = "S3") =>
  ({ id: VISIT_ID, step, fields: { noticeVersion: "2026-10-08", ...fields } });
const fieldOf = (body: unknown): string => {
  const parsed = parseVisit(body);
  return parsed.ok ? "ok" : parsed.field;
};

describe("parseVisit (§13.2)", () => {
  it("accepts a visit carrying every allowed field", () => {
    const body = { id: VISIT_ID, step: "S9", fields: FULL_VISIT_FIELDS };
    expect(parseVisit(body)).toEqual({ ok: true, value: body });
  });

  it.each(STEPS)("accepts step %s", (step) => {
    expect(fieldOf(visit({}, step))).toBe("ok");
  });

  it.each([
    ["dayPart", DAY_PARTS], ["theme", THEMES], ["deviceClass", DEVICE_CLASSES], ["segment", SEGMENTS],
    ["nonOwnerReason", NON_OWNER_REASONS], ["businessType", BUSINESS_TYPES], ["yearsBand", YEARS_BANDS],
    ["teamBand", TEAM_BANDS], ["revenueBand", REVENUE_BANDS], ["revenueCurrency", CURRENCIES],
    ["inputMode", INPUT_MODES], ["bucketPrimary", BUCKETS], ["template", TEMPLATES],
    ["orderVariant", ORDER_VARIANTS], ["tier", TIERS], ["filmPct", FILM_PCTS], ["ctaFrom", CTA_FROM],
    ["planView", PLAN_VIEWS], ["stillReason", STILL_REASONS],
  ] as const)("accepts every %s option in the contract", (key, values) => {
    for (const value of values) expect(fieldOf(visit({ [key]: value }))).toBe("ok");
  });

  it.each([
    ["chips", CHIPS], ["agentIds", AGENT_IDS], ["discsOpened", DEPARTMENTS], ["contactErrors", CONTACT_ERRORS],
  ] as const)("accepts every %s value in the contract", (key, values) => {
    for (const value of values) expect(fieldOf(visit({ [key]: [value] }))).toBe("ok");
  });

  it.each(["problemText", "businessOther", "matchedPhrases", "name", "email", "phone"])(
    "refuses %s: nothing typed or personal travels in /visit (D13)",
    (key) => {
      expect(fieldOf(visit({ [key]: "x" }))).toBe(key);
    },
  );

  it.each([
    [{ chips: ["leads", "convert", "ads", "team"] }, "chips"],
    [{ chips: ["ads", "ads"] }, "chips"],
    [{ chips: ["Ads burn money"] }, "chips"],
    [{ agentIds: [] }, "agentIds"],
    [{ agentIds: AGENT_IDS.slice(0, 10) }, "agentIds"],
    [{ filmPct: 30 }, "filmPct"],
    [{ secondsToResult: -1 }, "secondsToResult"],
    [{ secondsToResult: 1.5 }, "secondsToResult"],
    [{ landingPath: "/?q=my words" }, "landingPath"],
    [{ referrerHost: "evil.com/path" }, "referrerHost"],
    [{ utm: { source: "ig", foo: "x" } }, "utm"],
    [{ bucketScores: { nope: 1 } }, "bucketScores"],
    [{ webdriver: "yes" }, "webdriver"],
  ])("refuses %j with field %s", (fields, field) => {
    expect(fieldOf(visit(fields))).toBe(field);
  });

  it("needs noticeVersion", () => {
    expect(fieldOf({ id: VISIT_ID, step: "S1", fields: {} })).toBe("noticeVersion");
  });

  it("reports the shape, then the id, then the step", () => {
    expect(fieldOf({ id: VISIT_ID, step: "S1", fields: { noticeVersion: "x" }, name: "A" })).toBe("payload");
    expect(fieldOf({ id: VISIT_ID, step: "S1", fields: [] })).toBe("payload");
    expect(fieldOf({ id: "123", step: "S10", fields: { noticeVersion: "x" } })).toBe("id");
    expect(fieldOf({ id: VISIT_ID, step: "S10", fields: { noticeVersion: "x" } })).toBe("step");
  });
});
