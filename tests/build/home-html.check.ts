import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { copy } from "../../src/features/funnel/data/light";
import { INTERIM_BOOKING_URL } from "../../src/features/pricing/entities/rates";
import { routePaths } from "../../scripts/routes.mjs";

const HTML_GZ_MAX = 30_000; // §13.10
const read = (file: string) => readFileSync(file, "utf8");
const page = (file: string) => new JSDOM(read(file)).window.document; // scripting off: <noscript> parses as markup
const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("dist/index.html, the prerendered / (§8.2, §12)", () => {
  const html = read("dist/index.html");
  const doc = page("dist/index.html");

  it("has one H1, the static greeting (§4.2)", () => {
    const h1s = [...doc.querySelectorAll("h1")];
    expect(h1s.map(text)).toEqual(["Hello."]);
  });

  it("holds s0.sub.day, s0.promise and g.about as text", () => {
    for (const id of ["s0.sub.day", "s0.promise", "g.about"]) expect(text(doc.body)).toContain(copy(id));
  });

  it("asks S1 as an H2 with its five options as real buttons", () => {
    expect([...doc.querySelectorAll("h2")].map(text)).toContain(copy("s1.q"));
    const buttons = [...doc.querySelectorAll("button")].map(text);
    for (const i of [1, 2, 3, 4, 5]) expect(buttons).toContain(copy(`s1.o${i}`));
  });

  it("tells a visitor without JavaScript how to book a call (g.noscript)", () => {
    const noscript = [...doc.querySelectorAll("noscript")].find((n) => text(n).includes(copy("g.noscript")));
    expect(noscript).toBeDefined();
    expect(noscript!.querySelector(`a[href^="${INTERIM_BOOKING_URL}"]`)).not.toBeNull();
  });

  it("links every other page from the footer (§8.2)", () => {
    const hrefs = [...doc.querySelectorAll("footer a[href]")].map((a) => a.getAttribute("href"));
    for (const path of routePaths.filter((p: string) => p !== "/")) expect(hrefs).toContain(path);
  });

  it("shows only the logo in the header on /, and the links elsewhere (D6, D14)", () => {
    expect(doc.querySelector("#site-menu")).toBeNull();
    expect(page("dist/mission/index.html").querySelectorAll("#site-menu a")).toHaveLength(4);
  });

  it("weighs 30 KB gz or less (§13.10)", () => {
    expect(gzipSync(html).length).toBeLessThanOrEqual(HTML_GZ_MAX);
  });
});

describe("llms files describe / from its own words (§8.3)", () => {
  it("dist/llms-full.txt's / section holds g.about and S1's question", () => {
    const full = read("dist/llms-full.txt");
    const start = full.indexOf("URL: https://ziiroai.com/\n");
    const section = full.slice(start, full.indexOf("\n---\n", start));
    expect(start).toBeGreaterThan(0);
    expect(section).toContain(copy("g.about"));
    expect(section).toContain(copy("s1.q"));
  });

  it("dist/llms.txt's / line uses g.about and S1's question", () => {
    const line = read("dist/llms.txt").split("\n").find((l) => l.startsWith("- [Ziiro AI](https://ziiroai.com)"));
    expect(line).toContain(copy("g.about"));
    expect(line).toContain(copy("s1.q"));
  });
});
