// (C) W14-K: the composer's GPU memory. Built against a stand-in renderer: three makes no GL calls until a frame.
import * as THREE from "three";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { describe, expect, it, vi } from "vitest";
import { LOOK } from "./look";
import { baseFraming } from "./camera";
import { backgroundOffsetX, disposeComposer, makeBackground, makeComposer, makeEnvironment } from "./look-three";

/** The site sets the renderer's pixel ratio; three's EffectComposer.addPass used to multiply sizes by it again. */
const renderer = { getPixelRatio: () => 2, getSize: (v: THREE.Vector2) => v.set(300, 200) } as unknown as THREE.WebGLRenderer;
const build = (options = { samples: 2, bloomScale: 1 }) =>
  makeComposer(renderer, new THREE.Scene(), new THREE.PerspectiveCamera(), LOOK.themes.dark, 600, 400, options);

describe("makeComposer (W14-K)", () => {
  it("draws the scene into the only multisampled target, with depth, and runs the passes after it on a plain one", () => {
    const composer = build();
    expect(composer.readBuffer.samples).toBe(2);
    expect(composer.readBuffer.depthBuffer).toBe(true);
    expect([composer.readBuffer.width, composer.readBuffer.height]).toEqual([600, 400]);
    expect(composer.writeBuffer.samples).toBe(0);
    expect(composer.writeBuffer.depthBuffer).toBe(false);
    expect([composer.writeBuffer.width, composer.writeBuffer.height]).toEqual([600, 400]);
  });

  it("swaps its buffers an even number of times a frame, so every frame draws the scene into the multisampled one", () => {
    const swaps = build().passes.filter((pass) => pass.needsSwap).length;
    expect(swaps % 2).toBe(0);
  });

  it("dithers last, inside the output pass after the tone mapping and sRGB, with no extra pass (W15-A)", () => {
    const passes = build().passes;
    const output = passes.at(-1) as OutputPass;
    expect(output).toBeInstanceOf(OutputPass);
    const fs = output.material.fragmentShader;
    expect(fs).toContain("w15Dither");
    expect(fs.lastIndexOf("w15Dither")).toBeGreaterThan(fs.lastIndexOf("sRGBTransferOETF"));
    expect(passes.filter((pass) => pass instanceof ShaderPass)).toHaveLength(1);   // SANITISE only
  });

  it("sizes the bloom from the canvas times bloomScale, not times the renderer's pixel ratio on top", () => {
    const bloomOf = (scale: number) =>
      build({ samples: 2, bloomScale: scale }).passes.find((pass) => pass instanceof UnrealBloomPass) as UnrealBloomPass;
    expect(bloomOf(1).renderTargetBright.width).toBe(300);
    expect(bloomOf(2).renderTargetBright.width).toBe(600);
  });

  it("disposes every pass with the composer, so a rebuild leaks no bloom targets", () => {
    const composer = build();
    const spies = composer.passes.map((pass) => vi.spyOn(pass, "dispose"));
    disposeComposer(composer);
    spies.forEach((spy) => expect(spy).toHaveBeenCalled());
  });
});

describe("makeEnvironment (W14-V T4)", () => {
  it("frees its temporary scene once prefiltered, and hands back the render target that owns the framebuffer", () => {
    const disposals: ReturnType<typeof vi.fn>[] = [];
    const target = { texture: new THREE.Texture(), dispose: vi.fn() };
    const pmrem = {
      fromScene: vi.fn((scene: THREE.Scene) => {
        scene.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          disposals.push(vi.spyOn(mesh.geometry, "dispose"), vi.spyOn(mesh.material as THREE.Material, "dispose"));
        });
        return target;
      }),
      dispose: vi.fn(),
    };
    const made = makeEnvironment({} as THREE.WebGLRenderer, LOOK.themes.dark, () => pmrem as unknown as THREE.PMREMGenerator);
    expect(made).toBe(target);
    expect(disposals.length).toBeGreaterThan(2);
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalled());
    expect(pmrem.dispose).toHaveBeenCalled();
  });
});

describe("the background follows the spine across the stage (W15-B2)", () => {
  // The bokeh sat on the plan's text column once the spine moved left: r17's shaft and bokeh belong beside the spine.
  it("doesn't move at r17's own framing, so S0 and the plan's hero keep their look", () => {
    for (const size of ["desktop", "phone"] as const) {
      expect(backgroundOffsetX(LOOK.camera[size], size, 1440, 816, baseFraming(size).shift[0])).toBeCloseTo(0, 9);
    }
  });

  it("moves by as much as the spine does across the screen", () => {
    // shiftXFor's desktop rule: the target sits (0.5 - shift * long / width) across the canvas.
    const across = (shift: number) => 0.5 - (shift * 1440) / 1440;
    const base = baseFraming("desktop").shift[0];
    const left = 0.5 - 0.27;
    expect(backgroundOffsetX(LOOK.camera.desktop, "desktop", 1440, 816, left)).toBeCloseTo(across(left) - across(base), 9);
  });

  it("offsets the shaft and the bokeh through a bgOffset uniform, not the vignette", () => {
    const { shared } = makeBackground(LOOK.themes.dark, 16 / 9);
    expect(shared.uniforms.bgOffset.value).toBeInstanceOf(THREE.Vector2);
  });
});
