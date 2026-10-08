import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ananya from "../../fixtures/ananya-lead.json";
import { UpstreamError, isRateLimited, type TurnstileOutcome } from "../../../api/_lib";
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
  limited?: boolean;                                  // the first-try limit, per connection
  limitedRetry?: boolean;                             // the second-try limit, per connection (review H1)
  recentFlagged?: number;                             // flagged contacts saved in the last hour, this one included
  countDown?: boolean;                                // the flagged count can't be read
  production?: boolean;                               // VERCEL_ENV is production (default true)
  realLimiter?: boolean;                              // api/_lib's own in-memory limiter, not the fake
  countFromSaved?: boolean;                           // the flagged count is the flagged rows saved so far
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
    async countRecentFlagged() {
      if (options.dbDown || options.countDown) throw new Error("connection refused");
      if (options.countFromSaved) return saved.filter((row) => row.contact.flag !== null).length;
      return options.recentFlagged ?? 1;
    },
  };
  const handle = createLeadHandler({
    db: () => db,
    rateLimited: options.realLimiter
      ? isRateLimited
      : (key) => (key.startsWith("funnel-lead-retry:") ? options.limitedRetry : options.limited) ?? false,
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
      production: options.production ?? true,
    }),
    now: () => new Date("2026-10-19T06:30:00.000Z"),
  });
  return { handle, saved, rows, sent, tries, turnstile };
}

