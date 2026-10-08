import { describe, expect, it } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { parseLead, visitIdOf } from "../../../api/funnel/_validate";
import { AGENT_IDS } from "../../../src/features/funnel/data/contract";

const lead = (over: Record<string, unknown> = {}) => ({ ...ananya, ...over });
const answers = (over: Record<string, unknown>) => lead({ answers: { ...ananya.answers, ...over } });
const plan = (over: Record<string, unknown>) => lead({ plan: { ...ananya.plan, ...over } });
const fieldOf = (body: unknown): string => {
  const parsed = parseLead(body);
  return parsed.ok ? "ok" : parsed.field;
};

describe("parseLead (§13.2 step 3)", () => {
  it("accepts Ananya's lead", () => {
    expect(parseLead(ananya)).toEqual({ ok: true, value: ananya });
    expect(visitIdOf(ananya)).toBe(ananya.visitId);
  });

  it.each([
    ["an E.164 phone", lead({ phone: "+919876543210" })],
    ["a blank phone", lead({ phone: "" })],
    ["a second try", lead({ retry: true })],
    ["an email with spaces around it", lead({ email: " ananya@example.com " })],
    ["the Other business text", answers({ businessOther: "Printing press" })],
    ["600 characters over two lines", answers({ problemText: `${"a".repeat(299)}\n${"b".repeat(300)}` })],
    ["three chips and no words", answers({ problemText: undefined, chips: ["leads", "convert", "ads"], inputMode: "chips" })],
  ])("accepts %s", (_label, body) => {
    expect(fieldOf(body)).toBe("ok");
  });

  it.each(["", "😀", "12345", "https://evil.com", "a".repeat(81)])("refuses the name %j", (name) => {
    expect(fieldOf(lead({ name }))).toBe("name");
  });

  it.each(["nope", "a@b", "x@mailinator.com"])("refuses the email %j", (email) => {
    expect(fieldOf(lead({ email }))).toBe("email");
  });

  it.each(["98765", "+0123456789", 919876543210])("refuses the phone %j", (phone) => {
    expect(fieldOf(lead({ phone }))).toBe("phone");
  });

  it.each([
    ["not given", { given: false, version: "2026-10-08" }],
    ["an old version", { given: true, version: "2026-01-01" }],
    ["missing", undefined],
    ["an extra key", { given: true, version: "2026-10-08", at: "now" }],
  ])("refuses consent that is %s", (_label, consent) => {
    expect(fieldOf(lead({ consent }))).toBe("consent");
  });

  it.each([
    ["a bad visit ID", lead({ visitId: "nope" })],
    ["an extra top-level key", lead({ extra: 1 })],
    ["no agents", plan({ agentIds: [] })],
    ["ten agents", plan({ agentIds: AGENT_IDS.slice(0, 10) })],
    ["an unknown agent", plan({ agentIds: ["deals-inbound", "nobody"] })],
    ["601 characters of words", answers({ problemText: "a".repeat(601) })],
    ["four chips", answers({ chips: ["leads", "convert", "ads", "team"] })],
    ["a chip label instead of its ID", answers({ chips: ["Ads burn money"] })],
    ["an unknown template", plan({ template: "C" })],
    ["a retry that isn't true or false", lead({ retry: "yes" })],
    ["a 3,000-character token", lead({ turnstileToken: "x".repeat(3_000) })],
    ["a 61-character matched phrase", plan({ matchedPhrases: ["a".repeat(61)] })],
    ["a version with a space", plan({ agentsVersion: "2026 10 04" })],
    ["a plan with no fallback", plan({ fallback: undefined })],
    ["a fallback that isn't true or false", plan({ fallback: "no" })],
  ])("reports %s as payload", (_label, body) => {
    expect(fieldOf(body)).toBe("payload");
  });

  it("reports the name first, then the email, then the phone, then consent", () => {
    expect(fieldOf(lead({ name: "", email: "nope", phone: "1", consent: undefined }))).toBe("name");
    expect(fieldOf(lead({ email: "nope", phone: "1", consent: undefined }))).toBe("email");
    expect(fieldOf(lead({ phone: "1", consent: undefined }))).toBe("phone");
  });
});
