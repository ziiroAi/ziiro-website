// POST /api/funnel/lead: the checks, then the database, the team alert and the plan email (spec §13.2).
import {
  UpstreamError, clientIp, isJsonRequest, isRateLimited, jsonResponse, logEvent, readJson, requestId,
  resendFrom, sendResendEmail, teamInbox, turnstileOutcome, type TurnstileOutcome,
} from "../_lib";
import { jobIdsFor } from "../../src/features/funnel/data";
import {
  LIMITS, NOTICE_VERSION, TURNSTILE_ACTION,
  type AgentId, type LeadField, type LeadFlag, type LeadRequest, type LeadResponse, type PlanEmailStatus,
} from "../../src/features/funnel/data/contract";
import { cleanName } from "../../src/shared/lib/contact-checks";
import { createDb, type FunnelDb, type StoredPlanEmailStatus, type VisitAnswers, type VisitRecord } from "./_db";
import {
  alertRecipients, buildAlertEmail, buildFloodAlert, buildPlanEmail, buildSendByHandAlert, type Email, type SpamCheck,
} from "./_email";
import { countryOf, parseLead, visitIdOf } from "./_validate";

export const config = { runtime: "nodejs", maxDuration: 15 };

const LEAD_RATE_MAX = 5;              // per connection per 10 minutes, the /contact setting (§13.2 step 4)
const RETRY_RATE_MAX = 2;             // second tries per connection per 10 minutes: retry is the client's word (review H1)
// Flagged leads alerted one by one per 24 hours, then one flood alert a day (review H1, recheck). Resend's free
// plan sends 100 a day and each alert may count twice, so 20 leaves room for real leads' alerts and plan emails.
const FLAGGED_ALERT_CEILING = 20;
const PRODUCTION_HOSTS = ["ziiroai.com", "www.ziiroai.com"];  // where a Production token may come from (review L2)
const CALL_TIMEOUT_MS = 2_500;        // each Turnstile or Resend call, so most answers land inside S8's 8 s
const PLAN_EMAIL_TRIES = 2;           // two tries, then failed (§10)
const RESEND_KEY_ALREADY_USED = 409;  // Resend: this idempotency key is in flight, or was used with another body

export interface OutgoingEmail extends Email {
  to: string[];
  from: string;
  replyTo?: string;
  idempotencyKey: string;
}

export interface LeadEnv {
  teamInbox: string;
  planFrom: string;
  planReplyTo: string;
  alertFrom: string;
  /** VERCEL_ENV is production. Anywhere else, the plan email goes only to teamInbox (review H2). */
  production: boolean;
}

export interface LeadDeps {
  db(): FunnelDb;
  rateLimited(key: string, max: number): boolean;
  turnstile(token: string | undefined, ip: string): Promise<TurnstileOutcome>;
  send(email: OutgoingEmail): Promise<{ id: string | null }>;
  jobIdsFor(agentIds: readonly AgentId[]): string[];
  env(): LeadEnv;
  now(): Date;
}

type Gate = { refuse: 403 | 429 | 503 | null; flag: LeadFlag | null; spamCheck: SpamCheck };
type Saved = { contactId: string; answers: VisitAnswers } | "duplicate" | null;
type PlanResult = { status: PlanEmailStatus; resendId: string | null; errorName: string | null };

const answer = (request: Request, body: LeadResponse, status = 200): Response => jsonResponse(request, body, status);

const errorNameOf = (error: unknown): string =>
  error instanceof UpstreamError
    ? `${error.provider}_${error.status}`
    : error instanceof Error ? error.name : "unknown";

/** What a repeat send answers for a stored status (§13.2 step 2: the first result). */
const answerFor = (status: StoredPlanEmailStatus | null): PlanEmailStatus =>
  status === "held" ? "held" : status === "failed" || status === "bounced" || status === null ? "failed" : "sent";

async function earlierResult(deps: LeadDeps, visitId: string): Promise<PlanEmailStatus | null> {
  try {
    const found = await deps.db().findLead(visitId);
    return found ? answerFor(found.status) : null;
  } catch (error) {
    // The database is down: carry on. Resend's idempotency keys stop a second email (§13.2).
    logEvent("error", "funnel.lead.replay_check", { name: errorNameOf(error) });
    return null;
  }
}

const FLAG_FOR: Record<Exclude<TurnstileOutcome, "passed">, LeadFlag> = {
  missing: "turnstile_unverified",
  refused: "turnstile_failed",
  unavailable: "turnstile_unavailable",
};

/**
 * §13.2 steps 4 and 5. A first try that fails stops here: 429, 403, or 503 while the spam check is down (review M1).
 * A second try always gets the spam check: it, not the shared-IP limit, decides the flag (review M2). Past its own
 * per-connection limit (review H1), a second try is saved only when its token passes or the check is down, so a
 * busy office or carrier IP loses no real lead (recheck M2) while a forged retry, with no passing token, gets 429.
 */