const send = (body: unknown, type = "application/json", ip = IP) =>
  new Request("https://ziiroai.com/api/funnel/lead", {
    method: "POST",
    headers: { "content-type": type, origin: "https://ziiroai.com", "x-forwarded-for": ip, "x-vercel-ip-country": "IN" },
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

    it("still asks Turnstile on a second try past the limit, and sends the plan when it passes (review M2)", async () => {
      const { handle, saved, sent, turnstile } = setup({ limited: true });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(turnstile).toHaveBeenCalledOnce();
      expect(saved[0].contact.flag).toBeNull();
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
    });

    it("flags a second try past the limit by its spam check when that fails (review M2)", async () => {
      const { handle, saved, sent } = setup({ limited: true, turnstile: "missing" });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved[0].contact.flag).toBe("turnstile_unverified");
      expect(keys(sent)).toEqual([`alert-${ID}`]);
    });

    it.each(["missing", "refused"] as const)(
      "answers 429 to a second try past the second-try limit whose check says %s, and saves and sends nothing (review H1)",
      async (outcome) => {
        const { handle, saved, tries } = setup({ limitedRetry: true, turnstile: outcome });
        const res = await handle(send(lead({ retry: true })));
        expect(res.status).toBe(429);
        expect(saved).toEqual([]);
        expect(tries).toEqual([]);
      },
    );

    it("saves a second try past the second-try limit, unflagged with the plan email, when its token passes (recheck M2)", async () => {
      const { handle, saved, sent } = setup({ limitedRetry: true });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(saved[0].contact.flag).toBeNull();
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
    });

    it("saves a second try past the second-try limit while the check is down, flagged turnstile_unavailable (recheck M2)", async () => {
      const { handle, saved } = setup({ limitedRetry: true, turnstile: "unavailable" });
      const res = await handle(send(lead({ retry: true })));
      expect(res.status).toBe(200);
      expect(saved[0].contact.flag).toBe("turnstile_unavailable");
    });

    it("caps passing over-limit second tries at 10 per IP, then 429 with no save (recheck M2 follow-up)", async () => {
      const { handle, saved, sent } = setup({ realLimiter: true });
      const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Date.now()}-cap`;
      const answers: number[] = [];
      for (let visitor = 0; visitor < 30; visitor += 1) {
        const body = lead({ visitId: crypto.randomUUID() });
        const first = await handle(send(body, "application/json", ip));
        const final = first.status === 429 ? await handle(send({ ...body, retry: true }, "application/json", ip)) : first;
        answers.push(final.status);
      }
      // 5 first tries, 2 second tries under their limit, then 10 passing over-limit second tries.
      expect(saved).toHaveLength(17);
      expect(answers.filter((status) => status === 429)).toHaveLength(13);
      expect(sent).toHaveLength(34);
    });

    it("saves all 9 visitors on one shared IP with valid tokens, with the real limiter (worker-3's recheck repro)", async () => {
      const { handle, saved } = setup({ realLimiter: true });
      const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Date.now()}`;
      const answers: number[] = [];
      for (let visitor = 0; visitor < 9; visitor += 1) {
        const body = lead({ visitId: crypto.randomUUID() });
        const first = await handle(send(body, "application/json", ip));
        const final = first.status === 429 ? await handle(send({ ...body, retry: true }, "application/json", ip)) : first;
        answers.push(final.status);
      }
      expect(answers).toEqual(Array(9).fill(200));
      expect(saved).toHaveLength(9);
      expect(saved.every((row) => row.contact.flag === null)).toBe(true);
    });

    it("answers 503 on a first try when the spam check is down, and saves nothing (review M1)", async () => {
      const { handle, saved, tries } = setup({ turnstile: "unavailable" });
      const res = await handle(send(lead()));
      expect(res.status).toBe(503);
      expect(saved).toEqual([]);
      expect(tries).toEqual([]);
    });

    it("saves a second try while the spam check is down, flagged turnstile_unavailable, and says so in the subject (review M1)", async () => {
      const { handle, saved, sent } = setup({ turnstile: "unavailable" });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved[0].contact.flag).toBe("turnstile_unavailable");
      expect(sent[0].subject.startsWith("SPAM CHECK DOWN, not spam: ")).toBe(true);
    });

    it("asks Turnstile with the token and the connection's address", async () => {
      const { handle, turnstile } = setup();
      await handle(send(lead()));
      expect(turnstile).toHaveBeenCalledWith("XXXX.DUMMY.TOKEN.XXXX", IP);
    });
  });

  describe("a flood of flagged saves (review H1)", () => {
    const flagged = { turnstile: "missing" as const };

    it("alerts a flagged lead while the last 24 hours' flagged saves are at the ceiling", async () => {
      const { handle, sent } = setup({ ...flagged, recentFlagged: 20 });
      await handle(send(lead({ retry: true })));
      expect(keys(sent)).toEqual([`alert-${ID}`]);
    });

    it("past the ceiling, saves the lead, skips its alert, and sends one flood alert for the day", async () => {
      const { handle, saved, sent, rows } = setup({ ...flagged, recentFlagged: 21 });
      const res = await handle(send(lead({ retry: true })));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(saved).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "held" });
      expect(keys(sent)).toEqual(["flood-2026-10-19"]);
      expect(sent[0].to).toEqual(["team@ziiroai.com"]);
      expect(sent[0].replyTo).toBeUndefined();
      expect(sent[0].subject).toBe("Flagged funnel leads: more than 20 in 24 hours");
      expect(sent[0].text).not.toContain(ananya.email);
    });

    it("sends at most 20 lead alerts and one flood alert for a slow drip of 30 forged retries (worker-3's recheck repro)", async () => {
      const { handle, saved, sent } = setup({ ...flagged, countFromSaved: true });
      for (let i = 0; i < 30; i += 1) await handle(send(lead({ visitId: crypto.randomUUID(), retry: true })));
      expect(saved).toHaveLength(30);
      expect(keys(sent).filter((key) => key.startsWith("alert-"))).toHaveLength(20);
      expect([...new Set(keys(sent).filter((key) => key.startsWith("flood-")))]).toEqual(["flood-2026-10-19"]);
    });

    it("alerts as before when the count can't be read", async () => {
      const { handle, sent } = setup({ ...flagged, recentFlagged: 50, countDown: true });
      await handle(send(lead({ retry: true })));
      expect(keys(sent)).toEqual([`alert-${ID}`]);
    });

    it("never caps an unflagged lead", async () => {
      const { handle, sent } = setup({ recentFlagged: 50 });
      await handle(send(lead()));
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
    });
  });

  describe("outside Production (review H2)", () => {
    it("holds and logs a plan email to anyone but TEAM_INBOX", async () => {
      const { handle, sent, rows } = setup({ production: false });
      const res = await handle(send(lead()));
      expect(await res.json()).toEqual({ success: true, planEmail: "held" });
      expect(keys(sent)).toEqual([`alert-${ID}`]);
      expect(rows[0]).toMatchObject({ status: "held", resend_id: null });
      expect(logs.some((line) => line.includes("funnel.lead.preview_held"))).toBe(true);
      expect(logs.join("\n")).not.toContain(ananya.email);
    });

    it("sends the plan email when it's addressed to TEAM_INBOX, in any case", async () => {
      const { handle, sent } = setup({ production: false });
      const res = await handle(send(lead({ email: "Team@ZiiroAI.com" })));
      expect(await res.json()).toEqual({ success: true, planEmail: "sent" });
      expect(keys(sent)).toEqual([`alert-${ID}`, `plan-${ID}`]);
      expect(sent[1].to).toEqual(["Team@ZiiroAI.com"]);
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
