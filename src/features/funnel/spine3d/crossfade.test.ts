// (C) W18-B: the 3D's crossfade, on a stand-in renderer (no GL here).
import { RGBFormat, type FramebufferTexture, type Vector2, type WebGLRenderer } from "three";
import { describe, expect, it, vi } from "vitest";
import { THEME_FADE_MS } from "../flow/themeFade";
import { makeCrossfade } from "./crossfade";

function fakeRenderer() {
  const renderer = {
    autoClear: true,
    getDrawingBufferSize: (size: Vector2) => size.set(8, 4),
    setRenderTarget: vi.fn(),
    copyFramebufferToTexture: vi.fn((_texture: FramebufferTexture) => undefined),
    render: vi.fn(() => expect(renderer.autoClear).toBe(false)),
  };
  return renderer;
}

describe("the 3D's theme crossfade (W18-B)", () => {
  const fade = { start: 1000, ms: THEME_FADE_MS };

  it("copies the canvas at its size into an RGB texture: the canvas has no alpha, and an RGBA copy of it fails", () => {
    const renderer = fakeRenderer();
    const crossfade = makeCrossfade(renderer as unknown as WebGLRenderer);
    crossfade.capture(fade);
    const texture = renderer.copyFramebufferToTexture.mock.calls[0][0];
    expect(texture.format).toBe(RGBFormat);
    expect(texture.internalFormat).toBe("RGB8");  // sized, or texStorage2D refuses it and the copy is black
    expect(texture.image).toMatchObject({ width: 8, height: 4 });
    expect(renderer.setRenderTarget).toHaveBeenCalledWith(null);
    expect(crossfade.active()).toBe(true);
  });

  it("lays the copy over each frame until the fade has run, then lets it go", () => {
    const renderer = fakeRenderer();
    const crossfade = makeCrossfade(renderer as unknown as WebGLRenderer);
    crossfade.capture(fade);
    expect(crossfade.draw(1000 + THEME_FADE_MS / 2)).toBe(true);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(renderer.autoClear).toBe(true);
    expect(crossfade.draw(1000 + THEME_FADE_MS)).toBe(false);
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(crossfade.active()).toBe(false);
  });

  it("copies nothing for a zero-length fade, and a resize drops one under way", () => {
    const renderer = fakeRenderer();
    const crossfade = makeCrossfade(renderer as unknown as WebGLRenderer);
    crossfade.capture({ start: 1000, ms: 0 });
    expect(renderer.copyFramebufferToTexture).not.toHaveBeenCalled();
    crossfade.capture(fade);
    crossfade.cancel();
    expect(crossfade.draw(1100)).toBe(false);
    expect(renderer.render).not.toHaveBeenCalled();
  });
});
