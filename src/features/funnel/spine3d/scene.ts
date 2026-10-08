// (C) W14-C §1: the live spine. three.js on a canvas the caller hands over: an OffscreenCanvas in spine.worker.ts,
// or the page's own canvas where OffscreenCanvas can't run WebGL. It never touches the DOM, so the same code runs in
// both. The mesh is the owner's Tripo spine crunched by W14-A; the look is worker-3's (look.ts, look-three.ts): r17's
// camera, metal, world, one glowing band and cap per disc gap, and bloom.
import {
  CylinderGeometry, Group, ImageBitmapLoader, Mesh, PerspectiveCamera, Quaternion, Raycaster, Scene, Vector2, Vector3,
  WebGLRenderer, type Material, type MeshStandardMaterial, type Object3D, type Texture,
} from "three";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { DISCS, type DiscId, type Theme } from "../data/contract";
import type { View } from "./camera";
import { GAPS, type Gap } from "./gaps";
import type { DiscLevels } from "./levels";
import { LOOK, type Vec3 } from "./look";
import {
  applyCamera, disposeComposer, glow, makeBackground, makeBody, makeComposer, makeEnvironment, makeLights, makeRings, TONE, type Rings,
  type Shared,
} from "./look-three";
import { bloomScaleFor, maxDprFor, samplesFor } from "./gpu";
import { gpuNameOf } from "./pace";
import type { MeshSize } from "./rules";

export type SpineCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface SceneOptions {
  canvas: SpineCanvas;
  width: number;
  height: number;
  dpr: number;
  theme: Theme;
  size: MeshSize;
  /** Absolute path of the crunched mesh. */
  meshUrl: string;
  levels: DiscLevels;
  /** Called once if the GPU drops the context. The viewer then gives the still back. */
  onContextLost(): void;
}

/** Where a disc is on screen this frame, in CSS px from the canvas's top left. W14-F pins labels to `anchor` and
 *  makes a disc tappable from `width` × `height` (44 × 44 or more, §11.3). */
export interface DiscBox {
  disc: DiscId;
  left: number;
  top: number;
  width: number;
  height: number;
  /** The right end of the disc's band, where §6.7's callouts attach. */
  anchor: { x: number; y: number };
  /** False when the disc is out of frame or behind the camera. */
  onScreen: boolean;
}

export interface SpineScene {
  /** The WebGL renderer's name, e.g. "ANGLE (Apple, ANGLE Metal Renderer: Apple M2…)" (W14-O). */
  readonly gpu: string;
  /** Draws one frame and returns every disc's box in it. */
  render(view: View): DiscBox[];
  /** The disc under a point (CSS px from the canvas's top left), or null. */
  pick(x: number, y: number): DiscId | null;
  resize(width: number, height: number, dpr: number): void;
  setTheme(theme: Theme): void;
  setLevels(levels: DiscLevels): void;
  dispose(): void;
}

/** Thrown with these messages, so rules.reasonFor can name the fallback. */
export const NO_WEBGL2 = "no-webgl2";
export const MESH_FAILED = "mesh-failed";

const UP = new Vector3(0, 1, 0);
const RIM_POINTS = 16;
/** The pick stand-ins: wider and taller than the band, so a finger finds a disc in close-up. Layer 1 never renders. */
const PICK = { layer: 1, radiusScale: 1.12, heightScale: 3, minHeight: 0.024 } as const;

const vec = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2]);
const levelsOf = (levels: DiscLevels): number[] => DISCS.map((disc) => levels[disc]);
/** worker-3's mask fill: the GLB's one painted mask can't light discs apart, so it dims whenever any disc is quiet. */
const fillOf = (levels: DiscLevels): number =>
  DISCS.every((disc) => levels[disc] >= LOOK.discLevels.lit) ? LOOK.discLevels.lit : LOOK.discLevels.quiet;

/** In a worker there is no document, so GLTFLoader's TextureLoader (picked on Safari and old Firefox) can't make an
 *  <img>. This plugin swaps in ImageBitmapLoader, which works everywhere OffscreenCanvas does. */
function imageBitmapTextures(parser: GLTFParser) {
  if (typeof document === "undefined") {
    const loader = new ImageBitmapLoader(parser.options.manager);
    loader.setOptions({ imageOrientation: "none" });
    (parser as unknown as { textureLoader: ImageBitmapLoader }).textureLoader = loader;
  }
  return { name: "ziiro_image_bitmap_textures" };
}

