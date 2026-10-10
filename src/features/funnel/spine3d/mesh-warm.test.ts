// (C) W15-M6: one download of the spine's mesh per page, handed to the first 3D build that needs it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetWarmMeshes, takeWarmMesh, warmMesh } from "./mesh-warm";

const URL_A = "/spine/3d/m1/spine-phone.glb";
const bytes = new Uint8Array([1, 2, 3]).buffer;
let meshFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  forgetWarmMeshes();
  meshFetch = vi.fn(async () => new Response(bytes));
  vi.stubGlobal("fetch", meshFetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("the warm mesh (W15-M6)", () => {
  it("asks for a mesh once, however often it is warmed", () => {
    warmMesh(URL_A);
    warmMesh(URL_A);
    expect(meshFetch).toHaveBeenCalledTimes(1);
    expect(meshFetch.mock.calls[0][0]).toBe(URL_A);
  });

  it("asks with fetch's defaults, as the 3D worker does, so an HTTP cache entry would match", () => {
    warmMesh(URL_A);
    expect(meshFetch.mock.calls[0][1]).toBeUndefined();
  });

  it("hands its bytes to the first build that takes them, and to no second one", async () => {
    warmMesh(URL_A);
    const taken = takeWarmMesh(URL_A);
    expect(new Uint8Array((await taken)!)).toEqual(new Uint8Array(bytes));
    expect(takeWarmMesh(URL_A)).toBeUndefined();
  });

  it("never asks again for a mesh already asked for on this page, even once taken", () => {
    warmMesh(URL_A);
    void takeWarmMesh(URL_A);
    warmMesh(URL_A);
    expect(meshFetch).toHaveBeenCalledTimes(1);
  });

  it("says when the download is over, so the next mesh can wait its turn, and never rejects", async () => {
    await expect(warmMesh(URL_A)).resolves.toBeUndefined();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await expect(warmMesh("/spine/3d/closeup/phone.glb")).resolves.toBeUndefined();
  });

  it("has nothing to hand over for a mesh nobody warmed", () => {
    expect(takeWarmMesh(URL_A)).toBeUndefined();
  });

  it("hands over null when the download failed, so the 3D fetches the mesh itself", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    warmMesh(URL_A);
    expect(await takeWarmMesh(URL_A)).toBeNull();
  });
});
