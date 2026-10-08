import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * (C) A small import walker for spec §13.10's rules. It reads source, not the bundle: static
 * imports always, `import()` only inside the given folders. `import type` is skipped, because
 * TypeScript erases it.
 */
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const CODE = /\.(?:ts|tsx|js|jsx|mjs)$/;
const CANDIDATES = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", "/index.ts", "/index.tsx"];

/** "react-dom/client" is "react-dom"; "@radix-ui/react-tooltip/x" is "@radix-ui/react-tooltip". */
export const packageOf = (spec: string) => spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/");

function resolveLocal(from: string, spec: string): string {
  const bare = spec.split("?")[0];
  const base = bare.startsWith("@/") ? path.join("src", bare.slice(2)) : path.join(path.dirname(from), bare);
  const file = CANDIDATES.map((ext) => base + ext).find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) throw new Error(`${from}: can't resolve "${spec}"`);
  return file;
}

export interface Reach { files: Set<string>; packages: Set<string> }

export function reachable(entries: string[], followDynamicUnder: string[] = []): Reach {
  const reach: Reach = { files: new Set(), packages: new Set() };
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (reach.files.has(file)) continue;
    reach.files.add(file);
    if (!CODE.test(file)) continue;
    const source = readFileSync(file, "utf8");
    const specs = [...source.matchAll(STATIC_IMPORT)].map((m) => m[1]);
    if (followDynamicUnder.some((dir) => file.startsWith(dir))) {
      specs.push(...[...source.matchAll(DYNAMIC_IMPORT)].map((m) => m[1]));
    }
    for (const spec of specs) {
      if (spec.startsWith(".") || spec.startsWith("@/")) queue.push(resolveLocal(file, spec));
      else reach.packages.add(packageOf(spec));
    }
  }
  return reach;
}
