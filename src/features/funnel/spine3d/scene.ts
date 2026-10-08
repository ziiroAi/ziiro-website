// (C) W14-C §1: the live spine. three.js on a canvas the caller hands over: an OffscreenCanvas in spine.worker.ts,
// or the page's own canvas where OffscreenCanvas can't run WebGL. It never touches the DOM, so the same code runs in
// both. The mesh is the owner's Tripo spine crunched by W14-A; one orange ring per disc gap carries the glow, so a
// plan's discs can light on their own (§6.7, D28) instead of the mesh's single baked mask.
import {
  ACESFilmicToneMapping, CylinderGeometry, Color, DirectionalLight, Group, HemisphereLight, ImageBitmapLoader, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, Quaternion, Raycaster, Scene,
  SRGBColorSpace, TorusGeometry, Vector2, Vector3, WebGLRenderer, type Material, type Object3D, type Texture,
} from "three";
import { GLTFLoader, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DISCS, type DiscId, type Theme } from "../data/contract";
import type { Framing, View } from "./camera";
import { GAPS, type Gap } from "./gaps";
import type { DiscLevels } from "./levels";
import type { SpineLook, ThemeLook } from "./look";
import type { MeshSize } from "./rules";

export type SpineCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface SceneOptions {
  canvas: SpineCanvas;
  width: number;
  height: number;
  dpr: number;
  theme: Theme;
  size: MeshSize;
  /** Absolute path of the crunched mesh, or null for the placeholder built from the gaps. */
  meshUrl: string | null;
  levels: DiscLevels;
  look: SpineLook;
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

const MAX_DPR = 2;
const UP = new Vector3(0, 1, 0);
const TORUS_AXIS = new Vector3(0, 0, 1);
const RING_SEGMENTS = { radial: 12, tubular: 96 } as const;
const BODY_SEGMENTS = 48;
const RIM_POINTS = 16;
/** The pick stand-ins: wider and taller than the ring, so a finger finds a disc in close-up. Layer 1 never renders. */
const PICK = { layer: 1, radiusScale: 1.12, heightScale: 3, minHeight: 0.024 } as const;

const vec = (v: readonly [number, number, number]): Vector3 => new Vector3(v[0], v[1], v[2]);

/** The column's axis through the gaps' centres, which the spine turns about. */
function columnCentre(): Vector3 {
  const sum = GAPS.reduce((acc, gap) => acc.add(vec(gap.centre)), new Vector3());
  return sum.divideScalar(GAPS.length);
}

function bodyMaterial(look: ThemeLook, normalMap: Texture | null): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(look.body.color),
    metalness: look.body.metalness,
    roughness: look.body.roughness,
    envMapIntensity: look.body.envIntensity,
    normalMap,
  });
}

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

async function loadMesh(url: string): Promise<{ root: Object3D; normalMap: Texture | null }> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(imageBitmapTextures);
  try {
    const gltf = await loader.loadAsync(url);
    let normalMap: Texture | null = null;
    gltf.scene.traverse((node) => {
      const material = (node as Mesh).material as MeshStandardMaterial | undefined;
      if (material?.normalMap) normalMap = material.normalMap;
    });
    return { root: gltf.scene, normalMap };
  } catch {
    throw new Error(MESH_FAILED);
  }
}

/** Until W14-A's mesh is in: one body between each pair of gaps, and a half body past each end. */
function placeholderSpine(): Group {
  const group = new Group();
  const centres = GAPS.map((gap) => vec(gap.centre));
  const last = centres.length - 1;
  const ends = [
    centres[0].clone().multiplyScalar(2).sub(centres[1]),
    ...centres,
    centres[last].clone().multiplyScalar(2).sub(centres[last - 1]),
  ];
  for (let i = 0; i < ends.length - 1; i++) {
    const gap = GAPS[Math.min(i, last)];
    const from = ends[i];
    const to = ends[i + 1];
    const body = new Mesh(new CylinderGeometry(gap.radius, gap.radius, from.distanceTo(to) - gap.width, BODY_SEGMENTS));
    body.position.copy(from).add(to).multiplyScalar(0.5);
    body.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize());
    group.add(body);
  }
  return group;
}

function ring(gap: Gap, look: SpineLook): Mesh<TorusGeometry, MeshBasicMaterial> {
  const tube = Math.max(gap.width * look.ring.tubeScale, look.ring.minTube);
  const geometry = new TorusGeometry(gap.radius * look.ring.radiusScale, tube, RING_SEGMENTS.radial, RING_SEGMENTS.tubular);
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ toneMapped: false }));
  mesh.position.copy(vec(gap.centre));
  mesh.quaternion.copy(new Quaternion().setFromUnitVectors(TORUS_AXIS, vec(gap.normal)));
  return mesh;
}

function frame(camera: PerspectiveCamera, framing: Framing, width: number, height: number): void {
  camera.fov = framing.fovDeg;
  camera.aspect = width / height;
  const distance = framing.visibleHeight / 2 / Math.tan((framing.fovDeg * Math.PI) / 360);
  camera.position.set(0, framing.centreY, distance);
  camera.lookAt(0, framing.centreY, 0);
  // Slide the picture so the column sits at columnX across the box, as it does in the still.
  camera.setViewOffset(width, height, (0.5 - framing.columnX) * width, 0, width, height);
  camera.updateProjectionMatrix();
}

