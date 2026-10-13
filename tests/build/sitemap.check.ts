import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routePaths } from "../../scripts/routes.mjs";

describe("dist/sitemap.xml (§12: no new URL in phase 1)", () => {
  it("lists exactly the 14 routes, in route-table order", () => {
    const locs = [...readFileSync("dist/sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(routePaths.map((p: string) => `https://ziiroai.com${p}`));
  });
});
