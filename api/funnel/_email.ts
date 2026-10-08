// The emails /api/funnel/lead sends, written from IDs with the shared copy (spec §7, §13.3).
// Plain text only: no HTML, no images, and one link in the plan email.
import {
  BUSINESS_TYPES, CHIPS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS,
  type ChipId, type LeadFlag, type LeadRequest,
} from "../../src/features/funnel/data/contract";
import { agentById, calendlyUrl, copy, departments, stopsFor } from "../../src/features/funnel/data";
import { cleanEcho, cleanName } from "../../src/shared/lib/contact-checks";
import type { TurnstileOutcome } from "../_lib";
import type { VisitAnswers } from "./_db";

export interface Email {
  subject: string;
  text: string;
}

export interface PlanEmailInput {
  name: string;
  email: string;
  problemText?: string;
  chips: ChipId[];
  plan: LeadRequest["plan"];
}

const MAX_ECHO = 140;
const MAX_TYPED_BUSINESS = 80;

/** Option i's label is item i of its copy line split on " · " (00-index §1.2). */
const optionLabel = (copyId: string, ids: readonly string[], id: string | null | undefined): string | null => {
  const index = id ? ids.indexOf(id) : -1;
  return index < 0 ? null : (copy(copyId).split(" · ")[index] ?? null);
};

const lowerFirst = (line: string): string => line.charAt(0).toLowerCase() + line.slice(1);

/** em.said with their cleaned words, else em.said.chips, else nothing (§13.3). */
const saidLine = (problemText: string | undefined, chips: ChipId[]): string | null => {
  const words = cleanEcho(problemText ?? "", MAX_ECHO);
  if (words) return copy("em.said", { "their words": words });
  if (chips.length > 0) {
    return copy("em.said.chips", { chips: chips.map((chip) => optionLabel("s6.chips", CHIPS, chip)).join(", ") });
  }
  return null;
};

/** One block per department, in scroll order (§7, line 4). */
const departmentBlocks = (agentIds: LeadRequest["plan"]["agentIds"]): string[] =>
  stopsFor(agentIds).map((stop) => {
    const department = departments.find((candidate) => candidate.id === stop.department);
    if (!department) throw new Error(`unknown department ${stop.department}`);
    const head = copy("em.dept", { Department: department.name, "dp.*.why": copy(`dp.${department.copyKey}.why`) });
    const lines = stop.agentIds.map((id) => {
      const agent = agentById(id);
      if (!agent) throw new Error(`unknown agent ${id}`);
      return copy("em.agent", { "agent name": agent.name, "agent line": lowerFirst(agent.line) });
    });
    return [head, ...lines].join("\n");
  });

/** copy.md M, line for line, with the fallback lines when the plan is a fallback (§5.7). The plan says so. */
export function buildPlanEmail(input: PlanEmailInput): Email {
  const name = cleanName(input.name);
  const n = input.plan.agentIds.length;
  const fallback = input.plan.fallback;
  const blocks = [
    copy("em.hi", { name }),
    copy("em.open"),
    saidLine(input.problemText, input.chips),
    copy(fallback ? "em.need.fallback" : "em.need", { n }),
    input.plan.template === "B" ? copy("em.pilot") : null,
    ...departmentBlocks(input.plan.agentIds),
    copy("em.close", { n }),
    `${copy("em.cta")}\n${copy("em.link", { "Calendly link": calendlyUrl(name, input.email) })}`,
    copy("em.cta.sub"),
    `${copy("em.sign")}\n${copy("em.sign2")}`,
    copy("em.foot"),
  ].filter((block): block is string => block !== null);
  return {
    subject: copy(fallback ? "em.subject.fallback" : "em.subject", { name, n }),
    text: `${blocks.join("\n\n")}\n`,
  };
}

/** What the spam check said, for the alert. "skipped": the rate limit stopped it running. */
export type SpamCheck = TurnstileOutcome | "skipped";

const SPAM_CHECK: Record<SpamCheck, string> = {
  passed: "passed",
  missing: "no token came with it",
  refused: "refused",
  unavailable: "DOWN (Cloudflare or our secret), so this is probably a real person",
  skipped: "not run, because this connection hit the rate limit",
};

export interface AlertInput {
  lead: LeadRequest;
  flag: LeadFlag | null;
  spamCheck: SpamCheck;
  /** null when the database write failed, so the taps aren't known. */
  answers: VisitAnswers | null;
  country: string | null;
  receivedAt: string;
  planEmail: Email;
}

const segmentLabel = (segment: string | null | undefined): string | null => {
  const index = segment ? (SEGMENTS as readonly string[]).indexOf(segment) : -1;
  return index < 0 ? null : copy(`s1.o${index + 1}`);
};

const revenueLabel = (answers: VisitAnswers | null): string | null =>
  answers?.revenue_band === "undisclosed"
    ? copy("s5.skip")
    : optionLabel(answers?.revenue_currency === "USD" ? "s5.o.other" : "s5.o.IN", REVENUE_BANDS, answers?.revenue_band);