interface LoadedMesh {
  root: Object3D;
  /** Each mesh with the material it came with: his normal map and his painted disc mask. */
  parts: { mesh: Mesh; source: MeshStandardMaterial }[];
}

async function loadMesh(url: string): Promise<LoadedMesh> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(imageBitmapTextures);
  try {
    const gltf = await loader.loadAsync(url);
    const parts: LoadedMesh["parts"] = [];
    gltf.scene.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.isMesh) parts.push({ mesh, source: mesh.material as MeshStandardMaterial });
    });
    return { root: gltf.scene, parts };
  } catch {
    throw new Error(MESH_FAILED);
  }
}

/** A fatter, unseen stand-in for each disc, on its own layer: the raycast target for picking. */
function discProxy(gap: Gap): Mesh {
  const radius = gap.radius * PICK.radiusScale;
  const proxy = new Mesh(new CylinderGeometry(radius, radius, Math.max(gap.width * PICK.heightScale, PICK.minHeight), 24));
  proxy.position.copy(vec(gap.centre));
  proxy.quaternion.setFromUnitVectors(UP, vec(gap.normal).normalize());
  proxy.layers.set(PICK.layer);
  return proxy;
}

/** Points round each disc's rim at the body radius, in model space. */
const RIMS: Vector3[][] = GAPS.map((gap) => {
  const n = vec(gap.normal).normalize();
  const u = new Vector3().crossVectors(n, Math.abs(n.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1)).normalize();
  const v = new Vector3().crossVectors(n, u);
  return Array.from({ length: RIM_POINTS }, (_, i) => {
    const a = (2 * Math.PI * i) / RIM_POINTS;
    return vec(gap.centre).addScaledVector(u, Math.cos(a) * gap.radius).addScaledVector(v, Math.sin(a) * gap.radius);
  });
});

function discBox(k: number, inner: Object3D, camera: PerspectiveCamera, width: number, height: number): DiscBox {
  const points = RIMS[k].map((p) => p.clone().applyMatrix4(inner.matrixWorld).project(camera));
  const xs = points.map((p) => ((p.x + 1) / 2) * width);
  const ys = points.map((p) => ((1 - p.y) / 2) * height);
  const right = xs.indexOf(Math.max(...xs));
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const boxWidth = xs[right] - left;
  const boxHeight = Math.max(...ys) - top;
  const inFront = points.every((p) => p.z < 1);
  const onScreen = inFront && xs[right] > 0 && left < width && top < height && top + boxHeight > 0;
  return { disc: DISCS[k], left, top, width: boxWidth, height: boxHeight, anchor: { x: xs[right], y: ys[right] }, onScreen };
}

function createRenderer(canvas: SpineCanvas, onContextLost: () => void): WebGLRenderer {
  // No depth or MSAA on the canvas: the composer's scene target has them, and the canvas only takes full-screen quads.
  const context = canvas.getContext("webgl2", {
    alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "high-performance",
  });
  if (!context) throw new Error(NO_WEBGL2);
  (canvas as EventTarget).addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    onContextLost();
  });
  // MSAA comes from the composer's render target, so the canvas itself needs none.
  return new WebGLRenderer({ canvas, context: context as WebGL2RenderingContext, antialias: false });
}

function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m: Material) => m.dispose());
  });
}

/** Everything a theme sets: the world, the page behind, the lights, the bands and the metal. */
interface Dressing {
  environment: Texture;
  background: Mesh;
  /** The background's uniforms the body and the bands fade into (worker-3's end fade). */
  shared: Shared;
  lights: Object3D[];
  rings: Rings;
  bodies: MeshStandardMaterial[];
}

