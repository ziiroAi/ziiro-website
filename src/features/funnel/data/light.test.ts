// 00-index §1.5 (request 14) and wave9-requests item 8: light.ts is the light entry. The header on every page,
// S0 to S8 and the film import it, so its imports must never reach the agents data, the jobs, the classifier
// or compose.ts. reach() walks the relative imports that survive the build.
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FunnelLight } from "./contract";
import * as light from "./light";

/** `npm run typecheck` fails on this line if light.ts falls short of FunnelLight. */
const funnelLight: FunnelLight = light;

const DATA = resolve(process.cwd(), "src/features/funnel/data");
/** `import … from` and `export … from`. `import type` is left out, because the build drops it. */
const RUNTIME_IMPORT = /^(?:import|export)(?!\s+type\b)[^'"]*?from\s+["']([^"']+)["']/gm;

/** Every file `entry` reaches at run time, as paths from data/, sorted. */
function reach(entry: string): string[] {
  const seen = new Set<string>();
  const visit = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, spec] of readFileSync(file, "utf8").matchAll(RUNTIME_IMPORT)) {
      // "./x.js" names "./x.ts" (B18: the api/ functions run these files as plain ESM).
      if (spec.startsWith(".")) visit(`${resolve(dirname(file), spec.replace(/\.js$/, ""))}.ts`);
    }
  };
  visit(resolve(DATA, entry));
  return [...seen].map((file) => relative(DATA, file)).sort();
}

describe("light.ts, the light entry (00-index §1.5)", () => {
  it("has every member of FunnelLight", () => {
    const members = ["COPY_LINES", "copy", "calendlyUrl", "currencyFor"] as const;
    expect(members.filter((m) => funnelLight[m] === undefined)).toEqual([]);
  });

  it("reaches only the contract, the copy, the booking link and the currency rule", () => {
    expect(reach("light.ts")).toEqual([
      "../../pricing/entities/rates.ts", "calendly.ts", "contract.ts", "copy.ts", "copy/email.ts",
      "copy/flow.ts", "copy/plan.ts", "copy/seo.ts", "copy/site.ts", "currency.ts", "light.ts",
    ]);
  });
});
