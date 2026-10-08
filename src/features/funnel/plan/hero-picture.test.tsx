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

const phone = (ext: string) => `/spine/r17/light/hero/phone-828.${ext} 828w, /spine/r17/light/hero/phone-1170.${ext} 1170w`;
const wide = (ext: string) =>
  [1280, 1920, 2560].map((w) => `/spine/r17/light/hero/hero-${w}.${ext} ${w}w`).join(", ");

describe("HeroPicture (§6.6)", () => {
  it("offers AVIF before WebP: the phone band under 600 px, the landscape still from 600 px", () => {
    screen = render(<HeroPicture />);
    const band = { media: "(max-width: 599px)", sizes: "100vw", width: "1170", height: "1230" };
    const still = { media: "(min-width: 600px)", sizes: "100vw", width: "2560", height: "1440" };
    expect(sources()).toEqual([
      { type: "image/avif", ...band, srcset: phone("avif") },
      { type: "image/avif", ...still, srcset: wide("avif") },
      { type: "image/webp", ...band, srcset: phone("webp") },
      { type: "image/webp", ...still, srcset: wide("webp") },
    ]);
  });

  it("gives the <img> its size, async decoding and the theme's alt text, at normal priority", () => {
    screen = render(<HeroPicture />);
    const img = screen.container.querySelector("img");
    expect([img?.getAttribute("src"), img?.getAttribute("width"), img?.getAttribute("height"), img?.getAttribute("decoding"), img?.alt]).toEqual([
      "/spine/r17/light/hero/hero-1920.webp", "2560", "1440", "async", copy("hx.alt.light"),
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
    expect(sources().every((s) => s.srcset?.includes("/spine/r17/dark/hero/"))).toBe(true);
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
