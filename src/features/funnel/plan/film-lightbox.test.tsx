// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copy } from "../data";
import { FilmLightbox, filmPctFor } from "./FilmLightbox";
import { click, render, textOf, type Rendered } from "./test-utils";

vi.mock("../../home/sections/BrandFilm", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("video", { "data-testid": "film" }) };
});

let screen: Rendered | null = null;
afterEach(() => {
  screen?.unmount();
  screen = null;
});

/** Media events don't bubble. The lightbox hears them in the capture phase, as it would a real <video>'s. */
function fire(type: string, at?: { currentTime: number; duration: number }): void {
  const video = screen?.container.querySelector("video");
  if (!video) throw new Error("no video");
  if (at) {
    Object.defineProperty(video, "currentTime", { value: at.currentTime, configurable: true });
    Object.defineProperty(video, "duration", { value: at.duration, configurable: true });
  }
  act(() => {
    video.dispatchEvent(new Event(type));
  });
}

const noop = () => undefined;

describe("filmPctFor", () => {
  it("is the last quarter of the film reached", () => {
    expect([filmPctFor(0, Number.NaN), filmPctFor(10, 56.73), filmPctFor(14.2, 56.73), filmPctFor(42.6, 56.73), filmPctFor(56.73, 56.73)])
      .toEqual([0, 0, 25, 75, 100]);
  });
});

describe("FilmLightbox (§6.5)", () => {
  it("renders nothing while it's closed", () => {
    screen = render(<FilmLightbox open={false} onClose={noop} onProgress={noop} />);
    expect(screen.container.innerHTML).toBe("");
  });

  it("opens as a modal dialog named r.film.title without printing it, with the film, the caption and the close button focused", () => {
    screen = render(<FilmLightbox open onClose={noop} onProgress={noop} />);
    const dialog = screen.container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBe(copy("r.film.title"));
    expect(textOf(dialog)).not.toContain(copy("r.film.title"));
    expect(textOf(dialog)).toContain(copy("r.film.cap"));
    expect(textOf(document.activeElement)).toBe(copy("r.film.close"));
    expect(dialog?.querySelector("video")).not.toBeNull();
  });

  it("closes on Escape and on its button", () => {
    const onClose = vi.fn();
    screen = render(<FilmLightbox open onClose={onClose} onProgress={noop} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    click(screen.container.querySelector("button"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("reports film_played once, and each new quarter once (§9)", () => {
    const onProgress = vi.fn();
    screen = render(<FilmLightbox open onClose={noop} onProgress={onProgress} />);
    fire("play");
    fire("play");
    fire("timeupdate", { currentTime: 17, duration: 56.73 });
    fire("timeupdate", { currentTime: 30, duration: 56.73 });
    fire("timeupdate", { currentTime: 15, duration: 56.73 });
    fire("ended");
    expect(onProgress.mock.calls.map(([fields]) => fields)).toEqual([
      { filmPlayed: true }, { filmPct: 25 }, { filmPct: 50 }, { filmPct: 100 },
    ]);
  });

  it("gives focus back to what had it when it closes", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    screen = render(<FilmLightbox open onClose={noop} onProgress={noop} />);
    screen.rerender(<FilmLightbox open={false} onClose={noop} onProgress={noop} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
