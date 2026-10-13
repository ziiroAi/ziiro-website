import { describe, expect, it } from "vitest";
import { gpuNameOf, isSoftwareRenderer, isTooSlow, SAMPLE_FRAMES, spinFrameMsFor } from "./pace";

const UNMASKED_RENDERER = 0x9246;
const RENDERER = 0x1f01;
const fakeGl = (unmasked: boolean) => ({
  RENDERER,
  getExtension: () => (unmasked ? { UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER } : null),
  getParameter: (name: number) => (name === UNMASKED_RENDERER ? "SwiftShader" : name === RENDERER ? "WebKit WebGL" : null),
});

describe("pacing the idle spin (W14-O)", () => {
  it("knows a software renderer by its name", () => {
    expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)")).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(isSoftwareRenderer("Software Rasterizer")).toBe(true);
    // W14-U L4: Windows WARP (a GPU-less VM or an RDP session) and Mesa's softpipe.
    expect(isSoftwareRenderer("ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(true);
    expect(isSoftwareRenderer("softpipe")).toBe(true);
    expect(isSoftwareRenderer("ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)")).toBe(false);
    expect(isSoftwareRenderer("Adreno (TM) 640")).toBe(false);
    expect(isSoftwareRenderer("")).toBe(false);
  });

  it("reads the unmasked renderer name where the browser gives it, and the plain one otherwise", () => {
    expect(gpuNameOf(fakeGl(true))).toBe("SwiftShader");
    expect(gpuNameOf(fakeGl(false))).toBe("WebKit WebGL");
  });

  it("calls the GPU too slow once the median of the first 30 frames is over 33 ms", () => {
    expect(isTooSlow(Array<number>(SAMPLE_FRAMES).fill(50))).toBe(true);
    expect(isTooSlow(Array<number>(SAMPLE_FRAMES).fill(16.7))).toBe(false);
    expect(isTooSlow(Array<number>(SAMPLE_FRAMES - 1).fill(50))).toBe(false);
  });

  it("lets a few long frames (a shader compile, a GC) pass, because it takes the median", () => {
    expect(isTooSlow([...Array<number>(10).fill(120), ...Array<number>(20).fill(16.7)])).toBe(false);
  });

  it("caps the idle spin at 30 fps on a phone and leaves desktop at the display's rate", () => {
    expect(spinFrameMsFor("phone")).toBeCloseTo(1000 / 30);
    expect(spinFrameMsFor("desktop")).toBe(0);
  });
});
