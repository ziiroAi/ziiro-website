import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { UpstreamError, type TurnstileOutcome } from "../../../api/_lib";
import type {
  ContactRecord, FunnelDb, PlanEmailRecord, StoredPlanEmailStatus, VisitAnswers, VisitRecord,
} from "../../../api/funnel/_db";
import { createLeadHandler, type OutgoingEmail } from "../../../api/funnel/lead";

const IP = "203.0.113.7";
const ID = ananya.visitId;
const ANSWERS: VisitAnswers = {
  segment: "business", business_type: "interior", years_band: "5_10", team_band: "6_20",
  revenue_band: "band_3", revenue_currency: "INR",
};

type Options = {
  dbDown?: boolean;
  stored?: StoredPlanEmailStatus | null;              // this visit already has a lead, with this plan email status
  raceLost?: boolean;                                 // another request saves this visit's lead first
  limited?: boolean;
  turnstile?: TurnstileOutcome;
  failSend?: (email: OutgoingEmail) => number | null; // a Resend status to throw, or null to send
};

function setup(options: Options = {}) {
  const saved: { visit: VisitRecord; contact: ContactRecord }[] = [];
  const rows: PlanEmailRecord[] = [];
  const sent: OutgoingEmail[] = [];
  const tries: OutgoingEmail[] = [];
  const turnstile = vi.fn(async (_token: string | undefined, _ip: string): Promise<TurnstileOutcome> =>
    options.turnstile ?? "passed");
  const db: FunnelDb = {
    async upsertVisit() { throw new Error("not used by /lead"); },
    async findLead() {
      if (options.dbDown) throw new Error("connection refused");
      if (options.stored !== undefined) return { status: options.stored };
      return options.raceLost && saved.length > 0 ? { status: "sent" } : null;
    },
    async saveLead(visit, contact) {
      if (options.dbDown) throw new Error("connection refused");
      saved.push({ visit, contact });
      return options.raceLost ? { duplicate: true } : { contactId: "c-1", answers: ANSWERS };
    },
    async savePlanEmail(row) {
      if (options.dbDown) throw new Error("connection refused");
      rows.push(row);
    },
  };
  const handle = createLeadHandler({
    db: () => db,
    rateLimited: () => options.limited ?? false,
    turnstile,
    async send(email) {
      tries.push(email);
      const status = options.failSend?.(email) ?? null;
      if (status !== null) throw new UpstreamError("resend", status);
      sent.push(email);
      return { id: `re_${sent.length}` };
    },
    jobIdsFor: (ids) => ids.map((id) => `${id}:job`),
    env: () => ({
      teamInbox: "team@ziiroai.com", planFrom: "Adyut at ziiro <adyut@ziiroai.com>",
      planReplyTo: "team@ziiroai.com", alertFrom: "Ziiro AI <contact@ziiroai.com>",
    }),
    now: () => new Date("2026-10-19T06:30:00.000Z"),
  });
  return { handle, saved, rows, sent, tries, turnstile };
}

