import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

/**
 * (C) W15-D: the live spine's start is a relay (probe → host → worker → mesh), and on a phone each hop is a round trip
 * on Fast 4G. The host is about 1.4 kB of glue that only starts the worker, so it ships inside the lazy viewer chunk
 * (vite.config.ts, group "spine-viewer") and `import("./host")` costs no request. Three.js stays in the worker chunk,
 * and the viewer chunk stays off the first paint (§6.6, §12). Run after `npm run build`.
 */
const ASSETS = "dist/assets";
const STATIC_IMPORT = /(?:^|[;\s}])import\s*(?:[\w*{}\s,$]+from\s*)?["'](\.\/[^"']+\.js)["']/g;
const VIEWER_GZ_LIMIT = 12_000;

const files = () => readdirSync(ASSETS);
const read = (file: string) => readFileSync(`${ASSETS}/${file}`, "utf8");

/** A chunk and every chunk it imports statically, which the browser fetches before running it. */
function closure(starts: string[]): Set<string> {
  const seen = new Set<string>();
  const queue = [...starts];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of read(file).matchAll(STATIC_IMPORT)) queue.push(m[1].slice(2));
  }
  return seen;
}

describe("the live spine's chunk relay (W15-D)", () => {
  it("has no separate host chunk: the host glue ships with the viewer", () => {
    expect(files().filter((f) => /^host-[\w-]+\.js$/.test(f))).toEqual([]);
    const viewer = files().find((f) => /^spine-viewer-[\w-]+\.js$/.test(f));
    expect(viewer, "no spine-viewer chunk in dist/assets").toBeDefined();
    // The host is what names the worker: its URL lives in the viewer chunk now.
    expect(read(viewer!)).toMatch(/spine\.worker-[\w-]+\.js/);
  });

  it("keeps three.js out of the viewer chunk, and the viewer chunk small", () => {
    const viewer = files().find((f) => /^spine-viewer-[\w-]+\.js$/.test(f))!;
    expect(read(viewer)).not.toContain("__THREE__");
    expect(gzipSync(readFileSync(`${ASSETS}/${viewer}`)).length).toBeLessThanOrEqual(VIEWER_GZ_LIMIT);
  });

  it("keeps the viewer chunk off the first paint: the entry never imports it statically", () => {
    const entry = files().filter((f) => /^index-[\w-]+\.js$/.test(f));
    expect(entry.length).toBeGreaterThan(0);
    const firstPaint = closure(entry);
    expect([...firstPaint].filter((f) => /^spine-viewer-/.test(f))).toEqual([]);
  });
});
