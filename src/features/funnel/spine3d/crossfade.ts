// (C) W18-B: the 3D half of the light/dark crossfade. Before the look changes, the canvas's last frame (old look,
// already tone-mapped and dithered) is copied to a texture; each frame after it, the new look is drawn and the copy
// laid over it at fadeAlpha, on the page's own ease-in-out from the page's own start (flow/themeFade.ts). The blend
// is of the canvas's encoded sRGB values, as CSS mixes the page's colours, so the canvas's ground stays the page's.
import {
  FramebufferTexture, Mesh, OrthographicCamera, PlaneGeometry, RawShaderMaterial, RGBFormat, Scene, Vector2, type WebGLRenderer,
} from "three";
import { fadeAlpha, type ThemeFade } from "../flow/themeFade";

export interface Crossfade {
  /** Copies the frame now on the canvas: call right after drawing it, in the same task. */
  capture(fade: ThemeFade): void;
  /** Lays the copy over the frame just drawn. False (and the copy let go) once the fade has run. */
  draw(now: number): boolean;
  /** Drops a fade under way: a resize, or a theme change with no fade. */
  cancel(): void;
  /** True while a copy is held, i.e. until the frame after the fade has run. */
  active(): boolean;
  dispose(): void;
}

const VERTEX = `precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Raw: no tone mapping or colour-space chunks, so the copied pixels go back exactly as they were.
const FRAGMENT = `precision highp float;
uniform sampler2D map;
uniform float alpha;
varying vec2 vUv;
void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, alpha); }`;

export function makeCrossfade(renderer: WebGLRenderer): Crossfade {
  const material = new RawShaderMaterial({
    uniforms: { map: { value: null }, alpha: { value: 1 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const size = new Vector2();
  let snapshot: FramebufferTexture | null = null;
  let fade: ThemeFade | null = null;

  const cancel = () => {
    snapshot?.dispose();
    snapshot = null;
    fade = null;
    material.uniforms.map.value = null;
  };

  return {
    capture: (next) => {
      cancel();
      renderer.getDrawingBufferSize(size);
      if (size.x <= 0 || size.y <= 0 || next.ms <= 0) return;
      snapshot = new FramebufferTexture(size.x, size.y);
      // The canvas has no alpha (scene.ts createRenderer): an RGBA copy of it is an invalid copy, and leaves black.
      snapshot.format = RGBFormat;
      snapshot.internalFormat = "RGB8";  // three leaves RGB unsized, and texStorage2D refuses that (INVALID_ENUM)
      renderer.setRenderTarget(null);
      renderer.copyFramebufferToTexture(snapshot);
      material.uniforms.map.value = snapshot;
      fade = next;
    },
    draw: (now) => {
      if (!snapshot || !fade) return false;
      const alpha = fadeAlpha(now, fade);
      if (alpha <= 0) {
        cancel();
        return false;
      }
      material.uniforms.alpha.value = alpha;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      renderer.autoClear = autoClear;
      return true;
    },
    cancel,
    active: () => snapshot !== null,
    dispose: () => {
      cancel();
      quad.geometry.dispose();
      material.dispose();
    },
  };
}