async function checkSender(deps: LeadDeps, request: Request, lead: LeadRequest): Promise<Gate> {
  const retry = lead.retry === true;
  const ip = clientIp(request);
  const limited = deps.rateLimited(`funnel-lead:${ip}`, LEAD_RATE_MAX);
  if (!retry && limited) return { refuse: 429, flag: null, spamCheck: "skipped" };
  const retryOverLimit = retry && deps.rateLimited(`funnel-lead-retry:${ip}`, RETRY_RATE_MAX);
  const outcome = await deps.turnstile(lead.turnstileToken, ip);
  if (outcome === "passed") return { refuse: null, flag: null, spamCheck: outcome };
  if (!retry) return { refuse: outcome === "unavailable" ? 503 : 403, flag: null, spamCheck: outcome };
  if (retryOverLimit && outcome !== "unavailable") return { refuse: 429, flag: null, spamCheck: outcome };
  return { refuse: null, flag: FLAG_FOR[outcome], spamCheck: outcome };
}

const visitSnapshot = (lead: LeadRequest, country: string | null, jobIds: string[]): VisitRecord => ({
  id: lead.visitId,
  last_step: "S8",
  notice_version: NOTICE_VERSION,
  bot_flag: false,
  country,
  chips: lead.answers.chips,
  input_mode: lead.answers.inputMode,
  template: lead.plan.template,
  order_variant: lead.plan.orderVariant,
  tier: lead.plan.tier,
  agent_ids: lead.plan.agentIds,
  job_ids: jobIds,
  classifier_version: lead.plan.classifierVersion,
  agents_version: lead.plan.agentsVersion,
});

/** Write 1. "duplicate" when a racing request saved this visit's lead first; null when the database failed. */
async function saveContact(
  deps: LeadDeps, lead: LeadRequest, flag: LeadFlag | null, country: string | null, jobIds: string[],
): Promise<Saved> {
  try {
    const saved = await deps.db().saveLead(visitSnapshot(lead, country, jobIds), {
      visit_id: lead.visitId,
      name: cleanName(lead.name),
      email: lead.email.trim(),
      phone_e164: lead.phone || null,
      business_other: lead.answers.businessOther?.trim() || null,
      problem_text: lead.answers.problemText?.trim() || null,
      matched_phrases: lead.plan.matchedPhrases,
      consent_version: lead.consent.version,
      flag,
    });
    return "duplicate" in saved ? "duplicate" : saved;
  } catch (error) {
    logEvent("error", "funnel.lead.db", { name: errorNameOf(error) });
    return null;
  }
}

/** One team email. A 409 means an email under this key has gone or is going. */
async function deliver(deps: LeadDeps, email: OutgoingEmail): Promise<boolean> {
  try {
    await deps.send(email);
    return true;
  } catch (error) {
    if (error instanceof UpstreamError && error.status === RESEND_KEY_ALREADY_USED) return true;
    logEvent("error", "funnel.lead.alert", { name: errorNameOf(error) });
    return false;
  }
}

/** Write 2, and the send-by-hand alert. */
function sendAlert(deps: LeadDeps, lead: LeadRequest, email: Email, idempotencyKey: string): Promise<boolean> {
  const env = deps.env();
  return deliver(deps, {
    ...email, to: alertRecipients(env.teamInbox, env.planReplyTo), from: env.alertFrom,
    replyTo: lead.email.trim(), idempotencyKey,
  });
}

/** True past the ceiling of flagged saves in 24 hours. A count that can't be read alerts as before (review H1). */
async function pastFloodCeiling(deps: LeadDeps): Promise<boolean> {
  try {
    return (await deps.db().countRecentFlagged()) > FLAGGED_ALERT_CEILING;
  } catch (error) {
    logEvent("error", "funnel.lead.flood_count", { name: errorNameOf(error) });
    return false;
  }
}

/** One flood alert per UTC day, to TEAM_INBOX only, in place of every flagged lead's own (review H1). */
function sendFloodAlert(deps: LeadDeps): Promise<boolean> {
  const env = deps.env();
  const day = deps.now().toISOString().slice(0, 10);
  return deliver(deps, {
    ...buildFloodAlert(FLAGGED_ALERT_CEILING), to: [env.teamInbox], from: env.alertFrom, idempotencyKey: `flood-${day}`,
  });
}

/** Outside Production, a plan email to anyone but TEAM_INBOX is held (review H2). */
const heldOutsideProduction = (env: LeadEnv, to: string): boolean =>
  !env.production && to.trim().toLowerCase() !== env.teamInbox.trim().toLowerCase();

const HELD: PlanResult = { status: "held", resendId: null, errorName: null };

/** Write 3: two tries under one key, then failed (§10). */
async function sendPlanEmail(deps: LeadDeps, lead: LeadRequest, email: Email): Promise<PlanResult> {
  const env = deps.env();
  let errorName: string | null = null;
  for (let attempt = 1; attempt <= PLAN_EMAIL_TRIES; attempt += 1) {
    try {
      const { id } = await deps.send({
        ...email, to: [lead.email.trim()], from: env.planFrom, replyTo: env.planReplyTo,
        idempotencyKey: `plan-${lead.visitId}`,
      });
      return { status: "sent", resendId: id, errorName: null };
    } catch (error) {
      errorName = errorNameOf(error);
    }
  }
  return { status: "failed", resendId: null, errorName };
}

