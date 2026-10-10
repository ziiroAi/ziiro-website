// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type TurnstileModule = typeof import("./turnstile");
type TurnstileWindow = Window & { turnstile?: unknown };
let mod: TurnstileModule;

beforeEach(async () => {
  vi.resetModules();   // the loader keeps one promise per page; each test gets a fresh page
  mod = await import("./turnstile");
  document.head.innerHTML = "";
});
afterEach(() => {
  vi.useRealTimers();
  delete (window as TurnstileWindow).turnstile;
});

describe("loadTurnstile (§13.4)", () => {
  it("fetches nothing without a site key", async () => {
    await expect(mod.loadTurnstile(undefined)).resolves.toBeNull();
    expect(document.querySelector("script")).toBeNull();
  });

  it("adds the script once, however many forms ask, and resolves with the API when it loads", async () => {
    const first = mod.loadTurnstile("key");
    const second = mod.loadTurnstile("key");
    const scripts = document.querySelectorAll(`script[src="${mod.TURNSTILE_SRC}"]`);
    expect(scripts).toHaveLength(1);
    const api = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };
    (window as TurnstileWindow).turnstile = api;
    scripts[0].dispatchEvent(new Event("load"));
    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
  });

  it("can try again after the script fails to load", async () => {
    const failed = mod.loadTurnstile("key");
    document.querySelector("script")?.dispatchEvent(new Event("error"));
    await expect(failed).rejects.toThrow("Turnstile did not load");
    void mod.loadTurnstile("key").catch(() => undefined);
    expect(document.querySelectorAll("script")).toHaveLength(1);
  });
});

describe("the token box (Review Focus 4)", () => {
  it("hands over a token it already has at once", async () => {
    const box = mod.createTokenBox();
    box.set("t1");
    await expect(box.wait(3_000)).resolves.toBe("t1");
  });

  it("waits for a token that comes in time", async () => {
    vi.useFakeTimers();
    const box = mod.createTokenBox();
    const got = box.wait(3_000);
    vi.advanceTimersByTime(1_000);
    box.set("t2");
    await expect(got).resolves.toBe("t2");
  });

  it("gives up with an empty token when none comes", async () => {
    vi.useFakeTimers();
    const box = mod.createTokenBox();
    const got = box.wait(3_000);
    vi.advanceTimersByTime(3_000);
    await expect(got).resolves.toBe("");
  });

  it("waits for a fresh token once the used one is cleared", async () => {
    vi.useFakeTimers();
    const box = mod.createTokenBox();
    box.set("used");
    box.set("");
    const got = box.wait(3_000);
    box.set("fresh");
    await expect(got).resolves.toBe("fresh");
  });
});
