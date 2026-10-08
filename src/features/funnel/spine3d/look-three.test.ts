// (C) W14-K: the composer's GPU memory. Built against a stand-in renderer: three makes no GL calls until a frame.
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { describe, expect, it, vi } from "vitest";
import { LOOK } from "./look";
import { disposeComposer, makeComposer } from "./look-three";

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
