// @vitest-environment jsdom
// (C) W23-C: Lenis's loop runs only while a smooth scroll is under way, so an idle page asks for no frames.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lenis = vi.hoisted(() => ({
  instance: null as null | {
    isScrolling: false | "smooth" | "native";
    raf: ReturnType<typeof vi.fn>;
    emit: (event: string) => void;
  },
}));

vi.mock("lenis", () => ({
  default: class {
    isScrolling: false | "smooth" | "native" = false;
    // Lenis emits "scroll" from inside raf while it moves the page.
    raf = vi.fn(() => {
      if (this.isScrolling) this.emit("scroll");
    });
    destroy = vi.fn();
    listeners = new Map<string, (() => void)[]>();
    constructor() {
      lenis.instance = this as never;
    }
    // Lenis sets isScrolling to "smooth" as a scroll starts (Animate.fromTo calls onStart at once).
    scrollTo() {
      this.isScrolling = "smooth";
    }
    on(event: string, listener: () => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    }
    emit(event: string) {
      this.listeners.get(event)?.forEach((listener) => listener());
    }
  },
}));

import SmoothScroll from "./SmoothScroll";

let frames: FrameRequestCallback[] = [];
let root: Root | null = null;
const flush = (n = 1) => {
  for (let i = 0; i < n; i++) frames.splice(0).forEach((frame) => frame(i * 16));
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
  vi.stubGlobal("cancelAnimationFrame", () => (frames = []));
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  root = createRoot(document.createElement("div"));
  act(() => root!.render(<SmoothScroll />));
});

afterEach(() => {
  act(() => root?.unmount());
  vi.unstubAllGlobals();
});

describe("Lenis's loop (W23-C)", () => {
  it("asks for no frames once nothing scrolls", () => {
    flush(3);
    expect(frames).toHaveLength(0);
  });

  it("runs while a smooth scroll (a wheel, an anchor jump) is under way, and stops when it settles", () => {
    flush(3);
    act(() => window.__lenis!.scrollTo(400));
    expect(frames).toHaveLength(1);
    flush(10);
    expect(frames).toHaveLength(1);
    expect(lenis.instance!.raf).toHaveBeenCalled();
    lenis.instance!.isScrolling = false;
    flush(2);
    expect(frames).toHaveLength(0);
  });

  it("keeps one loop, never more, while Lenis reports scrolls from inside its own frame", () => {
    flush(3);
    act(() => window.__lenis!.scrollTo(400));
    for (let i = 0; i < 6; i++) {
      flush(1);
      expect(frames).toHaveLength(1);
    }
  });

  it("wakes on a scroll Lenis reports (a native scroll it follows)", () => {
    flush(3);
    lenis.instance!.emit("scroll");
    expect(frames).toHaveLength(1);
  });
});
