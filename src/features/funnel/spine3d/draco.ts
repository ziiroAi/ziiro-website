// (C) W23-B, W23-B2: the Draco decoder around one mesh parse. m5c's geometry is Draco; DRACOLoader decodes it in a
// worker of its own, with three r186's decoder from DRACO_PATH (immutable under /spine).
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { DRACO_PATH } from "./mesh-urls";

/** review-w23b L4: where WebAssembly is off (iOS Lockdown Mode, --jitless), DRACOLoader would ask for a JS decoder we
 *  don't ship, a 404 on every try. The still stays either way; this just fails at once. */
export const DRACO_NEEDS_WASM = "draco-needs-wasm";

/** DRACOLoader keeps the decoder's download here once preload() has asked for it. */
type Pending = { decoderPending: Promise<unknown> | null };

/**
 * Runs `parse` with a DRACOLoader set up for the spine, and always lets it go. preload() asks for the decoder at once,
 * alongside the mesh (the questions warmed both, except where §12 spares a slow connection: there the decoder
 * otherwise waited for the whole mesh, 0.9 s on Slow 4G). One worker: the default 4 would each compile the 192 kB
 * wasm. A decoder still arriving when the parse is over makes its worker's blob URL after the first dispose(), so it
 * is let go again once it has (review-w23b L1); a decoder that fails then is nobody's error (L2).
 */
export async function withDraco<T>(parse: (draco: DRACOLoader) => Promise<T>): Promise<T> {
  if (typeof WebAssembly !== "object") throw new Error(DRACO_NEEDS_WASM);
  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH).setDecoderConfig({ type: "wasm" }).setWorkerLimit(1).preload();
  const decoder = (draco as unknown as Pending).decoderPending;
  void decoder?.catch(() => undefined);
  try {
    return await parse(draco);
  } finally {
    draco.dispose();
    void decoder?.then(() => draco.dispose(), () => undefined);
  }
}
