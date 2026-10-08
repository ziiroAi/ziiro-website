// Neon access for the funnel (spec §13.5): Neon's HTTP driver, one round trip per call, no pool.
import { neon } from "@neondatabase/serverless";
import type { LeadFlag, PlanEmailStatus, StepId, VisitRequest } from "../../src/features/funnel/data/contract";
import { CONTACT_INSERT, COUNT_RECENT_FLAGGED, FIND_LEAD, PLAN_EMAIL_INSERT, VISIT_UPSERT } from "./_sql";

/** A visits row by its column names, as VISIT_UPSERT's record list spells them. */
export type VisitRecord = {
  id: string;
  last_step: StepId;
  notice_version: string;
  bot_flag: boolean;
  country: string | null;
} & Record<string, unknown>;

/** The taps /visit saved before the lead, for the alert (§7). All null when /visit never got through. */
export interface VisitAnswers {
  segment: string | null;
  business_type: string | null;
  years_band: string | null;
  team_band: string | null;
  revenue_band: string | null;
  revenue_currency: string | null;
}

export interface ContactRecord {
  visit_id: string;
  name: string;
  email: string;
  phone_e164: string | null;
  business_other: string | null;
  problem_text: string | null;
  matched_phrases: string[];
  consent_version: string;
  flag: LeadFlag | null;
}

/** plan_emails.status: what /lead writes, plus what the saved queries and later phases write (Appendix C). */
export type StoredPlanEmailStatus = PlanEmailStatus | "sent_by_hand" | "delivered" | "bounced" | "complained";

export interface PlanEmailRecord {
  contact_id: string;
  resend_id: string | null;
  status: PlanEmailStatus;
  agent_ids: string[];
  job_ids: string[];
  error_name: string | null;
}

export type SavedLead = { contactId: string; answers: VisitAnswers } | { duplicate: true };

export interface FunnelDb {
  upsertVisit(visit: VisitRecord): Promise<void>;
  /** null when the visit has no lead yet; status is null until its plan_emails row exists. */
  findLead(visitId: string): Promise<{ status: StoredPlanEmailStatus | null } | null>;
  /** One transaction: the visit's final snapshot, then the contact (§13.2, write 1). */
  saveLead(visit: VisitRecord, contact: ContactRecord): Promise<SavedLead>;
  savePlanEmail(row: PlanEmailRecord): Promise<void>;
  /** Flagged contacts saved in the last 24 hours (review H1). */
  countRecentFlagged(): Promise<number>;
}

export function createDb(url: string | undefined = process.env.DATABASE_URL): FunnelDb {
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  return {
    async upsertVisit(visit) {
      await sql.query(VISIT_UPSERT, [JSON.stringify(visit)]);
    },
    async findLead(visitId) {
      const rows = await sql.query(FIND_LEAD, [visitId]);
      return rows[0] ? { status: rows[0].status as StoredPlanEmailStatus | null } : null;
    },
    async saveLead(visit, contact) {
      const [visitRows, contactRows] = await sql.transaction([
        sql.query(VISIT_UPSERT, [JSON.stringify(visit)]),
        sql.query(CONTACT_INSERT, [JSON.stringify(contact)]),
      ]);
      const inserted = contactRows[0] as { id: string } | undefined;
      return inserted ? { contactId: inserted.id, answers: visitRows[0] as VisitAnswers } : { duplicate: true };
    },
    async savePlanEmail(row) {
      await sql.query(PLAN_EMAIL_INSERT, [JSON.stringify(row)]);
    },
    async countRecentFlagged() {
      const rows = await sql.query(COUNT_RECENT_FLAGGED);
      return Number(rows[0]?.n ?? 0);
    },
  };
}

const snakeCase = (key: string): string => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** A /visit body as a visits row. webdriver isn't a column: it only feeds bot_flag. */
export function toVisitRecord(
  request: VisitRequest,
  extra: { country: string | null; bot: boolean; jobIds: string[] | null },
): VisitRecord {
  const columns = Object.fromEntries(
    Object.entries(request.fields)
      .filter(([key]) => key !== "webdriver")
      .map(([key, value]) => [snakeCase(key), value]),
  );
  return {
    ...columns,
    id: request.id,
    last_step: request.step,
    notice_version: request.fields.noticeVersion,
    bot_flag: extra.bot,
    country: extra.country,
    ...(extra.jobIds ? { job_ids: extra.jobIds } : {}),
  };
}
