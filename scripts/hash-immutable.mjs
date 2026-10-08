// (C) Records the sha256 of every file served immutable for a year (/media and /spine in
// vercel.json), so a changed file can't ship under a name visitors already cache (spec §6.6).
// Append-only: it adds new files and never rewrites a recorded hash. Run after adding files:
//   npm run hash:immutable
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const IMMUTABLE_DIRS = ["public/media", "public/spine"];
export const MANIFEST = "tests/media/immutable.json";

export function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith("."))
    .map((d) => path.join(d.parentPath, d.name))
    .sort();
}

export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

export const readManifest = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {});

function main() {
  const manifest = readManifest();
  let added = 0;
  for (const file of IMMUTABLE_DIRS.flatMap(filesUnder)) {
    if (manifest[file]) continue;
    manifest[file] = sha256(file);
    added += 1;
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`${added} added, ${Object.keys(sorted).length} recorded`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
