// (C) W15-M6: the plan's mesh downloads while the visitor answers the questions, so the plan's 3D does not wait on it
// when it appears (worker-2's W15-R M6: a phone that tapped through S0 saw 1.84 s of still). Only where the plan's 3D
// would run: a real GPU, WebGL2, no Save-Data and no slow connection. Network only; the build, the decode and the GPU
// upload wait for the plan's own viewer (SpineViewer), which takes these bytes (mesh-warm.ts).
import { isSoftwareGl } from "./first-screen";
import { MESH_URLS } from "./mesh-urls";
import { warmMesh } from "./mesh-warm";
import { hasWebGL2, meshFor, preflight, readConnection, type Preflight } from "./rules";

export interface WarmEnv {
  readonly connection: Pick<Preflight, "saveData" | "effectiveType">;
  readonly webgl2: boolean;
  /** The window's width: which mesh the plan will ask for. */
  readonly width: number;
  /** True on a software renderer. */
  probe(signal: AbortSignal): Promise<boolean>;
}

function browserEnv(): WarmEnv {
  return {
    connection: readConnection(navigator),
    webgl2: hasWebGL2(window),
    width: window.innerWidth,
    probe: (signal) => isSoftwareGl(undefined, signal),
  };
}

/**
 * Starts downloading the plan's mesh once the probe says the GPU is real. Resolves true when it did (or this page had
 * already asked for that mesh), false when the plan's 3D would not run here or the visitor left (`signal`) first.
 */
export async function warmPlanMesh(signal: AbortSignal, env: WarmEnv = browserEnv()): Promise<boolean> {
  if (signal.aborted) return false;
  if (preflight({ ...env.connection, webgl2: env.webgl2 })) return false;
  const software = await env.probe(signal);
  // An abort answers the probe too, so the visitor leaving is checked after it.
  if (signal.aborted || software) return false;
  warmMesh(MESH_URLS[meshFor(env.width)]);
  return true;
}
