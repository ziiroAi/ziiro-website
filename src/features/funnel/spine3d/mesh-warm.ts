// (C) W15-M6: one download of each spine mesh per page. S0 asks for its mesh at its LCP (W15-D2), the funnel asks for
// the plan's while the visitor answers the questions (plan-warm.ts); whichever asks first downloads it, and the first
// 3D build that needs it takes the bytes. A later build fetches the mesh itself, from the HTTP cache: the bytes moved to
// the first build's worker.
import { prefetchMesh, type MeshPrefetch } from "./first-screen";

interface Warm {
  readonly prefetch: MeshPrefetch;
  readonly taken: boolean;
}

const warm = new Map<string, Warm>();

/** Starts downloading the mesh at `url`, unless this page already asked for it. Network only. Resolves when the
 *  download is over, whether or not it worked; it never rejects. */
export function warmMesh(url: string): Promise<void> {
  const entry = warm.get(url) ?? { prefetch: prefetchMesh(url), taken: false };
  if (!warm.has(url)) warm.set(url, entry);
  return entry.prefetch.bytes.then(() => undefined);
}

/** The warmed bytes of the mesh at `url` for the build asking, or undefined when none were warmed or another build
 *  took them. Null inside: the download failed, so the 3D fetches the mesh itself. */
export function takeWarmMesh(url: string): Promise<ArrayBuffer | null> | undefined {
  const entry = warm.get(url);
  if (!entry || entry.taken) return undefined;
  warm.set(url, { ...entry, taken: true });
  return entry.prefetch.bytes;
}

/** Tests: a fresh page. */
export function forgetWarmMeshes(): void {
  warm.clear();
}
