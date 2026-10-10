// (C) W14-K: the composer's GPU memory. Built against a stand-in renderer: three makes no GL calls until a frame.
import * as THREE from "three";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { describe, expect, it, vi } from "vitest";
import { LOOK } from "./look";
import { baseFraming } from "./camera";
import { LEAK_FACING, LEAK_GLSL, RING_EDGE_FACING, RING_END_SCREEN, RING_END_SOFT, RING_LAYER, RING_SOFT_DEPTH, RING_SOFT_EDGE, RingPass, backgroundOffsetX, disposeComposer, makeBackground, makeBody, makeComposer, makeEnvironment, makeRings } from "./look-three";

/** The site sets the renderer's pixel ratio; three's EffectComposer.addPass used to multiply sizes by it again. */
const renderer = { getPixelRatio: () => 2, getSize: (v: THREE.Vector2) => v.set(300, 200) } as unknown as THREE.WebGLRenderer;
const build = (options: { samples: number; bloomScale: number } = { samples: 2, bloomScale: 1 }) =>
  makeComposer(renderer, new THREE.Scene(), new THREE.PerspectiveCamera(), LOOK.themes.dark, 600, 400,
    { ...options, shared: makeBackground(LOOK.themes.dark, 1.5).shared });

describe("makeComposer (W14-K)", () => {
  it("draws the scene into the only multisampled target, with depth, and runs the passes after it on a plain one", () => {
    const composer = build();
    expect(composer.readBuffer.samples).toBe(2);
    expect(composer.readBuffer.depthBuffer).toBe(true);
    expect(composer.readBuffer.depthTexture).toBeInstanceOf(THREE.DepthTexture);   // W22-RING2: read by RingPass
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
    expect(passes.filter((pass) => pass instanceof ShaderPass)).toHaveLength(0);
    expect(passes.filter((pass) => pass instanceof RingPass)).toHaveLength(1);     // SANITISE, then the rings (W22-RING2)
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

describe("a lit gap's leak stays on the rims that face into its slit (W19-GHOST)", () => {
  // Stop 1 drew the rings above the lit one as faint arcs across the bone: the leak lit the outward faces of the bone
  // standing in front of the ring, at the ring's level, so the hidden ring's arc showed through.
  const compiled = () => {
    const { shared } = makeBackground(LOOK.themes.light, 9 / 16);
    const body = makeBody(LOOK.themes.light, null, null, 0, shared);
    const sh = {
      uniforms: {}, defines: {},
      vertexShader: "#include <common>\n#include <project_vertex>",
      fragmentShader: "#include <common>\n#include <emissivemap_fragment>\n#include <opaque_fragment>",
    } as unknown as THREE.WebGLProgramParametersWithUniforms;
    body.onBeforeCompile(sh, renderer);
    return sh;
  };

  it("hands the fragment the surface's normal in the model's space", () => {
    const sh = compiled();
    expect(sh.vertexShader).toMatch(/vNm = mat3\(uToModel\) \* mat3\(modelMatrix\) \* objectNormal/);
    expect(sh.fragmentShader).toContain("leak(vM, normalize(vNm))");
  });

  it("weights every gap's band by how squarely the face looks along the column", () => {
    expect(LEAK_GLSL).toContain("smoothstep(LEAK_FACING_FROM, LEAK_FACING_TO, abs(dot(nm, n)))");
    expect(LEAK_GLSL.match(/leakOne\(m, nm, /g)).toHaveLength(LOOK.gaps.length);
  });

  it("gives an outward face (normal at 60 degrees or more off the column) none, and a rim all of it", () => {
    expect(LEAK_FACING.from).toBeGreaterThanOrEqual(Math.cos((60 * Math.PI) / 180));
    expect(LEAK_FACING.to).toBeLessThan(Math.cos((20 * Math.PI) / 180));
  });
});

describe("a lit ring shows no specks where it turns edge-on at the column's silhouette (final review L3)", () => {
  // L3: at the phone's Sales rest the lit rings' ends poked 2-3 px past the left rim, edge-on to the camera.
  it("drops a ring's fragments that face the camera less than RING_EDGE_FACING", () => {
    const { shared } = makeBackground(LOOK.themes.dark, 9 / 16);
    const rings = makeRings(LOOK.themes.dark, LOOK.gaps, shared);
    const band = rings.group.children[0] as THREE.Mesh;
    expect((band.material as THREE.ShaderMaterial).fragmentShader).toMatch(/if \(facing < RING_EDGE_FACING\) discard;/);
    expect((band.material as THREE.ShaderMaterial).fragmentShader).toContain(`#define RING_EDGE_FACING ${RING_EDGE_FACING.toFixed(2)}`);
  });

  it("only trims the edge-on ends: the arc turned 60 degrees toward the text (W18-D) and everything nearer stays lit", () => {
    expect(RING_EDGE_FACING).toBeGreaterThan(0);
    expect(RING_EDGE_FACING).toBeLessThan(Math.cos((70 * Math.PI) / 180));
    expect(RING_END_SOFT).toBeGreaterThan(RING_EDGE_FACING);
    expect(RING_END_SOFT).toBeLessThan(Math.cos((60 * Math.PI) / 180));
  });
});

describe("every lit ring sits clean in its gap: no bone cuts it, no end is a hard cut (W22-RING, W22-RING2)", () => {
  const band = (): THREE.Mesh => {
    const { shared } = makeBackground(LOOK.themes.light, 16 / 9);
    return makeRings(LOOK.themes.light, LOOK.gaps, shared).group.children[2] as THREE.Mesh;
  };
  const material = (): THREE.ShaderMaterial => band().material as THREE.ShaderMaterial;

  // The owner's 16:24 wedge, then the 1024 Operations stop's diagonal: bone lips crossing the band cut it hard.
  it("draws the bands in RingPass on their own layer, with a soft depth test in the shader instead of a hard one", () => {
    const ring = band();
    expect(ring.layers.isEnabled(RING_LAYER)).toBe(true);
    expect(ring.layers.isEnabled(0)).toBe(false);
    const mat = material();
    expect(mat.depthTest).toBe(false);
    expect(mat.depthWrite).toBe(false);
    expect(mat.transparent).toBe(true);
    expect(mat.uniforms.uDepth).toBeDefined();
    expect(mat.fragmentShader).toContain("a *= vis / 13.0;");
    expect(mat.fragmentShader).toContain("1.0 - smoothstep(RING_SOFT_FROM, RING_SOFT_TO, ringZ - bone)");
  });

  it("veils a ring under a thin lip but hides it behind a body, over a soft edge a little wider than a gap", () => {
    expect(RING_SOFT_DEPTH.from).toBeGreaterThan(0);
    expect(RING_SOFT_DEPTH.to).toBeLessThan(Math.min(...LOOK.gaps.map((g) => g.radius)));
    expect(RING_SOFT_EDGE).toBeGreaterThan(0);
    expect(RING_SOFT_EDGE).toBeLessThan(0.05);
  });

  // The owner's upper ring ended in a sharp diagonal cut; review-w20 M1 and L2 were ring-end specks; the 1024 stop's end
  // was square because the band turns edge-on at the column's silhouette.
  it("fades the band's ends over its last RING_END_SCREEN of half-width on screen, as well as by facing", () => {
    const fs = material().fragmentShader;
    expect(fs).toContain("smoothstep(RING_EDGE_FACING, RING_END_SOFT, facing) * smoothstep(0.0, RING_END_SCREEN, 1.0 - across)");
    expect(fs).toContain(`#define RING_END_SOFT ${RING_END_SOFT.toFixed(2)}`);
    expect(RING_END_SCREEN).toBeGreaterThan(0.1);
    expect(RING_END_SCREEN).toBeLessThan(0.5);
  });

  it("RingPass swaps, copies the scene through SANITISE and draws only the ring layer, then restores the camera", () => {
    const camera = new THREE.PerspectiveCamera();
    const { shared } = makeBackground(LOOK.themes.dark, 1.5);
    const pass = new RingPass(new THREE.Scene(), camera, shared);
    expect(pass.needsSwap).toBe(true);
    const seen: number[] = [];
    const fake = {
      setRenderTarget: vi.fn(), render: vi.fn(() => seen.push(camera.layers.mask)), autoClear: true,
    } as unknown as THREE.WebGLRenderer;
    const read = new THREE.WebGLRenderTarget(4, 4);
    read.depthTexture = new THREE.DepthTexture(4, 4);
    const quadRender = vi.spyOn((pass as unknown as { quad: { render: () => void } }).quad, "render").mockImplementation(() => undefined);
    pass.render(fake, new THREE.WebGLRenderTarget(4, 4), read);
    expect(quadRender).toHaveBeenCalled();
    expect(seen).toEqual([1 << RING_LAYER]);
    expect(camera.layers.mask).toBe(1);
    expect(shared.uniforms.uDepth.value).toBe(read.depthTexture);
    expect(fake.autoClear).toBe(true);
  });
});
