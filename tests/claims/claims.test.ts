// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COPY_LINES, copy } from "../../src/features/funnel/data/light";
import { allowedSentences, findClaims, readableText } from "./patterns";
import { emailText, planHtml, planName, reachablePlans } from "./sources";

const plans = reachablePlans();
const allowed = allowedSentences(COPY_LINES);
const doc = (html: string) => new DOMParser().parseFromString(html, "text/html");
const textOf = (html: string) => readableText(doc(html).body);

/** The words of every link and button after cta.h, the close's heading (§6.2 block 4). */
function ctasAfterClose(html: string): string[] {
  const d = doc(html);
  const heading = [...d.body.querySelectorAll("*")].find((el) => el.children.length === 0 && el.textContent?.trim() === copy("cta.h"));
  if (!heading) throw new Error("the plan has no cta.h");
  return [...d.body.querySelectorAll("a, button")]
    .filter((el) => heading.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
    .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
}

describe("the claims check (spec §12, Appendix A)", () => {
  it("passes on every copy line", () => {
    const hits = Object.entries(COPY_LINES).flatMap(([id, line]) => findClaims(line, { id }).map((h) => `${id} ${h}`));
    expect(hits).toEqual([]);
  });

  it("reaches all 27 plans", () => {
    expect(new Set(plans.map(({ plan }) => `${plan.orderVariant}|${plan.lane}|${plan.tier}`)).size).toBe(27);
  });

  it.each(plans.map((p) => [planName(p), p] as const))("passes on the plan page: %s", (_name, reached) => {
    const html = planHtml(reached);
    expect(findClaims(textOf(html), { allowedSentences: allowed })).toEqual([]);
    expect(ctasAfterClose(html)).toEqual([copy("cta.btn")]);
    if (reached.plan.pilot) expect(textOf(html)).toContain(copy("sp.pilot"));
  });

  it.each(plans.map((p) => [planName(p), p] as const))("passes on the plan email: %s", (_name, reached) => {
    expect(findClaims(emailText(reached), { allowedSentences: allowed })).toEqual([]);
  });

  it("passes on public/llms.txt", () => {
    expect(findClaims(readFileSync("public/llms.txt", "utf8"), { allowedSentences: allowed })).toEqual([]);
  });
});
