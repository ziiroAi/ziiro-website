import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { FunnelData } from "./contract";
import * as data from "./index";
import * as light from "./light";

/** `npm run typecheck` fails on this line if index.ts falls short of FunnelData. */
const funnelData: FunnelData = data;

const MEMBERS = [
  "AGENTS_VERSION", "CLASSIFIER_VERSION", "agents", "departments", "priority", "laneAgent", "copy", "agentById",
  "jobIdsFor", "stopsFor", "currencyFor", "tierFor", "classify", "composePlan", "calendlyUrl", "COPY_LINES",
] as const;

// Vitest runs from the repo root. No import.meta here, as everywhere under data/.
const DATA = resolve(process.cwd(), "src/features/funnel/data");
const RUNTIME_IMPORT = /^(?:import|export)(?!\s+type\b)[^'"]*?from\s+["']([^"']+)["']/gm;
const PRICING = join("..", "..", "pricing", "entities", "rates");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "tools" ? [] : sourceFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
const runtimeImports = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(RUNTIME_IMPORT)].map((m) => m[1]);
const isGenerated = (file: string): boolean =>
  file.endsWith(".generated.ts") || relative(DATA, file).startsWith("copy/");

describe("data/index.ts", () => {
  it("exports every member of FunnelData, and everything light.ts exports", () => {
    expect(MEMBERS.filter((m) => funnelData[m] === undefined)).toEqual([]);
    expect(Object.keys(light).filter((key) => !(key in data))).toEqual([]);
    expect(data.CLASSIFIER_VERSION).toBe("kw-1");
  });

  it("imports only its own files and the pricing entity, so api/funnel can bundle it (§13.1)", () => {
    const imports = sourceFiles(DATA).flatMap((file) =>
      runtimeImports(file).map((spec) => ({
        file: relative(DATA, file), spec, path: relative(DATA, resolve(dirname(file), spec.replace(/(\/index)?\.js$/, ""))),
      })));
    expect(imports.filter((i) => !i.spec.startsWith("."))).toEqual([]);
    expect(imports.filter((i) => i.path.startsWith("..") && i.path !== PRICING)).toEqual([]);
  });

  it("never touches import.meta, window or document", () => {
    const touching = sourceFiles(DATA)
      .filter((f) => !isGenerated(f))
      .filter((f) => /import\.meta\.|\bwindow\.|\bdocument\./.test(readFileSync(f, "utf8")));
    expect(touching.map((f) => relative(DATA, f))).toEqual([]);
  });

  it("keeps the plan chunk's data, its agents, jobs and phrase lists, under 12 KB gzipped (§13.10)", () => {
    const files = ["agents.generated.ts", "classifier/phrases.ts"].map((f) => readFileSync(join(DATA, f)));
    expect(gzipSync(Buffer.concat(files)).length).toBeLessThanOrEqual(12 * 1024);
  });
});
