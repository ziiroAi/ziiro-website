import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { COPY_LINES, agents } from "../../src/features/funnel/data";
import { PHRASES } from "../../src/features/funnel/data/classifier/phrases";
import { reachable } from "../helpers/imports";

/** §13.10, in bytes gz. */
const LIMITS = { firstPaint: 150_000, funnel: 25_000, plan: 60_000, data: 12_000 };
const ASSETS = "dist/assets";
const LIGHT_ENTRY = "src/features/funnel/data/light.ts";
const STATIC_IMPORT = /(?:^|[;\s}])import\s*(?:[\w*{}\s,$]+from\s*)?["'](\.\/[^"']+\.js)["']/g;

const gz = (file: string) => gzipSync(readFileSync(`${ASSETS}/${file}`)).length;
const total = (files: Set<string>) => [...files].reduce((sum, f) => sum + gz(f), 0);
const chunk = (re: RegExp) => readdirSync(ASSETS).find((f) => re.test(f));

/** A chunk and every chunk it imports statically, which the browser fetches before running it. */
function closure(starts: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...starts];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(`${ASSETS}/${file}`, "utf8").matchAll(STATIC_IMPORT)) queue.push(m[1].slice(2));
  }
  return seen;
}

/**
 * True for the light entry and every file it imports, whether rolldown asks with a raw id ("./copy",
 * "@/…") or a resolved one. These ship in first paint, so the plan data's measure leaves them out.
 */
function inLightEntry(): (id: string, importer?: string) => boolean {
  const files = new Set([...reachable([LIGHT_ENTRY]).files].map((f) => path.resolve(f)));
  return (id, importer) => {
    const bare = id.split("?")[0];
    const abs = bare.startsWith("@/") ? path.resolve("src", bare.slice(2))
      : bare.startsWith(".") && importer ? path.resolve(path.dirname(importer), bare)
      : path.resolve(bare);
    return ["", ".ts", ".tsx", "/index.ts"].some((ext) => files.has(abs + ext));
  };
}

/**
 * Job names and phrase-list entries, which only the plan chunk may carry (00-index §1.5, request 14).
 * Single words ("profit", "margin") would match ordinary code, and the few that are also copy lines
 * ship in first paint by design, so both are left out.
 */
function planOnlyWords(): string[] {
  const copyText = Object.values(COPY_LINES).join("\n").toLowerCase();
  const words = [...agents.flatMap((a) => a.jobs.map((j) => j.name)), ...Object.values(PHRASES).flat()];
  return [...new Set(words)].filter((w) => w.includes(" ") && !copyText.includes(w.toLowerCase()));
}

const html = readFileSync("dist/index.html", "utf8");
const entry = html.match(/<script type="module"[^>]*src="\/assets\/([^"]+\.js)"/)![1];
const preloads = [...html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]);
const shell = closure([entry, ...preloads]);
const firstPaint = closure([...shell, chunk(/^Index-[\w-]+\.js$/)!]);

describe("budgets (§13.10)", () => {
  it("first paint on / (entry plus the funnel chunk) is 150 KB gz or less", () => {
    console.info("first paint", total(firstPaint), "shell", total(shell));
    expect(total(firstPaint)).toBeLessThanOrEqual(LIMITS.firstPaint);
  });

  it("the funnel's share of it is 25 KB gz or less", () => {
    expect(total(firstPaint) - total(shell)).toBeLessThanOrEqual(LIMITS.funnel);
  });

  it("ships no job name or phrase-list entry in the entry chunk or the funnel chunk (00-index §1.5)", () => {
    const words = planOnlyWords();
    expect(words.length, "the agents data and the phrase lists loaded").toBeGreaterThan(100);
    const leaked = [...firstPaint].flatMap((file) => {
      const code = readFileSync(`${ASSETS}/${file}`, "utf8").toLowerCase();
      return words.filter((w) => code.includes(w.toLowerCase())).map((w) => `${file}: "${w}"`);
    });
    expect(leaked).toEqual([]);
  });

  it("the plan chunk's data is 12 KB gz or less: the agents, the jobs, the phrase lists and the disc map", async () => {
    const result = await build({
      configFile: false,
      logLevel: "silent",
      resolve: { alias: { "@": path.resolve("src") } },
      build: {
        write: false,
        minify: true,
        lib: { entry: "src/features/funnel/data/index.ts", formats: ["es"], fileName: "data" },
        // The copy lines ship with the light entry in first paint (00-index §1.5), so they don't count here.
        rollupOptions: { external: inLightEntry() },
      },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => ("output" in r ? r.output : []));
    const code = outputs.filter((o) => o.type === "chunk").map((o) => ("code" in o ? o.code : "")).join("\n");
    console.info("plan data", gzipSync(code).length);
    expect(gzipSync(code).length).toBeLessThanOrEqual(LIMITS.data);
  });

  it("the plan chunk, beyond what first paint already loaded, is 60 KB gz or less", () => {
    const plan = chunk(/^PlanPage-[\w-]+\.js$/);
    expect(plan, "lane A loads src/features/funnel/plan/PlanPage.tsx with import() at S5").toBeDefined();
    const extra = new Set([...closure([plan!])].filter((f) => !firstPaint.has(f)));
    console.info("plan chunk", total(extra));
    expect(total(extra)).toBeLessThanOrEqual(LIMITS.plan);
  });
});
