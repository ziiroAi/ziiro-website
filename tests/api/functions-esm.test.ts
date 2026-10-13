import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * (C) B18: the package is "type": "module", and Vercel's Node runtime compiles each api/ file on its own, without
 * bundling. Node's ESM loader then needs every relative import to name its file (`./x.js`, `./dir/index.js`).
 * Vitest and Vite resolve imports without extensions, so only a plain Node process can catch a missing one.
 * This compiles every file the functions reach, one by one, and imports each function in a child Node process.
 */
const ROOT = resolve(".");
const RELATIVE = /(?:import|export)\s[^;]*?from\s*["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

const functionEntries = (): string[] =>
  readdirSync("api", { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts") && !file.split("/").some((part) => part.startsWith("_")))
    .map((file) => join("api", file));

/** The .ts file a specifier names: `./x.js` is `./x.ts`, as TypeScript and Vite read it. */
function sourceOf(from: string, specifier: string): string | null {
  const target = join(dirname(from), specifier);
  const candidates = [target.replace(/\.js$/, ".ts"), `${target}.ts`, join(target, "index.ts")];
  return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? null;
}

function importGraph(entries: string[]): { files: string[]; extensionless: string[] } {
  const seen = new Set<string>();
  const extensionless: string[] = [];
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(RELATIVE)) {
      const specifier = match[1] ?? match[2];
      if (!/\.(js|mjs|json)$/.test(specifier)) extensionless.push(`${file} -> ${specifier}`);
      const source = sourceOf(file, specifier);
      if (source) visit(source);
    }
  };
  entries.forEach(visit);
  return { files: [...seen], extensionless };
}

function compileOneByOne(files: string[]): string {
  const out = mkdtempSync(join(tmpdir(), "functions-esm-"));
  for (const file of files) {
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: file,
    });
    const target = join(out, relative(ROOT, file).replace(/\.ts$/, ".js"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, outputText);
  }
  writeFileSync(join(out, "package.json"), '{"type":"module"}');
  symlinkSync(join(ROOT, "node_modules"), join(out, "node_modules"));
  return out;
}

describe("the api functions load in plain Node, compiled file by file as Vercel does (B18)", () => {
  const entries = functionEntries();
  const { files, extensionless } = importGraph(entries);

  it("finds the functions and the files they reach", () => {
    expect(entries).toEqual(expect.arrayContaining(["api/funnel/lead.ts", "api/funnel/visit.ts", "api/send-contact.ts"]));
    expect(files.some((file) => file.startsWith("src/features/funnel/data/"))).toBe(true);
  });

  it("names the file in every relative import", () => {
    expect(extensionless).toEqual([]);
  });

  it.each(entries)("imports %s without a module error", (entry) => {
    const out = compileOneByOne(files);
    const target = join(out, entry.replace(/\.ts$/, ".js"));
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(target)})`], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });
    expect(result.stderr.split("\n").find((line) => /Error/.test(line)) ?? "").toBe("");
    expect(result.status).toBe(0);
  });
});