/** Writes 1 to 4 (§13.2). The lead counts as saved when it's in the database or in the alert. */
async function save(deps: LeadDeps, request: Request, lead: LeadRequest, gate: Gate): Promise<Response> {
  const country = countryOf(request);
  const jobIds = deps.jobIdsFor(lead.plan.agentIds);
  const saved = await saveContact(deps, lead, gate.flag, country, jobIds);
  if (saved === "duplicate") {
    return answer(request, { success: true, planEmail: (await earlierResult(deps, lead.visitId)) ?? "failed" });
  }
  const planEmail = buildPlanEmail({
    name: lead.name, email: lead.email.trim(), problemText: lead.answers.problemText,
    chips: lead.answers.chips, plan: lead.plan,
  });
  const alert = buildAlertEmail({
    lead, flag: gate.flag, spamCheck: gate.spamCheck, answers: saved?.answers ?? null, country,
    receivedAt: deps.now().toISOString(), planEmail,
  });
  // Only a lead that's in the database can skip its own alert.
  const capped = gate.flag !== null && saved !== null && await pastFloodCeiling(deps);
  const alerted = capped ? await sendFloodAlert(deps) : await sendAlert(deps, lead, alert, `alert-${lead.visitId}`);
  if (!saved && !alerted) {
    logEvent("error", "funnel.lead.lost", { requestId: requestId(request) });
    return answer(request, { success: false }, 502);
  }
  const previewHeld = !gate.flag && heldOutsideProduction(deps.env(), lead.email);
  if (previewHeld) logEvent("info", "funnel.lead.preview_held", { requestId: requestId(request) });
  const plan: PlanResult = gate.flag || previewHeld ? HELD : await sendPlanEmail(deps, lead, planEmail);
  if (plan.status === "failed") {
    const byHand = buildSendByHandAlert({ lead, errorName: plan.errorName, planEmail });
    await sendAlert(deps, lead, byHand, `alert-failed-${lead.visitId}`);
  }
  if (saved) {
    try {
      await deps.db().savePlanEmail({
        contact_id: saved.contactId, resend_id: plan.resendId, status: plan.status,
        agent_ids: lead.plan.agentIds, job_ids: jobIds, error_name: plan.errorName,
      });
    } catch (error) {
      logEvent("error", "funnel.lead.plan_email_row", { name: errorNameOf(error) });
    }
  }
  logEvent("info", "funnel.lead.saved", {
    planEmail: plan.status, flagged: gate.flag !== null, inDb: saved !== null, alerted,
    requestId: requestId(request),
  });
  return answer(request, { success: true, planEmail: plan.status });
}

const refuse = (request: Request, field: LeadField): Response => {
  logEvent("info", "funnel.lead.refused", { field, requestId: requestId(request) });
  return answer(request, { success: false, field }, 400);
};

export function createLeadHandler(deps: LeadDeps) {
  return async (request: Request): Promise<Response> => {
    if (!isJsonRequest(request)) return answer(request, { success: false }, 415);
    let body: unknown;
    try {
      body = await readJson(request, LIMITS.leadBodyBytes);
    } catch {
      return refuse(request, "payload");
    }
    const visitId = visitIdOf(body);
    if (!visitId) return refuse(request, "payload");
    const earlier = await earlierResult(deps, visitId);
    if (earlier) return answer(request, { success: true, planEmail: earlier });
    const parsed = parseLead(body);
    if (!parsed.ok) return refuse(request, parsed.field);
    const gate = await checkSender(deps, request, parsed.value);
    if (gate.refuse) {
      logEvent("info", "funnel.lead.gate", { status: gate.refuse, spamCheck: gate.spamCheck, requestId: requestId(request) });
      return answer(request, { success: false }, gate.refuse);
    }
    return save(deps, request, parsed.value, gate);
  };
}

const sendWithResend = (email: OutgoingEmail): Promise<{ id: string | null }> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logEvent("error", "funnel.lead.misconfigured", { missing: "RESEND_API_KEY" });
    return Promise.reject(new Error("RESEND_API_KEY is not set"));
  }
  return sendResendEmail({
    apiKey, from: email.from, to: email.to, subject: email.subject, text: email.text,
    replyTo: email.replyTo, idempotencyKey: email.idempotencyKey, timeoutMs: CALL_TIMEOUT_MS,
  });
};

const handle = createLeadHandler({
  db: () => createDb(),
  rateLimited: isRateLimited,
  turnstile: (token, ip) => turnstileOutcome(token, ip, {
    action: TURNSTILE_ACTION,
    timeoutMs: CALL_TIMEOUT_MS,
    ...(process.env.VERCEL_ENV === "production" ? { hostnames: PRODUCTION_HOSTS } : {}),
  }),
  send: sendWithResend,
  jobIdsFor,
  env: () => ({
    teamInbox: teamInbox(),
    planFrom: process.env.PLAN_FROM || resendFrom(),
    planReplyTo: process.env.PLAN_REPLY_TO || teamInbox(),
    alertFrom: resendFrom(),
    production: process.env.VERCEL_ENV === "production",
  }),
  now: () => new Date(),
});

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
