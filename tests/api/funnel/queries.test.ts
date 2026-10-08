import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../../db/funnel-queries.sql", import.meta.url), "utf8");
const statements = sql.replace(/^--.*$/gm, "").split(";").map((part) => part.trim()).filter(Boolean);

describe("db/funnel-queries.sql (Appendix C)", () => {
  it("holds the nine saved queries, numbered in order", () => {
    expect([...sql.matchAll(/^-- (\d)\. /gm)].map((match) => Number(match[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("changes data only in queries 6 to 9, and never drops or alters a table", () => {
    const writes = statements.filter((statement) => /^(update|delete|insert)\b/i.test(statement));
    expect(writes).toHaveLength(5);
    expect(statements.join("\n")).not.toMatch(/\b(drop|alter|truncate)\b/i);
  });
});