const send = (body: unknown, type = "application/json") =>
  new Request("https://ziiroai.com/api/funnel/lead", {
    method: "POST",
    headers: { "content-type": type, origin: "https://ziiroai.com", "x-forwarded-for": IP, "x-vercel-ip-country": "IN" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const lead = (over: Record<string, unknown> = {}) => ({ ...ananya, ...over });
const keys = (emails: OutgoingEmail[]) => emails.map((email) => email.idempotencyKey);

describe("POST /api/funnel/lead (§13.2)", () => {
  let logs: string[];
  beforeEach(() => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((line) => { logs.push(String(line)); });
    vi.spyOn(console, "error").mockImplementation((line) => { logs.push(String(line)); });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  describe("a clean first try", () => {
    it("saves the lead with the visit's final snapshot, and answers sent", async () => {
      const { handle, saved } = setup();
      const res = await handle(send(lead()));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(saved[0].visit).toMatchObject({
        id: ID, last_step: "S8", notice_version: "2026-10-08", country: "IN", template: "B", tier: "M",
        job_ids: ananya.plan.agentIds.map((id) => `${id}:job`),
      });
      expect(saved[0].contact).toMatchObject({
        visit_id: ID, name: "Ananya", email: "ananya@example.com", phone_e164: null, business_other: null,
        problem_text: ananya.answers.problemText, matched_phrases: ["calls back", "gone cold"],
        consent_version: "2026-10-08", flag: null,
      });
    });

    it("sends the alert to the team first, then the plan email to her", async () => {
      const { handle, sent } = setup();
      await handle(send(lead()));
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
      expect(sent[0]).toMatchObject({ to: ["team@ziiroai.com"], from: "Ziiro AI <contact@ziiroai.com>", replyTo: "ananya@example.com" });
      expect(sent[0].subject).toMatch(/^New funnel lead: Ananya, /);
      expect(sent[1]).toMatchObject({ to: ["ananya@example.com"], from: "Adyut at ziiro <adyut@ziiroai.com>", replyTo: "team@ziiroai.com" });
    });

    it("records the plan email with Resend's id and the jobs it listed", async () => {
      const { handle, rows } = setup();
      await handle(send(lead()));
      expect(rows).toEqual([{
        contact_id: "c-1", resend_id: "re_2", status: "sent", agent_ids: ananya.plan.agentIds,
        job_ids: ananya.plan.agentIds.map((id) => `${id}:job`), error_name: null,
      }]);
    });
  });

  describe("the spam check and the rate limit (§13.2 steps 4 and 5)", () => {
    it.each(["refused", "missing"] as const)("answers 403 and saves nothing when the check says %s on a first try", async (outcome) => {
      const { handle, saved, tries } = setup({ turnstile: outcome });
      const res = await handle(send(lead()));
      expect(res.status).toBe(403);
      expect(saved).toEqual([]);
      expect(tries).toEqual([]);
    });

    it.each([
      ["missing", "turnstile_unverified", "no token came with it"],
      ["refused", "turnstile_failed", "refused"],
    ] as const)("saves a second try whose check says %s, flagged %s, with the alert and no plan email", async (outcome, flag, said) => {
      const { handle, saved, sent, rows } = setup({ turnstile: outcome });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved[0].contact.flag).toBe(flag);
      expect(keys(sent)).toEqual([`alert-${ID}`]);
      expect(sent[0].text.split("\n")[0]).toMatch(new RegExp(`^FLAGGED \\(${flag}\\)\\. `));
      expect(sent[0].text).toContain(`Spam check: ${said}\n`);
      expect(rows[0]).toMatchObject({ status: "held", resend_id: null });
    });

    it("answers 429 on a first try past the limit, without asking Turnstile", async () => {
      const { handle, saved, turnstile } = setup({ limited: true });
      const res = await handle(send(lead()));
      expect(res.status).toBe(429);
      expect(saved).toEqual([]);
      expect(turnstile).not.toHaveBeenCalled();
    });

    it("saves a second try past the limit, flagged rate_limited, and holds the plan email", async () => {
      const { handle, saved, sent } = setup({ limited: true });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved[0].contact.flag).toBe("rate_limited");
      expect(keys(sent)).toEqual([`alert-${ID}`]);
    });

    it("asks Turnstile with the token and the connection's address", async () => {
      const { handle, turnstile } = setup();
      await handle(send(lead()));
      expect(turnstile).toHaveBeenCalledWith("XXXX.DUMMY.TOKEN.XXXX", IP);
    });
  });

  describe("when something fails (§10)", () => {
    it("still sends the alert, marked as the only copy, and the plan email when the database is down", async () => {
      const { handle, sent } = setup({ dbDown: true });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
      expect(sent[0].text.split("\n")[0]).toBe("The database write failed. This email is the only copy of this lead.");
    });

    it("answers 502, and sends no plan email, when the database and the alert both fail", async () => {
      const { handle, tries } = setup({ dbDown: true, failSend: () => 500 });
      const res = await handle(send(lead()));
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ success: false });
      expect(keys(tries)).toEqual([`alert-${ID}`]);
    });

    it("counts an alert Resend answers 409 for as sent: one under that key has gone or is going", async () => {
      const { handle } = setup({ dbDown: true, failSend: (email) => (email.idempotencyKey.startsWith("alert-") ? 409 : null) });
      expect((await handle(send(lead()))).status).toBe(200);
    });

    it("tries the plan email twice, then records it failed and sends the send-by-hand alert", async () => {
      const { handle, tries, sent, rows } = setup({ failSend: (email) => (email.idempotencyKey.startsWith("plan-") ? 500 : null) });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "failed" });
      expect(keys(tries)).toEqual([`alert-${ID}`, `plan-${ID}`, `plan-${ID}`, `alert-failed-${ID}`]);
      expect(sent[1].text.split("\n")[0]).toBe("Plan email NOT sent. Send it by hand today.");
      expect(rows[0]).toMatchObject({ status: "failed", resend_id: null, error_name: "resend_500" });
    });
  });

  describe("a repeat send for the same visit (§13.2 step 2)", () => {
    it.each([
      ["sent", "sent"], ["sent_by_hand", "sent"], ["delivered", "sent"], ["held", "held"],
      ["failed", "failed"], ["bounced", "failed"], [null, "failed"],
    ] as const)("answers a stored %s with %s, and does nothing else", async (stored, planEmail) => {
      const { handle, saved, tries, turnstile } = setup({ stored });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail });
      expect(saved).toEqual([]);
      expect(tries).toEqual([]);
      expect(turnstile).not.toHaveBeenCalled();
    });

    it("answers with the first request's result when it loses the race to save", async () => {
      const { handle, tries } = setup({ raceLost: true });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(tries).toEqual([]);
    });
  });

  describe("the request itself", () => {
    it.each([
      [lead({ email: "x@mailinator.com" }), "email"],
      [lead({ visitId: "nope" }), "payload"],
    ])("answers 400 with the field", async (body, field) => {
      const { handle } = setup();
      const res = await handle(send(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ success: false, field });
    });

    it("answers 415 to a body that isn't JSON, and 400 to one over 10 KB", async () => {
      const { handle } = setup();
      expect((await handle(send("{}", "text/plain"))).status).toBe(415);
      const big = lead({ answers: { ...ananya.answers, problemText: "x".repeat(12_000) } });
      expect((await handle(send(big))).status).toBe(400);
    });
  });

  it("never logs a submitted field or the IP", async () => {
    await setup().handle(send(lead()));
    await setup({ dbDown: true }).handle(send(lead()));
    await setup().handle(send(lead({ name: "" })));
    await setup({ turnstile: "refused" }).handle(send(lead()));
    expect(logs.some((line) => line.includes("funnel.lead.saved"))).toBe(true);
    expect(logs.join("\n")).not.toMatch(/Ananya|ananya@example\.com|203\.0\.113\.7|calls back|gone cold/);
  });
});
