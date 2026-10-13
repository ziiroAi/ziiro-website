import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routes } from "../../scripts/routes.mjs";

describe("scripts/routes.mjs", () => {
  it("dates / by the funnel's files", () => {
    expect(routes.find((r) => r.path === "/")?.sources).toEqual(["src/pages/Index.tsx", "src/features/funnel"]);
  });

  it("names only sources that exist, or scripts/sitemap.mjs stops the build", () => {
    const missing = routes.flatMap((r) => r.sources.filter((s: string) => !existsSync(s)));
    expect(missing).toEqual([]);
  });

  it("keeps the 14 routes: the sitemap gains no URL in phase 1 (§12)", () => {
    expect(routes.map((r) => r.path)).toEqual([
      "/", "/products", "/who-we-are", "/watch/how-ziiro-works", "/mission", "/contact", "/pricing",
      "/docs", "/book-a-call", "/faq", "/careers", "/security", "/privacy", "/terms",
    ]);
  });
});
