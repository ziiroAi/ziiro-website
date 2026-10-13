// (C) W16-A: the plan's meshes. W23-B: m5c, m5b's geometry Draco-compressed (its textures unchanged).
import { describe, expect, it } from "vitest";
import { DRACO_FILES, DRACO_PATH, MESH_URLS, PLAN_MESHES } from "./mesh-urls";

describe("the plan's meshes (W16-A)", () => {
  it("draws the full spine from m5c, m5b's geometry in Draco (W23-B)", () => {
    expect(MESH_URLS).toEqual({ phone: "/spine/3d/m5c/spine-phone.glb", desktop: "/spine/3d/m5c/spine-desktop.glb" });
  });

  it("warms the big spine only: the close-up is dropped (W17-S)", () => {
    expect(PLAN_MESHES).toEqual([MESH_URLS]);
  });

  it("names the Draco decoder's two files under its own immutable folder (W23-B)", () => {
    expect(DRACO_PATH).toBe("/spine/3d/draco-r186/");
    expect(DRACO_FILES).toEqual(["/spine/3d/draco-r186/draco_wasm_wrapper.js", "/spine/3d/draco-r186/draco_decoder.wasm"]);
  });
});
