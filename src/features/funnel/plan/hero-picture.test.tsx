// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copy } from "../data";
import { HeroPicture, HeroPicturePrefetch } from "./HeroPicture";
import { render, type Rendered } from "./test-utils";

let screen: Rendered | null = null;
beforeEach(() => {
  document.documentElement.dataset.theme = "light";
});
afterEach(() => {
  screen?.unmount();
  screen = null;
  delete document.documentElement.dataset.theme;
});

const sources = () =>
  Array.from(screen?.container.querySelectorAll("source") ?? []).map((s) => ({
    type: s.getAttribute("type"),
    media: s.getAttribute("media"),
    sizes: s.getAttribute("sizes"),
    width: s.getAttribute("width"),
    height: s.getAttribute("height"),
    srcset: s.getAttribute("srcset"),
  }));

const set = (name: string, widths: number[], ext: string) =>
  widths.map((w) => `/spine/r19/light/hero/${name}-${w}.${ext} ${w}w`).join(", ");
const phone = (ext: string) => set("phone", [585], ext);
const tablet = (ext: string) => set("tablet", [1024, 1536], ext);
const wide = (ext: string) => set("hero", [1280, 1920, 2880], ext);

describe("HeroPicture (§6.6)", () => {
  it("offers AVIF before WebP, one r18 still per stage shape: phone band, 600-1023 px band, landscape stage (W18-C)", () => {
    screen = render(<HeroPicture />);
    const band = { media: "(max-width: 599px)", sizes: "100vw", width: "585", height: "615" };
    const mid = { media: "(min-width: 600px) and (max-width: 1023px)", sizes: "100vw", width: "1536", height: "1614" };
    const still = { media: "(min-width: 1024px)", sizes: "100vw", width: "2880", height: "1632" };
    expect(sources()).toEqual([
      { type: "image/avif", ...band, srcset: phone("avif") },
      { type: "image/avif", ...mid, srcset: tablet("avif") },
      { type: "image/avif", ...still, srcset: wide("avif") },
      { type: "image/webp", ...band, srcset: phone("webp") },
      { type: "image/webp", ...mid, srcset: tablet("webp") },
      { type: "image/webp", ...still, srcset: wide("webp") },
    ]);
  });

  it("gives the <img> its size, async decoding and the theme's alt text, at normal priority", () => {
    screen = render(<HeroPicture />);
    const img = screen.container.querySelector("img");
    expect([img?.getAttribute("src"), img?.getAttribute("width"), img?.getAttribute("height"), img?.getAttribute("decoding"), img?.alt]).toEqual([
      "/spine/r19/light/hero/hero-1920.webp", "2880", "1632", "async", copy("hx.alt.light"),
    ]);
    expect(img?.hasAttribute("fetchpriority")).toBe(false);
    expect(img?.hasAttribute("loading")).toBe(false);
  });

  it("follows a theme switch while it's on screen (Review Focus 5)", async () => {
    screen = render(<HeroPicture />);
    await act(async () => {
      document.documentElement.dataset.theme = "dark";
    });
    expect(screen.container.querySelector("img")?.alt).toBe(copy("hx.alt.dark"));
    expect(sources().every((s) => s.srcset?.includes("/spine/r19/dark/hero/"))).toBe(true);
  });

  it("can be mounted early, out of sight and out of the accessibility tree", () => {
    screen = render(<HeroPicturePrefetch />);
    const box = screen.container.firstElementChild;
    expect(box?.getAttribute("aria-hidden")).toBe("true");
    expect(box?.querySelector("picture img")).not.toBeNull();
  });

  it("takes only the light entry from the data module, so the S5 mount brings no plan data (00-index §1.5)", () => {
    const source = readFileSync(resolve(process.cwd(), "src/features/funnel/plan/HeroPicture.tsx"), "utf8");
    const runtime = [...source.matchAll(/^import(?!\s+type\b)[^'"]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
    expect(runtime.filter((spec) => spec.startsWith("../data"))).toEqual(["../data/light"]);
  });
});
