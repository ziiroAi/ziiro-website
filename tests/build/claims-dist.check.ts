import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { routePaths } from "../../scripts/routes.mjs";
import { COPY_LINES } from "../../src/features/funnel/data/light";
import { allowedSentences, findClaims, readableText } from "../claims/patterns";

const allowed = allowedSentences(COPY_LINES);
const file = (path: string) => (path === "/" ? "dist/index.html" : `dist${path}/index.html`);

/** What a reader (or a bot) gets from a prerendered page: its text, title, description and alt text. */
function pageText(path: string): string {
  const d = new JSDOM(readFileSync(file(path), "utf8")).window.document;
  d.querySelectorAll("script, style, template").forEach((el) => el.remove());
  const meta = d.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  const alts = [...d.querySelectorAll("img[alt]")].map((img) => img.getAttribute("alt"));
  return [d.title, meta, readableText(d.body), ...alts].join("\n");
}

describe("the claims check on the built site (§12)", () => {
  it("passes on the prerendered /", () => {
    expect(findClaims(pageText("/"), { allowedSentences: allowed })).toEqual([]);
  });

  it("passes on llms-full.txt's / section", () => {
    const full = readFileSync("dist/llms-full.txt", "utf8");
    const start = full.indexOf("URL: https://ziiroai.com/\n");
    // scripts/llms-full.mjs labels the meta description "Description: "; the label isn't part of the copy line.
    const section = full.slice(start, full.indexOf("\n---\n", start)).replace(/^Description: /m, "");
    expect(findClaims(section, { allowedSentences: allowed })).toEqual([]);
  });

  it("reports, and doesn't fail on, every other page", () => {
    const report = routePaths.filter((p: string) => p !== "/").flatMap((p: string) =>
      findClaims(pageText(p), { allowedSentences: allowed }).map((hit) => `- ${p} ${hit}`));
    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/claims-report.md", `# Claims report, other pages (§12: notes only)\n\n${report.join("\n")}\n`);
    console.info(`claims report: ${report.length} notes in test-results/claims-report.md`);
    expect(Array.isArray(report)).toBe(true);
  });
});
