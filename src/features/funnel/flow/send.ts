/**
 * (C) Sending the lead (spec §10, §13.2; index §1.3): the /lead body, reading its answer, the D18 rule,
 * and S8's lines and timing. Only postLead touches the network; useLeadSend (Task 13) puts them together.
 */
import {
  CONSENT_VERSION, LEAD_FIELDS, PLAN_EMAIL_STATUSES, isOneOf,
  type ChipId, type LeadField, type LeadPlan, type LeadRequest, type PlanEmailStatus, type TeamBand,
} from "@/features/funnel/data/light";
import type { CheckedContact } from "./screens/types";
import type { Answers, SendResult } from "./state";
import { inputModeOf } from "./words";

export const LEAD_URL = "/api/funnel/lead";
/** How long the send waits for Turnstile's token, before the request (Review Focus 4). */
export const TOKEN_WAIT_MS = 3_000;
/**
 * How long a send waits for /lead, from the request (review M2). /lead runs for 15 s at most (its maxDuration), so a
 * send this gives up on has already ended on the server, and the retry, with the same visit, gets the replay check's
 * answer instead of making a second lead. The extra second is for the network.
 */
export const LEAD_BUDGET_MS = 16_000;
/** S8's lines change at these times; each replaces the one before (§4.3). */
export const S8_LINE_AT_MS = [0, 700, 1_400] as const;
/** S8 holds at least this long, so each line is up for 0.7 s. */
export const S8_MIN_MS = 2_100;

export interface LeadInput {
  visitId: string;
  retry: boolean;
  contact: CheckedContact;
  token: string;
  answers: Answers;
  words: { problemText: string; chips: ChipId[] };
  plan: LeadPlan;
}

/** The /lead body. Empty keys stay out: no retry on a first try, no phone left blank, no token the widget never gave. */
export function leadRequest({ visitId, retry, contact, token, answers, words, plan }: LeadInput): LeadRequest {
  const other = answers.businessType === "other" ? answers.businessOther.trim() : "";
  return {
    visitId,
    ...(retry ? { retry: true } : {}),
    name: contact.name,
    email: contact.email,
    ...(contact.phone ? { phone: contact.phone } : {}),
    consent: { given: true, version: CONSENT_VERSION },
    ...(token ? { turnstileToken: token } : {}),
    answers: {
      ...(other ? { businessOther: other } : {}),
      ...(words.problemText ? { problemText: words.problemText } : {}),
      chips: [...words.chips],
      inputMode: inputModeOf(words.problemText, words.chips),
    },
    plan: {
      template: plan.template,
      orderVariant: plan.orderVariant,
      tier: plan.tier,
      agentIds: [...plan.agentIds],
      matchedPhrases: [...plan.matchedPhrases],
      classifierVersion: plan.classifierVersion,
      agentsVersion: plan.agentsVersion,
      fallback: plan.fallback,  // the email picks em.need.fallback from it (index §1.5, request 16)
    },
  };
}

export type LeadOutcome =
  | { kind: "saved"; planEmail: PlanEmailStatus | null }  // null: the answer didn't say
  | { kind: "field"; field: LeadField }
  | { kind: "refused"; status: number }
  | { kind: "timeout" };

/** Posts the lead and gives up after timeoutMs. No answer and a network failure both read as "timeout". */
export async function postLead(body: LeadRequest, timeoutMs: number, fetchImpl: typeof fetch = fetch): Promise<LeadOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(0, timeoutMs));
  try {
    const response = await fetchImpl(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const answer = (await response.json().catch(() => null)) as { field?: unknown; planEmail?: unknown } | null;
    if (response.ok) {  // the server answers 200 only once the lead is saved (§13.2)
      return { kind: "saved", planEmail: isOneOf(PLAN_EMAIL_STATUSES, answer?.planEmail) ? answer.planEmail : null };
    }
    const field = answer?.field;
    if (response.status === 400 && isOneOf(LEAD_FIELDS, field)) return { kind: "field", field };
    return { kind: "refused", status: response.status };
  } catch {
    return { kind: "timeout" };
  } finally {
    clearTimeout(timer);
  }
}

/** What the visitor sees next (index §1.3, §10, D18): back to S7 once, then the plan anyway. */
export function afterSend(outcome: LeadOutcome, isRetry: boolean): SendResult {
  if (outcome.kind === "saved") return { to: "plan", notice: null, error: null };
  if (outcome.kind === "timeout") {
    return isRetry ? { to: "plan", notice: "unsure", error: "timeout" } : { to: "s7", error: "timeout", field: null, line: "g.error" };
  }
  if (outcome.kind === "field" && outcome.field !== "payload") {
    const field = outcome.field;
    return isRetry ? { to: "plan", notice: "fail", error: field } : { to: "s7", error: field, field, line: null };
  }
  const status = outcome.kind === "refused" ? outcome.status : 400;
  const error = status === 403 ? "bot" : status === 429 ? "rate" : "server";
  if (isRetry) return { to: "plan", notice: "fail", error };  // a second try is saved flagged, so this is defensive
  return { to: "s7", error, field: null, line: error === "bot" ? "s7.err.bot" : "g.error" };
}

export interface S8Line { id: string; vars?: Readonly<Record<string, string>> }

/** S8's three lines with §4.3's variants: chips only → s8.l1.chips; "Just me" → s8.l3.one. */
export function s8Lines(input: { problemText: string; chips: readonly ChipId[]; teamBand: TeamBand | null; teamLabel: string }): readonly S8Line[] {
  const first: S8Line = { id: !input.problemText && input.chips.length > 0 ? "s8.l1.chips" : "s8.l1" };
  const third: S8Line = input.teamBand === "solo" ? { id: "s8.l3.one" } : { id: "s8.l3", vars: { team: input.teamLabel } };
  return [first, { id: "s8.l2" }, third];
}

/** Which of S8's lines shows after elapsedMs. The last one holds. */
export function s8LineAt(elapsedMs: number): number {
  return Math.max(0, S8_LINE_AT_MS.filter((at) => elapsedMs >= at).length - 1);
}
