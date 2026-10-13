// (C) W15-M6: the plan's mesh downloads while the visitor answers the questions, so the plan's 3D does not wait on it
// when it appears (worker-2's W15-R M6: a phone that tapped through S0 saw 1.84 s of still). Only where the plan's 3D
// would run: a real GPU, WebGL2, no Save-Data and no slow connection. Network only; the build, the decode and the GPU
// upload wait for the plan's own viewer (SpineViewer), which takes these bytes (mesh-warm.ts).
import { sharedSoftwareGl } from "./first-screen";
import { DRACO_FILES, PLAN_MESHES } from "./mesh-urls";
import { warmMesh } from "./mesh-warm";
import { hasWebGL2, meshFor, preflight, readConnection, type Connection, type MeshSize } from "./rules";
// The built address of the worker host.ts starts (`new Worker(new URL("./spine.worker.ts", …))`); the same file.
import spineWorkerScript from "./spine.worker.ts?worker&url";

/** The 3D worker's script (about 180 kB): fetched at the plan otherwise, 0.35 s on Fast 4G (worker-2's W15-M6 runs). */
export const SPINE_WORKER_SCRIPT: string = spineWorkerScript;

/** What the plan's 3D starts with before its mesh: the worker, then the Draco decoder (W23-B: m5c is Draco), which
 *  DRACOLoader otherwise asks for only once the mesh has arrived, 0.9 s more on Slow 4G. */
export const PLAN_SCRIPTS: readonly string[] = [SPINE_WORKER_SCRIPT, ...DRACO_FILES];

/** Files other than meshes this page already warmed: each is asked for once. */
const warmFiles = new Map<string, Promise<void>>();

/** Downloads `url` into the HTTP cache, once per page; nothing is kept here. Never rejects. */
function warmFile(url: string): Promise<void> {
  const known = warmFiles.get(url);
  if (known) return known;
  const done = fetch(url)
    .then((response) => response.arrayBuffer())
    .then(
      () => undefined,
      () => undefined,
    );
  warmFiles.set(url, done);
  return done;
}

/** §12: the prefetch during the questions stays off under Save-Data or on a 2G/3G reading, so it never takes the
 *  questions' own bandwidth or data. W22-LOAD: the plan's viewer still loads the 3D there, from the plan. */
const SLOW_CONNECTIONS = ["slow-2g", "2g", "3g"];
const sparesData = ({ saveData, effectiveType }: Connection): boolean =>
  saveData || (effectiveType !== undefined && SLOW_CONNECTIONS.includes(effectiveType));

/** Tests: a fresh page. */
export function forgetWarmFiles(): void {
  warmFiles.clear();
}

export interface WarmEnv {
  readonly connection: Connection;
  readonly webgl2: boolean;
  /** The window's width: which size of each mesh the plan will ask for. */
  readonly width: number;
  /** The plan's meshes, in the order it needs them (PLAN_MESHES). */
  readonly meshes: readonly Readonly<Record<MeshSize, string>>[];
  /** Scripts the plan's 3D starts with, warmed before the meshes (SPINE_WORKER_SCRIPT). */
  readonly scripts: readonly string[];
  /** True on a software renderer. */
  probe(signal: AbortSignal): Promise<boolean>;
}

function browserEnv(): WarmEnv {
  return {
    connection: readConnection(navigator),
    webgl2: hasWebGL2(window),
    width: window.innerWidth,
    meshes: PLAN_MESHES,
    scripts: PLAN_SCRIPTS,
    probe: (signal) => sharedSoftwareGl(signal),
  };
}

/**
 * Downloads the plan's meshes once the probe says the GPU is real, one after another so the first one the plan needs
 * (the full spine, for its hero) arrives first. Resolves true when it started (or this page had already asked for
 * them), false when the plan's 3D would not run here or the visitor left (`signal`) first. A mesh not yet started
 * when the visitor leaves is never asked for.
 */
export async function warmPlanMesh(signal: AbortSignal, env: WarmEnv = browserEnv()): Promise<boolean> {
  if (signal.aborted) return false;
  if (preflight({ webgl2: env.webgl2 }) || sparesData(env.connection)) return false;
  const software = await env.probe(signal);
  // An abort answers the probe too, so the visitor leaving is checked after it.
  if (signal.aborted || software) return false;
  for (const script of env.scripts) {
    if (signal.aborted) break;
    await warmFile(script);
  }
  const size = meshFor(env.width);
  for (const mesh of env.meshes) {
    if (signal.aborted) break;
    await warmMesh(mesh[size]);
  }
  return true;
}
