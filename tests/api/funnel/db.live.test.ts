import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "../../../api/funnel/_db";

// Runs only with FUNNEL_DB_URL set to the Neon builders branch. Never point it at main.
const url = process.env.FUNNEL_DB_URL;

describe.skipIf(!url)("api/funnel/_db.ts against Neon (the builders branch)", () => {
  const visitId = randomUUID();
  const email = `lane-b-${visitId.slice(0, 8)}@example.com`;
  const visit = (step: "S3" | "S8", extra: Record<string, unknown>) =>
    ({ id: visitId, last_step: step, notice_version: "2026-10-08", bot_flag: false, country: "IN", ...extra });
  const contact = {
    visit_id: visitId, name: "Lane B test", email, phone_e164: null, business_other: null,
    problem_text: "test words", matched_phrases: [], consent_version: "2026-10-08", flag: null,
  };

  afterAll(async () => {
    const sql = neon(url ?? "");
    await sql.query("delete from contacts where visit_id = $1::uuid", [visitId]);
    await sql.query("delete from visits where id = $1::uuid", [visitId]);
  });

  it("saves a visit, its lead once, and its plan email", async () => {
    const db = createDb(url);
    await db.upsertVisit(visit("S3", { segment: "business", business_type: "interior", team_band: "6_20" }));
    expect(await db.findLead(visitId)).toBeNull();

    const first = await db.saveLead(visit("S8", { chips: [], template: "B", tier: "M" }), contact);
    expect(first).toMatchObject({ answers: { segment: "business", business_type: "interior", team_band: "6_20" } });
    expect(await db.saveLead(visit("S8", {}), contact)).toEqual({ duplicate: true });
    expect(await db.findLead(visitId)).toEqual({ status: null });

    if (!("contactId" in first)) throw new Error("the first save made no contact");
    await db.savePlanEmail({
      contact_id: first.contactId, resend_id: null, status: "sent", agent_ids: ["deals-inbound"],
      job_ids: ["deals-inbound:job"], error_name: null,
    });
    expect(await db.findLead(visitId)).toEqual({ status: "sent" });
  });
});
