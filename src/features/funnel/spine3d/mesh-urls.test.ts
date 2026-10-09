// (C) W16-A: the plan's meshes. The full spine is worker-3's mended m2 (W16-C: 31 holes closed, his bone blade cut).
import { describe, expect, it } from "vitest";
import { CLOSEUP_MESH_URLS, MESH_URLS, PLAN_MESHES } from "./mesh-urls";

describe("the plan's meshes (W16-A)", () => {
  it("draws the full spine from m2, the mended mesh", () => {
    expect(MESH_URLS).toEqual({ phone: "/spine/3d/m2/spine-phone.glb", desktop: "/spine/3d/m2/spine-desktop.glb" });
  });

  it("warms m2 first, then the close-up", () => {
    expect(PLAN_MESHES).toEqual([MESH_URLS, CLOSEUP_MESH_URLS]);
  });
});
