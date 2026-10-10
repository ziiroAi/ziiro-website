import { describe, expect, it } from "vitest";
import {
  AGENT_IDS, BUCKETS, CONTACT_ERRORS, DEPARTMENTS, LIMITS, VISIT_FIELD_KEYS, type VisitFields,
} from "@/features/funnel/data/light";
import { PRERENDER_BOOT } from "./boot";
import { initialFlow, reduce, type FlowAction } from "./state";
import { FAKE_PLAN } from "./test/fake-data";
import { answerFields, deviceClassFor, landingFields, stepOf, type LandingWindow } from "./visit";

const STARTER = "Honestly, I'm struggling with ___ because ___.";
const run = (...actions: FlowAction[]) => actions.reduce(reduce, initialFlow(STARTER));
const TYPED = ["Printing press", "Leads go cold after the site visit", "Ananya", "ananya@example.com", "+919876543210"];
const THROUGH_S7: FlowAction[] = [
  { type: "segment", value: "business" },
  { type: "business", value: "other" },
  { type: "businessOther", text: TYPED[0] },
  { type: "businessOtherDone" },
  { type: "years", value: "5_10" },
  { type: "team", value: "6_20" },
  { type: "revenue", value: "band_3", currency: "INR" },
  { type: "problemText", text: TYPED[1] },
  { type: "chip", value: "leads" },
  { type: "problemDone", hasWords: true },
  { type: "contact", patch: { name: TYPED[2], email: TYPED[3], phone: TYPED[4], consent: true } },
  { type: "contactInvalid", fields: ["phone"] },
];
const AT_PLAN: FlowAction[] = [
  ...THROUGH_S7,
  { type: "sendStarted", visitor: { name: TYPED[2], email: TYPED[3] } },
  { type: "planReady", plan: FAKE_PLAN },
  { type: "sendFinished", result: { to: "plan", notice: null, error: null } },
];

const fakeWindow = (over: { url?: string; referrer?: string; width?: number; webdriver?: boolean } = {}): LandingWindow => {
  const url = new URL(over.url ?? "https://ziiroai.com/");
  return {
    location: { pathname: url.pathname, search: url.search, host: url.host },
    document: { referrer: over.referrer ?? "" },
    navigator: { languages: ["en-IN", "en"], language: "en-IN", webdriver: over.webdriver ?? false },
    innerWidth: over.width ?? 390,
  };
};

describe("landingFields (§9, landing)", () => {
  it("says where the visitor came from, with only the keys that hold something", () => {
    const win = fakeWindow({ url: "https://ziiroai.com/?utm_source=ig&utm_campaign=launch&x=1", referrer: "https://www.instagram.com/p/1/" });
    expect(landingFields(win, PRERENDER_BOOT, "Asia/Kolkata")).toEqual({
      noticeVersion: "2026-10-08", landingPath: "/", referrerHost: "www.instagram.com",
      utm: { source: "ig", campaign: "launch" }, timezone: "Asia/Kolkata", locale: "en-IN",
      dayPart: "afternoon", theme: "light", deviceClass: "mobile",
    });
  });

  it("leaves out its own site as the referrer, and an unknown time zone", () => {
    const fields = landingFields(fakeWindow({ referrer: "https://ziiroai.com/products" }), PRERENDER_BOOT, null);
    expect(fields).not.toHaveProperty("referrerHost");
    expect(fields).not.toHaveProperty("timezone");
    expect(fields).not.toHaveProperty("utm");
  });

  it("clips every string to its limit, and flags an automated browser", () => {
    const long = "x".repeat(500);
    const win = fakeWindow({ url: `https://ziiroai.com/${long}?utm_source=${long}`, webdriver: true });
    const fields = landingFields(win, PRERENDER_BOOT, long);
    expect(fields.landingPath).toHaveLength(LIMITS.landingPathChars);
    expect(fields.utm?.source).toHaveLength(LIMITS.utmChars);
    expect(fields.timezone).toHaveLength(LIMITS.timezoneChars);
    expect(fields.webdriver).toBe(true);
  });

  it("sorts screens by width: phone, tablet, desktop", () => {
    expect([deviceClassFor(390), deviceClassFor(768), deviceClassFor(1023), deviceClassFor(1440)])
      .toEqual(["mobile", "tablet", "tablet", "desktop"]);
  });
});

