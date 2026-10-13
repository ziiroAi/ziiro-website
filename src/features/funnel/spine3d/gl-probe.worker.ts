// (C) W14-X: the software-renderer probe, off the main thread. The first WebGL context a page makes can take over a
// second to create on a software renderer (1,374 ms on SwiftShader at 4× CPU, then about 25 ms), and on the main thread
// a tap made meanwhile waits for it. Here it costs the page nothing. Answers once with { software } and closes.
import { gpuNameOf, isSoftwareRenderer, type NamedGl } from "./pace";

const scope = self as unknown as { postMessage(message: { software: boolean }): void; close(): void };

function probe(): boolean {
  const gl = new OffscreenCanvas(1, 1).getContext("webgl2") as (NamedGl & WebGL2RenderingContext) | null;
  // No context here: leave it to the viewer's own failure path, as the main-thread probe does.
  if (!gl) return false;
  const software = isSoftwareRenderer(gpuNameOf(gl));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return software;
}

try {
  scope.postMessage({ software: probe() });
} catch {
  scope.postMessage({ software: false });
}
scope.close();
