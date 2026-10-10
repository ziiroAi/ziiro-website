// (C) W23-B: the Draco decoder DRACOLoader fetches (mesh-urls.ts DRACO_PATH) is three's own, byte for byte. /spine is
// cached immutable for a year, so a three upgrade that changes these files needs a new folder, not a copy over the old
// one; this fails until that is done.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DRACO_FILES } from "../../src/features/funnel/spine3d/mesh-urls";

const THREE_DRACO = "node_modules/three/examples/jsm/libs/draco/gltf";

describe("the Draco decoder's files (W23-B)", () => {
  it.each(DRACO_FILES)("%s matches three's copy", (url) => {
    const served = readFileSync(`public${url}`);
    expect(served.equals(readFileSync(`${THREE_DRACO}/${url.split("/").pop()}`))).toBe(true);
  });
});
