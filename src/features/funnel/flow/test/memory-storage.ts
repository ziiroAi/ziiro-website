// (C) W15-A: a fresh in-memory localStorage per test. Node 25 ships its own localStorage global, which shadows
// jsdom's and has no methods unless node is given a --localstorage-file, so tests stub this one in.
import { vi } from "vitest";

export function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

/** Stubs window.localStorage with a fresh, empty one; vi.unstubAllGlobals takes it away. */
export function stubLocalStorage(): Storage {
  const storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
  return storage;
}
