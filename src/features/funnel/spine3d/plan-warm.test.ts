// (C) W15-M6: the plan's mesh downloads during the questions on a real GPU, so the plan's 3D does not wait on it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetWarmMeshes, takeWarmMesh } from "./mesh-warm";
import { MESH_URLS, PLAN_MESHES } from "./mesh-urls";
import { SPINE_WORKER_SCRIPT, forgetWarmFiles, warmPlanMesh, type WarmEnv } from "./plan-warm";

const bytes = new Uint8Array([4, 5, 6]).buffer;
let meshFetch: ReturnType<typeof vi.fn>;
let probes = 0;

/** A phone on a real GPU and a fast connection, unless a test says otherwise. */
function env(over: Partial<WarmEnv> = {}, software = false, probeMs = 0): WarmEnv {
  return {
    connection: { saveData: false, effectiveType: "4g" },
    webgl2: true,
    width: 390,
    meshes: [MESH_URLS],
    scripts: [],
    probe: () => {
      probes++;
      return new Promise((resolve) => setTimeout(() => resolve(software), probeMs));
    },
    ...over,
  };
}

beforeEach(() => {
  forgetWarmMeshes();
  forgetWarmFiles();
  probes = 0;
  meshFetch = vi.fn(async () => new Response(bytes));
  vi.stubGlobal("fetch", meshFetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("warming the plan's mesh during the questions (W15-M6)", () => {
  it("downloads the phone mesh once the probe says the GPU is real, and hands it to the plan's 3D", async () => {
    const started = await warmPlanMesh(new AbortController().signal, env());
    expect(started).toBe(true);
    expect(meshFetch).toHaveBeenCalledTimes(1);
    expect(meshFetch.mock.calls[0][0]).toBe(MESH_URLS.phone);
    expect(new Uint8Array((await takeWarmMesh(MESH_URLS.phone))!)).toEqual(new Uint8Array(bytes));
  });

  it("picks the desktop mesh on a wide screen", async () => {
    await warmPlanMesh(new AbortController().signal, env({ width: 1440 }));
    expect(meshFetch.mock.calls[0][0]).toBe(MESH_URLS.desktop);
  });

  it("asks for nothing until the probe answers", async () => {
    vi.useFakeTimers();
    try {
      const warming = warmPlanMesh(new AbortController().signal, env({}, false, 200));
      await vi.advanceTimersByTimeAsync(150);
      expect(probes).toBe(1);
      expect(meshFetch).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(60);
      expect(await warming).toBe(true);
      expect(meshFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("asks for no mesh on a software renderer", async () => {
    expect(await warmPlanMesh(new AbortController().signal, env({}, true))).toBe(false);
    expect(meshFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["Save-Data", { connection: { saveData: true, effectiveType: "4g" } }],
    ["a 3g connection", { connection: { saveData: false, effectiveType: "3g" } }],
  ] as const)("warms the mesh on %s, where the plan's 3D now loads too (W22-LOAD)", async (_name, over) => {
    expect(await warmPlanMesh(new AbortController().signal, env(over))).toBe(true);
    expect(meshFetch).toHaveBeenCalled();
  });

  it.each([
    ["no WebGL2", { webgl2: false }],
  ] as const)("asks neither the probe nor for a mesh on %s", async (_name, over) => {
    expect(await warmPlanMesh(new AbortController().signal, env(over))).toBe(false);
    expect(probes).toBe(0);
    expect(meshFetch).not.toHaveBeenCalled();
  });

  it("asks for nothing once the visitor has left the funnel, even while the probe was out", async () => {
    const leaving = new AbortController();
    const warming = warmPlanMesh(leaving.signal, env({}, false, 20));
    leaving.abort();
    expect(await warming).toBe(false);
    expect(meshFetch).not.toHaveBeenCalled();
  });

  it("asks for nothing when the visitor left before it began", async () => {
    const left = new AbortController();
    left.abort();
    expect(await warmPlanMesh(left.signal, env())).toBe(false);
    expect(probes).toBe(0);
  });

  it("warms only the big spine: the plan has no close-up any more (W17-S)", () => {
    expect(PLAN_MESHES).toEqual([MESH_URLS]);
  });

  it("asks for the big spine in the visitor's size class only, one request (W17-S)", async () => {
    await warmPlanMesh(new AbortController().signal, env({ meshes: PLAN_MESHES }));
    await warmPlanMesh(new AbortController().signal, env({ meshes: PLAN_MESHES }));
    expect(meshFetch.mock.calls.map(([url]) => url)).toEqual([MESH_URLS.phone]);
  });

  it("warms every mesh the plan needs, one after another, the first in the list first, one request each", async () => {
    vi.useFakeTimers();
    try {
      const second = { phone: "/spine/3d/second/spine-phone.glb", desktop: "/spine/3d/second/spine-desktop.glb" };  // any mesh but MESH_URLS (m4 since W17-M)
      meshFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(new Response(bytes)), 100)));
      const warming = warmPlanMesh(new AbortController().signal, env({ meshes: [MESH_URLS, second] }));
      await vi.advanceTimersByTimeAsync(50);
      expect(meshFetch.mock.calls.map(([url]) => url)).toEqual([MESH_URLS.phone]);
      await vi.advanceTimersByTimeAsync(100);
      expect(meshFetch.mock.calls.map(([url]) => url)).toEqual([MESH_URLS.phone, second.phone]);
      await vi.advanceTimersByTimeAsync(100);
      expect(await warming).toBe(true);
      expect(takeWarmMesh(second.phone)).toBeDefined();
      expect(meshFetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("starts no further mesh once the visitor has left the funnel", async () => {
    vi.useFakeTimers();
    try {
      const second = { phone: "/spine/3d/second/spine-phone.glb", desktop: "/spine/3d/second/spine-desktop.glb" };  // any mesh but MESH_URLS (m4 since W17-M)
      meshFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(new Response(bytes)), 100)));
      const leaving = new AbortController();
      const warming = warmPlanMesh(leaving.signal, env({ meshes: [MESH_URLS, second] }));
      await vi.advanceTimersByTimeAsync(50);
      leaving.abort();
      await vi.advanceTimersByTimeAsync(200);
      await warming;
      expect(meshFetch.mock.calls.map(([url]) => url)).toEqual([MESH_URLS.phone]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("downloads the 3D worker's script first, then the meshes, each once", async () => {
    await warmPlanMesh(new AbortController().signal, env({ scripts: ["/assets/spine.worker-abc.js"] }));
    await warmPlanMesh(new AbortController().signal, env({ scripts: ["/assets/spine.worker-abc.js"] }));
    expect(meshFetch.mock.calls.map(([url]) => url)).toEqual(["/assets/spine.worker-abc.js", MESH_URLS.phone]);
  });

  it("warms the worker the 3D host starts (spine.worker.ts, as built)", () => {
    expect(SPINE_WORKER_SCRIPT).toMatch(/spine\.worker/);
  });

  it("makes one mesh request in all, however often it is asked", async () => {
    await warmPlanMesh(new AbortController().signal, env());
    await warmPlanMesh(new AbortController().signal, env());
    expect(meshFetch).toHaveBeenCalledTimes(1);
  });
});