describe("stepOf (§9, step reached)", () => {
  it("is S0 on the greeting, then S1 once S1 has risen", () => {
    expect(stepOf(run(), false)).toBe("S0");
    expect(stepOf(run(), true)).toBe("S1");
  });

  it("is S4 once the team row is forward, and S9 on the plan", () => {
    const s3 = run({ type: "segment", value: "business" }, { type: "business", value: "interior" });
    expect(stepOf(s3, true)).toBe("S3");
    expect(stepOf(reduce(s3, { type: "years", value: "1_3" }), true)).toBe("S4");
    expect(stepOf(run(...AT_PLAN), true)).toBe("S9");
  });

  it("is S1 again after Back to the first question", () => {
    const back = run({ type: "segment", value: "business" }, { type: "popTo", screen: "s1" });
    expect(stepOf(back, false)).toBe("S1");
  });
});

describe("answerFields (§9, D13)", () => {
  it("never carries a typed word: not the S2 box, the S6 box, the name, the email or the phone", () => {
    const text = JSON.stringify(answerFields(run(...AT_PLAN), STARTER));
    for (const typed of TYPED) expect(text).not.toContain(typed);
    expect(text).not.toContain("gone cold");  // matchedPhrases come from typed words
  });

  it("uses only keys /visit accepts", () => {
    const keys = Object.keys(answerFields(run(...AT_PLAN, { type: "progress", fields: { planDepth: 2, ctaFrom: "hero", ctaClicked: true } }), STARTER));
    expect(keys.every((key) => (VISIT_FIELD_KEYS as readonly string[]).includes(key))).toBe(true);
  });

  it("adds chips and the input mode only once S6's 'That's it' is tapped", () => {
    const before = run(...THROUGH_S7.slice(0, 9));
    expect(answerFields(before, STARTER)).not.toHaveProperty("chips");
    expect(answerFields(run(...THROUGH_S7), STARTER)).toMatchObject({ chips: ["leads"], inputMode: "mixed" });
  });

  it("carries the taps, the contact errors, then the plan and the progress", () => {
    const fields = answerFields(run(...AT_PLAN, { type: "planShown", seconds: 48 }), STARTER);
    expect(fields).toMatchObject({
      segment: "business", businessType: "other", yearsBand: "5_10", teamBand: "6_20", revenueBand: "band_3",
      revenueCurrency: "INR", contactErrors: ["phone"], template: "B", orderVariant: "B-convert", tier: "M",
      agentIds: FAKE_PLAN.agentIds, classifierVersion: "kw-1", agentsVersion: "2026-10-04", secondsToResult: 48,
    });
    expect(fields).not.toHaveProperty("jobIds");
  });
});

describe("the body", () => {
  it("stays under /visit's 4,096 bytes with every field at its longest", () => {
    const long = "x".repeat(500);
    const plan = {
      ...FAKE_PLAN,
      agentIds: AGENT_IDS.slice(0, LIMITS.agentIds),
      bucketScores: Object.fromEntries(BUCKETS.map((bucket) => [bucket, LIMITS.bucketScoreMax])),
    };
    const state = run(
      ...THROUGH_S7.slice(0, 10), ...Array.from({ length: 12 }, () => ({ type: "contactInvalid", fields: ["name", "email", "phone"] }) as FlowAction),
      { type: "sendStarted", visitor: { name: "A", email: "a@b.co" } }, { type: "planReady", plan },
      { type: "sendFinished", result: { to: "plan", notice: null, error: null } }, { type: "planShown", seconds: 86_400 },
      { type: "progress", fields: {
        planDepth: LIMITS.planDepthMax, filmPlayed: true, filmPct: 100, ctaFrom: "close", ctaClicked: true,
        planView: "still", stillReason: "slow_connection", discsOpened: DEPARTMENTS.slice(0, LIMITS.discsOpened),
      } },
    );
    const win = fakeWindow({ url: `https://ziiroai.com/${long}?${["source", "medium", "campaign", "term", "content"].map((k) => `utm_${k}=${long}`).join("&")}`, referrer: `https://${long}.com/`, webdriver: true });
    const fields: VisitFields = { ...landingFields(win, PRERENDER_BOOT, long), ...answerFields(state, STARTER) };
    const body = JSON.stringify({ id: "9f1c2a4e-1b2c-4d5e-8f90-123456789abc", step: "S9", fields });
    expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(LIMITS.visitBodyBytes);
    expect(fields.contactErrors).toHaveLength(LIMITS.contactErrors);
    expect(CONTACT_ERRORS).toContain(fields.contactErrors?.[0]);
  });
});
