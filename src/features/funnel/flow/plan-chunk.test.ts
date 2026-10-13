import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMPORT_RETRY_MS, retryOnce } from "./plan-chunk";

describe("the plan chunk's import (review H2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tries a failed import once more after a short wait", async () => {
    const load = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module")).mockResolvedValueOnce("module");
    const loaded = retryOnce(load);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(IMPORT_RETRY_MS);
    await expect(loaded).resolves.toBe("module");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second failure", async () => {
    const lost = new TypeError("Failed to fetch dynamically imported module");
    const load = vi.fn().mockRejectedValue(lost);
    const loaded = retryOnce(load);
    const settled = expect(loaded).rejects.toBe(lost);
    await vi.advanceTimersByTimeAsync(IMPORT_RETRY_MS);
    await settled;
    expect(load).toHaveBeenCalledTimes(2);
  });
});
