// (C) W23-B2 (review-w23b M2, L1, L2, L4): the Draco decoder's lifecycle around one mesh parse. DRACOLoader is mocked:
// these pin how it is set up and that it is always let go, not three's decoding.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DRACO_PATH } from "./mesh-urls";

interface FakeDraco {
  decoderPending: Promise<unknown> | null;
  setDecoderPath: ReturnType<typeof vi.fn>;
  setDecoderConfig: ReturnType<typeof vi.fn>;
  setWorkerLimit: ReturnType<typeof vi.fn>;
  preload: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

let decoder: { promise: Promise<unknown>; resolve(): void; reject(error: Error): void };
let fakes: FakeDraco[];

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn(function DRACOLoader(this: FakeDraco) {
    this.decoderPending = null;
    this.setDecoderPath = vi.fn(() => this);
    this.setDecoderConfig = vi.fn(() => this);
    this.setWorkerLimit = vi.fn(() => this);
    this.preload = vi.fn(() => {
      this.decoderPending = decoder.promise;
      return this;
    });
    this.dispose = vi.fn(() => this);
    fakes.push(this);
  }),
}));

const { DRACO_NEEDS_WASM, withDraco } = await import("./draco");

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  fakes = [];
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = () => res(undefined);
    reject = rej;
  });
  decoder = { promise, resolve, reject };
});
afterEach(() => vi.unstubAllGlobals());

describe("withDraco: the decoder around one parse (W23-B2)", () => {
  it("sets up one wasm worker from DRACO_PATH and asks for the decoder before the parse starts", async () => {
    decoder.resolve();
    await withDraco(async () => {
      const [draco] = fakes;
      expect(draco.setDecoderPath).toHaveBeenCalledWith(DRACO_PATH);
      expect(draco.setDecoderConfig).toHaveBeenCalledWith({ type: "wasm" });
      expect(draco.setWorkerLimit).toHaveBeenCalledWith(1);
      expect(draco.preload).toHaveBeenCalledTimes(1);
    });
    expect(fakes).toHaveLength(1);
  });

  it("hands the parse its loader and lets it go once the parse resolves", async () => {
    decoder.resolve();
    const result = await withDraco(async (draco) => {
      expect(draco).toBe(fakes[0]);
      expect(fakes[0].dispose).not.toHaveBeenCalled();
      return "parsed";
    });
    expect(result).toBe("parsed");
    expect(fakes[0].dispose).toHaveBeenCalled();
  });

  it("lets it go when the parse rejects, and passes the error on", async () => {
    decoder.resolve();
    await expect(withDraco(async () => Promise.reject(new Error("mesh fetch failed")))).rejects.toThrow("mesh fetch failed");
    expect(fakes[0].dispose).toHaveBeenCalled();
  });

  it("lets it go again once a decoder still arriving has made its worker's blob URL (L1)", async () => {
    await expect(withDraco(async () => Promise.reject(new Error("aborted")))).rejects.toThrow("aborted");
    const before = fakes[0].dispose.mock.calls.length;
    decoder.resolve();
    await flush();
    expect(fakes[0].dispose.mock.calls.length).toBe(before + 1);
  });

  it("leaves no unhandled rejection when the decoder fails after the try is over (L2)", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      await expect(withDraco(async () => Promise.reject(new Error("aborted")))).rejects.toThrow("aborted");
      decoder.reject(new Error("decoder 404"));
      await flush();
      await flush();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("fails at once, before any download or parse, where WebAssembly is off (L4)", async () => {
    vi.stubGlobal("WebAssembly", undefined);
    const use = vi.fn();
    await expect(withDraco(use)).rejects.toThrow(DRACO_NEEDS_WASM);
    expect(use).not.toHaveBeenCalled();
    expect(fakes).toHaveLength(0);
  });
});
