// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { copy } from "@/features/funnel/data/light";
import BrandFilm, { SPINE_FILM_FILES } from "./BrandFilm";

let host: HTMLDivElement;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => host.remove());

function mount() {
  host = document.createElement("div");
  document.body.append(host);
  act(() => createRoot(host).render(<BrandFilm />));
}

describe("BrandFilm, the plan's film (§6.5)", () => {
  it("shows the poster and loads no video until a tap (§13.10)", () => {
    mount();
    expect(host.querySelector("video")).toBeNull();
    expect(host.querySelector("img")?.getAttribute("src")).toBe(SPINE_FILM_FILES.poster);
    expect(host.textContent).toContain(copy("r.film.title"));
  });

  it("plays with sound and controls after the tap, and offers the phone file to narrow screens", () => {
    mount();
    const play = host.querySelector("button")!;
    expect(play.getAttribute("aria-label")).toContain(copy("r.film.title"));
    act(() => play.click());
    const video = host.querySelector("video")!;
    expect(video.controls).toBe(true);
    expect(video.muted).toBe(false);
    expect([...video.querySelectorAll("source")].map((s) => [s.getAttribute("media"), s.getAttribute("src")])).toEqual([
      ["(max-width: 767px)", SPINE_FILM_FILES.narrowSrc],
      [null, SPINE_FILM_FILES.src],
    ]);
  });
});
