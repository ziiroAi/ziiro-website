// (C) W16-A: the plan's meshes. The full spine is m3: worker-3's mended m2 with the orange smears taken out of its base colour (W16-C2).
import { describe, expect, it } from "vitest";
import { CLOSEUP_MESH_URLS, MESH_URLS, PLAN_MESHES } from "./mesh-urls";

describe("the plan's meshes (W16-A)", () => {
  it("draws the full spine from m3, the mended mesh without the orange smears (W16-I)", () => {
    expect(MESH_URLS).toEqual({ phone: "/spine/3d/m4/spine-phone.glb", desktop: "/spine/3d/m4/spine-desktop.glb" });
  });

  it("warms m3 first, then the close-up", () => {
    expect(PLAN_MESHES).toEqual([MESH_URLS, CLOSEUP_MESH_URLS]);
  });
});