export async function createSpineScene(options: SceneOptions): Promise<SpineScene> {
  const { canvas, size } = options;
  /** Set when dispose gives the context back on purpose, so that loss isn't reported as a failure. */
  let released = false;
  const renderer = createRenderer(canvas, () => !released && options.onContextLost());
  const gpu = gpuNameOf(renderer.getContext());
  const loaded = await loadMesh(options.meshUrl);
  const scene = new Scene();
  const proxies = GAPS.map(discProxy);

  // The spine turns about its column: LOOK.model.axis through LOOK.model.pivot.
  const inner = new Group();
  inner.position.set(-LOOK.model.pivot[0], -LOOK.model.pivot[1], -LOOK.model.pivot[2]);
  inner.add(loaded.root, ...proxies);
  const pivot = new Group();
  pivot.position.set(LOOK.model.pivot[0], LOOK.model.pivot[1], LOOK.model.pivot[2]);
  pivot.add(inner);
  scene.add(pivot);

  const camera = new PerspectiveCamera();
  const raycaster = new Raycaster();
  raycaster.layers.set(PICK.layer);
  const axis = vec(LOOK.model.axis).normalize();
  let theme = options.theme;
  let levels = options.levels;
  let px = { width: options.width, height: options.height, ratio: Math.min(options.dpr, maxDprFor(size)) };
  let view: View | null = null;
  let composer: EffectComposer | null = null;

  const dress = (): Dressing => {
    const t = LOOK.themes[theme];
    renderer.toneMapping = TONE[t.toneMapping];
    renderer.toneMappingExposure = t.exposure;
    const { quad, shared } = makeBackground(t, px.width / Math.max(px.height, 1));
    const rings = makeRings(t, GAPS, shared);
    rings.setLevels(levelsOf(levels));
    inner.add(rings.group);
    const bodies = loaded.parts.map(({ mesh, source }) => {
      const body = makeBody(t, source, source.emissiveMap ?? null, fillOf(levels), shared);
      mesh.material = body;
      return body;
    });
    const dressing: Dressing = {
      environment: makeEnvironment(renderer, t),
      background: quad,
      shared,
      lights: makeLights(t),
      rings,
      bodies,
    };
    scene.environment = dressing.environment;
    scene.add(dressing.background, ...dressing.lights);
    return dressing;
  };

  const undress = (d: Dressing) => {
    inner.remove(d.rings.group);
    disposeTree(d.rings.group);
    scene.remove(d.background, ...d.lights);
    disposeTree(d.background);
    d.bodies.forEach((m) => m.dispose());
    d.environment.dispose();
  };

  let dressing = dress();

  const rebuildComposer = () => {
    if (composer) disposeComposer(composer);
    composer = makeComposer(renderer, scene, camera, LOOK.themes[theme], px.width * px.ratio, px.height * px.ratio, {
      samples: samplesFor(size),
      bloomScale: bloomScaleFor(size, px.ratio),
    });
  };

  const resize = (width: number, height: number, dpr: number) => {
    px = { width, height, ratio: Math.min(dpr, maxDprFor(size)) };
    renderer.setPixelRatio(px.ratio);
    renderer.setSize(width, height, false);
    dressing.shared.uniforms.bgAspect.value = width / Math.max(height, 1);
    rebuildComposer();
  };

  const pose = (next: View) => {
    applyCamera(camera, LOOK.camera[size], next.framing, size, px.width, px.height);
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    pivot.quaternion.setFromAxisAngle(right, next.pitch).multiply(new Quaternion().setFromAxisAngle(axis, next.yaw));
    scene.updateMatrixWorld();
    dressing.shared.update(inner, px.width * px.ratio, px.height * px.ratio);
  };

  const render = (next: View): DiscBox[] => {
    view = next;
    pose(next);
    if (px.width <= 0 || px.height <= 0 || !composer) return [];
    composer.render();
    return GAPS.map((_, k) => discBox(k, inner, camera, px.width, px.height));
  };

  const redraw = () => {
    if (view) render(view);
  };

  resize(options.width, options.height, options.dpr);
  // Shaders compile in parallel where the GPU allows (KHR_parallel_shader_compile), before the first frame.
  await renderer.compileAsync(scene, camera);

  return {
    gpu,
    render,
    pick: (x, y) => {
      if (px.width <= 0 || px.height <= 0) return null;
      raycaster.setFromCamera(new Vector2((x / px.width) * 2 - 1, 1 - (y / px.height) * 2), camera);
      const hit = raycaster.intersectObjects(proxies, false)[0];
      return hit ? DISCS[proxies.indexOf(hit.object as Mesh)] : null;
    },
    resize: (width, height, dpr) => {
      resize(width, height, dpr);
      redraw();
    },
    setTheme: (next) => {
      if (next === theme) return;
      theme = next;
      undress(dressing);
      dressing = dress();
      rebuildComposer();
      redraw();
    },
    setLevels: (next) => {
      levels = next;
      dressing.rings.setLevels(levelsOf(levels));
      const intensity = LOOK.themes[theme].maskFill.intensity * glow(fillOf(levels));
      dressing.bodies.forEach((body) => {
        if (body.emissiveMap) body.emissiveIntensity = intensity;
      });
      redraw();
    },
    dispose: () => {
      released = true;
      undress(dressing);
      if (composer) disposeComposer(composer);
      disposeTree(scene);
      renderer.dispose();
      // WEBGL_lose_context: the GPU memory goes back now, not when the worker is collected (W14-K).
      renderer.forceContextLoss();
    },
  };
}
