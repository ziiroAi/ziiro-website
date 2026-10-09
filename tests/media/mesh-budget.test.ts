// (C) W19 r2 (review L2): the live meshes stay inside their download budgets: 1.6 MB on a phone, 3 MB on desktop
// (mesh-urls.ts). A re-crunch that grows past them fails here, not on a phone.
import { statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MESH_URLS } from "../../src/features/funnel/spine3d/mesh-urls";

const BUDGET = { phone: 1_600_000, desktop: 3_000_000 } as const;

describe("MESH_URLS' GLBs (W19 r2)", () => {
  it.each(Object.entries(BUDGET))("the %s mesh is within %i bytes", (size, limit) => {
    const url = MESH_URLS[size as keyof typeof BUDGET];
    expect(statSync(`public${url}`).size).toBeLessThanOrEqual(limit);
  });
});