/** A fatter, unseen stand-in for each disc, on its own layer: the raycast target for picking. */
function discProxy(gap: Gap): Mesh {
  const height = Math.max(gap.width * PICK.heightScale, PICK.minHeight);
  const proxy = new Mesh(new CylinderGeometry(gap.radius * PICK.radiusScale, gap.radius * PICK.radiusScale, height, 24));
  proxy.position.copy(vec(gap.centre));
  proxy.quaternion.setFromUnitVectors(UP, vec(gap.normal));
  proxy.layers.set(PICK.layer);
  return proxy;
}

/** Points around each disc's rim, in the disc's own space (the torus lies in its XY plane). */
const RIM = Array.from({ length: RIM_POINTS }, (_, i) => {
  const a = (2 * Math.PI * i) / RIM_POINTS;
  return new Vector3(Math.cos(a), Math.sin(a), 0);
});

function discBox(disc: DiscId, ring: Mesh<TorusGeometry>, camera: PerspectiveCamera, width: number, height: number): DiscBox {
  const radius = ring.geometry.parameters.radius;
  const points = RIM.map((p) => p.clone().multiplyScalar(radius).applyMatrix4(ring.matrixWorld).project(camera));
  const xs = points.map((p) => ((p.x + 1) / 2) * width);
  const ys = points.map((p) => ((1 - p.y) / 2) * height);
  const right = xs.indexOf(Math.max(...xs));
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const boxWidth = xs[right] - left;
  const boxHeight = Math.max(...ys) - top;
  const inFront = points.every((p) => p.z < 1);
  const onScreen = inFront && xs[right] > 0 && left < width && top < height && top + boxHeight > 0;
  return { disc, left, top, width: boxWidth, height: boxHeight, anchor: { x: xs[right], y: ys[right] }, onScreen };
}

function createRenderer(canvas: SpineCanvas, onContextLost: () => void): WebGLRenderer {
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
  if (!context) throw new Error(NO_WEBGL2);
  (canvas as EventTarget).addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    onContextLost();
  });
  const renderer = new WebGLRenderer({ canvas, context: context as WebGL2RenderingContext, alpha: true, antialias: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

function disposeAll(scene: Scene, renderer: WebGLRenderer): void {
  scene.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m: Material) => m.dispose());
  });
  scene.environment?.dispose();
  renderer.dispose();
}

export async function createSpineScene(options: SceneOptions): Promise<SpineScene> {
  const { canvas, look } = options;
  const renderer = createRenderer(canvas, options.onContextLost);
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const loaded = options.meshUrl ? await loadMesh(options.meshUrl) : { root: placeholderSpine(), normalMap: null };
  const rings = GAPS.map((gap) => ring(gap, look));
  const proxies = GAPS.map(discProxy);

  // The spine turns about its own column: the model is moved so the column runs through the pivot's origin.
  const centre = columnCentre();
  const model = new Group();
  model.add(loaded.root, ...rings, ...proxies);
  model.position.set(-centre.x, 0, -centre.z);
  const pivot = new Group();
  pivot.add(model);
  const hemi = new HemisphereLight();
  const key = new DirectionalLight();
  scene.add(pivot, hemi, key);

  const camera = new PerspectiveCamera();
  const raycaster = new Raycaster();
  raycaster.layers.set(PICK.layer);
  let theme = options.theme;
  let levels = options.levels;
  let body = bodyMaterial(look.themes[theme], loaded.normalMap);
  let size = { width: options.width, height: options.height };
  let view: View = { yaw: 0, pitch: 0, framing: look.framing[options.size] };

  const paint = () => {
    const t = look.themes[theme];
    loaded.root.traverse((node) => {
      if ((node as Mesh).isMesh) (node as Mesh).material = body;
    });
    rings.forEach((r, i) => r.material.color.set(t.ring.color).multiplyScalar(t.ring.strength * levels[DISCS[i]]));
    hemi.color.set(t.hemi.sky);
    hemi.groundColor.set(t.hemi.ground);
    hemi.intensity = t.hemi.intensity;
    key.color.set(t.key.color);
    key.intensity = t.key.intensity;
    key.position.set(...t.key.position);
    renderer.toneMappingExposure = t.exposure;
  };

  const render = (next: View): DiscBox[] => {
    view = next;
    pivot.rotation.set(view.pitch, look.restYaw + view.yaw, 0, "YXZ");
    frame(camera, view.framing, size.width, size.height);
    if (size.width <= 0 || size.height <= 0) return [];
    renderer.render(scene, camera);
    return rings.map((r, i) => discBox(DISCS[i], r, camera, size.width, size.height));
  };

  const resize = (width: number, height: number, dpr: number) => {
    size = { width, height };
    renderer.setPixelRatio(Math.min(dpr, MAX_DPR));
    renderer.setSize(width, height, false);
  };

  paint();
  resize(options.width, options.height, options.dpr);
  frame(camera, view.framing, size.width, size.height);
  // Shaders compile in parallel where the GPU allows (KHR_parallel_shader_compile), before the first frame.
  await renderer.compileAsync(scene, camera);

  return {
    render,
    pick: (x, y) => {
      if (size.width <= 0 || size.height <= 0) return null;
      raycaster.setFromCamera(new Vector2((x / size.width) * 2 - 1, 1 - (y / size.height) * 2), camera);
      const hit = raycaster.intersectObjects(proxies, false)[0];
      return hit ? DISCS[proxies.indexOf(hit.object as Mesh)] : null;
    },
    resize: (width, height, dpr) => {
      resize(width, height, dpr);
      render(view);
    },
    setTheme: (next) => {
      theme = next;
      const old = body;
      body = bodyMaterial(look.themes[theme], loaded.normalMap);
      paint();
      old.dispose();
      render(view);
    },
    setLevels: (next) => {
      levels = next;
      paint();
      render(view);
    },
    dispose: () => disposeAll(scene, renderer),
  };
}
