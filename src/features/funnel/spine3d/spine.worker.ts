// (C) W14-C §1: the spine in a worker, on the OffscreenCanvas the viewer handed over. The renderer, the mesh fetch
// and parse, the meshopt decode and the shader compile all run here, so a tap on the page while the 3D loads never
// waits on them (the INP gate).
import type { View } from "./camera";
import { LOOK } from "./look";
import type { FromWorker, ToWorker } from "./protocol";
import { createSpineScene, type SpineScene } from "./scene";

const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};

let spine: SpineScene | null = null;
let disposed = false;
/** What arrived while the scene was still being built, applied once it is. */
let latest: { view: View | null; size: [number, number, number] | null } = { view: null, size: null };

async function init(message: Extract<ToWorker, { type: "init" }>): Promise<void> {
  try {
    const built = await createSpineScene({
      ...message,
      look: LOOK,
      onContextLost: () => scope.postMessage({ type: "fail", reason: "context-lost" }),
    });
    if (disposed) return built.dispose();
    spine = built;
    if (latest.size) spine.resize(...latest.size);
    scope.postMessage({ type: "ready", boxes: spine.render(latest.view ?? message.view) });
  } catch (error) {
    scope.postMessage({ type: "fail", reason: error instanceof Error ? error.message : "error" });
  }
}

scope.onmessage = ({ data }) => {
  switch (data.type) {
    case "init":
      void init(data);
      return;
    case "view":
      latest = { ...latest, view: data.view };
      if (spine) scope.postMessage({ type: "boxes", boxes: spine.render(data.view) });
      return;
    case "pick":
      scope.postMessage({ type: "picked", id: data.id, disc: spine?.pick(data.x, data.y) ?? null });
      return;
    case "resize":
      latest = { ...latest, size: [data.width, data.height, data.dpr] };
      spine?.resize(data.width, data.height, data.dpr);
      return;
    case "theme":
      spine?.setTheme(data.theme);
      return;
    case "levels":
      spine?.setLevels(data.levels);
      return;
    case "dispose":
      disposed = true;
      spine?.dispose();
      spine = null;
  }
};
