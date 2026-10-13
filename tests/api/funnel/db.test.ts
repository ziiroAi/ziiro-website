import { describe, expect, it } from "vitest";
import { toVisitRecord } from "../../../api/funnel/_db";
import { VISIT_UPSERT } from "../../../api/funnel/_sql";
import { VISIT_FIELD_KEYS } from "../../../src/features/funnel/data/contract";
import { FULL_VISIT_FIELDS, VISIT_ID } from "./visit-fields";

/** The column names in VISIT_UPSERT's jsonb_to_record list: the one place a column's name and type live. */
const recordColumns = (): Set<string> => {
  const list = VISIT_UPSERT.slice(VISIT_UPSERT.indexOf("as r("), VISIT_UPSERT.indexOf("on conflict"));
  return new Set([...list.matchAll(/([a-z_]+) (?:uuid|text|jsonb|boolean|integer|smallint)/g)].map((match) => match[1]));
};

describe("toVisitRecord", () => {
  const record = toVisitRecord({ id: VISIT_ID, step: "S9", fields: FULL_VISIT_FIELDS }, { country: "IN", bot: false, jobIds: ["j1"] });

  it("spells every key as a column VISIT_UPSERT reads", () => {
    const columns = recordColumns();
    expect(Object.keys(record).filter((key) => !columns.has(key))).toEqual([]);
  });

  it("carries every field the browser can send except webdriver, plus five of the server's own", () => {
    expect(Object.keys(record)).toHaveLength(VISIT_FIELD_KEYS.length - 1 + 5);
    expect(record).not.toHaveProperty("webdriver");
  });

  it("adds the id, the step, the country, the bot flag and the jobs", () => {
    expect(record).toMatchObject({
      id: VISIT_ID, last_step: "S9", notice_version: "2026-10-08", bot_flag: false, country: "IN", job_ids: ["j1"],
      cta_clicked: true, bucket_scores: { sales: 6, lead_gen: 2 },
    });
  });

  it("leaves job_ids out before there's a plan", () => {
    expect(toVisitRecord({ id: VISIT_ID, step: "S1", fields: { noticeVersion: "2026-10-08" } }, { country: null, bot: true, jobIds: null }))
      .toEqual({ id: VISIT_ID, last_step: "S1", notice_version: "2026-10-08", bot_flag: true, country: null });
  });
});

describe("VISIT_UPSERT", () => {
  it("moves last_step forward only, and keeps the first CTA time (§13.2)", () => {
    expect(VISIT_UPSERT).toContain("array_position(array['S0','S1','S1b','S2','S3','S4','S5','S6','S7','S8','S9'], excluded.last_step)");
    expect(VISIT_UPSERT).toMatch(/cta_clicked_at\s+= coalesce\(v\.cta_clicked_at, excluded\.cta_clicked_at\)/);
  });

  it("returns the visit's taps, which the lead alert prints (§7)", () => {
    expect(VISIT_UPSERT.trimEnd().endsWith("returning segment, business_type, years_band, team_band, revenue_band, revenue_currency")).toBe(true);
  });
});
