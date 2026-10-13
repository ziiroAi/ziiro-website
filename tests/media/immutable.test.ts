import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { IMMUTABLE_DIRS, filesUnder, readManifest, sha256 } from "../../scripts/hash-immutable.mjs";

const manifest: Record<string, string> = readManifest();

describe("files served immutable for a year (/media, /spine)", () => {
  it("records every file: run `npm run hash:immutable` after adding one", () => {
    expect(IMMUTABLE_DIRS.flatMap(filesUnder).filter((f: string) => !manifest[f])).toEqual([]);
  });

  it("never changes a recorded file: new bytes need a new name or folder (§6.6)", () => {
    const changed = Object.entries(manifest).filter(([f, hash]) => existsSync(f) && sha256(f) !== hash);
    expect(changed.map(([f]) => f)).toEqual([]);
  });
});
