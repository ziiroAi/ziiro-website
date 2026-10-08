import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import vercel from "../../vercel.json";

const env = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
const sources = vercel.headers.map((rule) => rule.source);

describe("vercel.json", () => {
  it("caches the spine stills for a year, as immutable files (§13.10)", () => {
    const rule = vercel.headers.find((candidate) => candidate.source === "/spine/(.*)");
    expect(rule?.headers).toEqual([{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]);
  });

  it("puts the spine rule before the catch-all", () => {
    expect(sources.indexOf("/spine/(.*)")).toBeGreaterThan(-1);
    expect(sources.indexOf("/spine/(.*)")).toBeLessThan(sources.indexOf("/(.*)"));
  });
});

describe(".env.example (§13.6)", () => {
  it("lists the funnel's variables", () => {
    for (const name of ["DATABASE_URL=", "PLAN_FROM=", "PLAN_REPLY_TO="]) expect(env).toContain(`\n${name}`);
  });

  it("no longer says there are two edge functions and no database", () => {
    expect(env).not.toMatch(/no database/i);
    expect(env).not.toContain("two edge functions");
  });

  it("holds no secret values", () => {
    expect(env).toMatch(/\nDATABASE_URL=\n/);
    expect(env).toMatch(/\nRESEND_API_KEY=\n/);
    expect(env).toMatch(/\nTURNSTILE_SECRET_KEY=\n/);
  });
});