const businessLabel = (lead: LeadRequest, answers: VisitAnswers | null): string => {
  const typed = cleanEcho(lead.answers.businessOther ?? "", MAX_TYPED_BUSINESS);
  if (answers?.business_type === "other" && typed) return typed;
  return optionLabel("s2.o", BUSINESS_TYPES, answers?.business_type) ?? (typed || "business type unknown");
};

/** The team's copy of the whole lead (§7, §13.2 write 2). It's the only copy when the database is down. */
export function buildAlertEmail(input: AlertInput): Email {
  const { lead, flag, answers, planEmail } = input;
  const name = cleanName(lead.name);
  const email = lead.email.trim();
  const business = businessLabel(lead, answers);
  const team = optionLabel("s4.o", TEAM_BANDS, answers?.team_band) ?? "unknown size";
  const agents = lead.plan.agentIds.map((id) => agentById(id)?.name ?? id).join(", ");
  const chips = lead.answers.chips.map((chip) => optionLabel("s6.chips", CHIPS, chip)).join(", ");
  const lines = [
    flag ? `FLAGGED (${flag}). Check it today, and if a real person sent it, send the plan by hand.` : null,
    answers ? null : "The database write failed. This email is the only copy of this lead.",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${lead.phone || "none"}`,
    `Country: ${input.country ?? "unknown"}`,
    `What they do: ${segmentLabel(answers?.segment) ?? "unknown"}`,
    `Business: ${business}`,
    `Years: ${optionLabel("s3.o", YEARS_BANDS, answers?.years_band) ?? "unknown"}`,
    `Team: ${team}`,
    `Revenue: ${revenueLabel(answers) ?? "unknown"}`,
    `Their words: ${lead.answers.problemText?.trim() || "none"}`,
    `Chips: ${chips || "none"}`,
    `Plan: ${lead.plan.orderVariant}, tier ${lead.plan.tier}, ${lead.plan.agentIds.length} agents: ${agents}`,
    `Matched phrases: ${lead.plan.matchedPhrases.join(", ") || "none"}`,
    `Spam check: ${SPAM_CHECK[input.spamCheck]}`,
    `Plan email: ${flag ? "held, because this lead is flagged" : "going out now"}`,
    `Consent: version ${lead.consent.version}, at ${input.receivedAt}`,
    `Their booking link: ${calendlyUrl(name, email)}`,
    `Visit: ${lead.visitId}`,
  ].filter((line): line is string => line !== null);
  const byHand = flag
    ? ["", "If they're real, send them this, then run saved query 6 with their email:", "", `Subject: ${planEmail.subject}`, "", planEmail.text]
    : [];
  return {
    subject: `${flag === "turnstile_unavailable" ? "SPAM CHECK DOWN, not spam: " : ""}New funnel lead: ${name}, ${business}, team of ${team}`,
    text: `${[...lines, ...byHand].join("\n").trimEnd()}\n`,
  };
}

/** The second alert, when the plan email failed twice (§7: "Plan email NOT sent. Send it by hand today."). */
export function buildSendByHandAlert(input: { lead: LeadRequest; errorName: string | null; planEmail: Email }): Email {
  const { lead, errorName, planEmail } = input;
  return {
    subject: `Plan email NOT sent: ${cleanName(lead.name)}`,
    text: [
      "Plan email NOT sent. Send it by hand today.",
      `It failed twice${errorName ? ` (${errorName})` : ""}. Send this to ${lead.email.trim()}, then run saved query 6 with their email.`,
      `Visit: ${lead.visitId}`,
      "",
      `Subject: ${planEmail.subject}`,
      "",
      planEmail.text,
    ].join("\n"),
  };
}

/**
 * The one alert that stands in for every flagged lead past the hour's ceiling (review H1). It carries nothing a
 * sender typed, so a flood can't use it to reach the team.
 */
export function buildFloodAlert(ceiling: number): Email {
  return {
    subject: `Flagged funnel leads: more than ${ceiling} in 24 hours`,
    text: [
      `More than ${ceiling} flagged leads were saved in the last 24 hours, so their alerts are paused until the count drops.`,
      "Every one is in the database, with its plan email held. Read them with the saved query for flagged contacts.",
      "If they look real, check the spam check first: a Turnstile outage flags every lead.",
    ].join("\n"),
  };
}

/** TEAM_INBOX and PLAN_REPLY_TO, once if they're the same address (§13.2, write 2). */
export const alertRecipients = (teamInbox: string, replyTo: string): string[] => {
  const byAddress = new Map<string, string>();
  for (const address of [teamInbox, replyTo]) {
    const trimmed = address.trim();
    if (trimmed && !byAddress.has(trimmed.toLowerCase())) byAddress.set(trimmed.toLowerCase(), trimmed);
  }
  return [...byAddress.values()];
};
