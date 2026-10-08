import { describe, expect, it } from "vitest";
import { canOffscreen, meshFor, preflight, reasonFor } from "./rules";

describe("preflight (W14-C §4): when the still stays and no 3D code loads", () => {
  it("lets the 3D try on an ordinary connection in a browser with WebGL2", () => {
    expect(preflight({ saveData: false, webgl2: true })).toBeNull();
  });

  it("keeps the still when the visitor asked to save data", () => {
    expect(preflight({ saveData: true, webgl2: true })).toBe("save-data");
  });

  it("keeps the still, without fetching any 3D code, in a browser that has no WebGL2 at all", () => {
    expect(preflight({ saveData: false, webgl2: false })).toBe("no-webgl2");
  });
});

describe("reasonFor: a failure the viewer reports, as the reason the still comes back", () => {
  it.each([
    ["no-webgl2", "no-webgl2"],
    ["context-lost", "context-lost"],
    ["mesh-failed", "mesh-failed"],
  ] as const)("keeps %s as it is", (raw, reason) => {
    expect(reasonFor(raw)).toBe(reason);
  });

  it("files anything else under error, so an unknown failure still shows the still", () => {
    expect(reasonFor("shader exploded")).toBe("error");
    expect(reasonFor(undefined)).toBe("error");
  });
});

describe("meshFor: the phone mesh under 600 px, the desktop mesh from 600 px (the still's own split)", () => {
  it.each([
    [390, "phone"],
    [599, "phone"],
    [600, "desktop"],
    [1440, "desktop"],
  ] as const)("%i px wide gets the %s mesh", (width, mesh) => {
    expect(meshFor(width)).toBe(mesh);
  });
});

describe("canOffscreen: the worker path needs OffscreenCanvas, transferControlToOffscreen and Worker", () => {
  const canvas = { transferControlToOffscreen: () => ({}) };

  it("is true when all three exist", () => {
    expect(canOffscreen({ OffscreenCanvas: class {}, Worker: class {} }, canvas)).toBe(true);
  });

  it("is false without OffscreenCanvas, without Worker or on a canvas that can't transfer", () => {
    expect(canOffscreen({ Worker: class {} }, canvas)).toBe(false);
    expect(canOffscreen({ OffscreenCanvas: class {} }, canvas)).toBe(false);
    expect(canOffscreen({ OffscreenCanvas: class {}, Worker: class {} }, {})).toBe(false);
  });
});
