/**
 * (C) Every copy ID the questions show is in lane C's copy, and the test lines match it word for word.
 * No mocks: this reads the real light entry (index §1.5).
 */
import { describe, expect, it } from "vitest";
import {
  BUSINESS_TYPES, CHIPS, COPY_LINES, NON_OWNER_REASONS, REVENUE_BANDS, SEGMENTS, TEAM_BANDS, YEARS_BANDS, copy,
} from "@/features/funnel/data/light";
import { businessOptions, chipOptions, nonOwnerOptions, revenueOptions, segmentOptions, teamOptions, yearsOptions } from "./options";
import { LINES } from "./test/fake-data";

const SOURCES = import.meta.glob<string>(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./test/**"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const LITERAL_IDS = new Set(
  Object.values(SOURCES).flatMap((source) => [...source.matchAll(/copy\("([A-Za-z0-9.]+)"/g)].map((match) => match[1])),
);
/** IDs the code builds at run time, so no literal names them. */
const BUILT_IDS = [
  "s0.sub.early", "s0.sub.day", "s0.sub.late",
  ...[1, 2, 3, 4, 5].flatMap((i) => [`s1.o${i}`, `s1b.o${i}`]),
  "s2.o", "s3.o", "s4.o", "s5.o.IN", "s5.o.other", "s6.chips",
  "s7.err.name", "s7.err.email", "s7.err.phone", "s7.err.consent", "s7.err.bot",
  "s8.l1", "s8.l1.chips", "s8.l2", "s8.l3", "s8.l3.one",
];

describe("the questions' copy (index §1.3, §1.5)", () => {
  it("finds the copy() calls in the flow's code", () => {
    expect(LITERAL_IDS.size).toBeGreaterThan(30);
    expect([...LITERAL_IDS]).toEqual(expect.arrayContaining(["s1.q", "g.footer", "s6.text", "s7.btn"]));
  });

  it.each([...new Set([...LITERAL_IDS, ...BUILT_IDS])].sort())("%s is in lane C's copy", (id) => {
    expect(COPY_LINES).toHaveProperty([id]);
  });

  it.each(Object.entries(LINES))("the test line %s matches lane C's copy word for word", (id, line) => {
    expect(COPY_LINES[id]).toBe(line);
  });

  it("fills the placeholders the questions use", () => {
    expect(copy("g.progress", { n: 1, total: 6 })).toBe("Step 1 of 6");
    expect(copy("s8.l3", { team: "6–20" })).toBe("Sizing it for a team of 6–20…");
  });

  it("gives every option list one label per option", () => {
    expect(segmentOptions()).toHaveLength(SEGMENTS.length);
    expect(nonOwnerOptions()).toHaveLength(NON_OWNER_REASONS.length);
    expect(businessOptions()).toHaveLength(BUSINESS_TYPES.length);
    expect(yearsOptions()).toHaveLength(YEARS_BANDS.length);
    expect(teamOptions()).toHaveLength(TEAM_BANDS.length);
    expect(chipOptions()).toHaveLength(CHIPS.length);
    expect(revenueOptions("INR")).toHaveLength(REVENUE_BANDS.length);
    expect(revenueOptions("USD")).toHaveLength(REVENUE_BANDS.length);
  });
});
