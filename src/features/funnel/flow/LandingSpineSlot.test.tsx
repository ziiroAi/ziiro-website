// @vitest-environment jsdom
// (C) W14-U L3: Back within S0's fade must not reuse a viewer that gave its 3D up on the tap that left.
import { act, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, type Rendered } from "../plan/test-utils";
import { markS0Entry, optionPressed } from "../spine3d/option-press";
import { LandingSpineSlot } from "./LandingSpineSlot";

const mounts = vi.fn();
vi.mock("./LandingSpine", () => ({
  LandingSpine: ({ visible }: { visible: boolean }) => {
    useEffect(() => mounts(), []);
    return <div data-testid="landing-spine" data-visible={visible ? "" : undefined} />;
  },
}));

let screen: Rendered | null = null;

afterEach(() => {
  screen?.unmount();
  screen = null;
  mounts.mockClear();
  markS0Entry();
  document.body.querySelectorAll(".f-s1").forEach((el) => el.remove());
});

describe("LandingSpineSlot", () => {
  it("mounts a fresh layer on each entry to S0, even when Back comes within the fade", async () => {
    await act(async () => {
      screen = render(<LandingSpineSlot on />);
    });
    await vi.waitFor(() => expect(mounts).toHaveBeenCalledTimes(1));
    await act(async () => screen!.rerender(<LandingSpineSlot on={false} />));
    await act(async () => screen!.rerender(<LandingSpineSlot on />));
    await vi.waitFor(() => expect(mounts).toHaveBeenCalledTimes(2));
    expect(screen!.container.querySelectorAll("[data-testid=landing-spine]")).toHaveLength(1);
  });

  it("keeps the same layer while S0 stays on", async () => {
    await act(async () => {
      screen = render(<LandingSpineSlot on />);
    });
    await vi.waitFor(() => expect(mounts).toHaveBeenCalledTimes(1));
    await act(async () => screen!.rerender(<LandingSpineSlot on />));
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it("forgets the press that left S0 when the visitor comes back, so the new layer may start its 3D (W14-X)", async () => {
    await act(async () => {
      screen = render(<LandingSpineSlot on />);
    });
    const s1 = document.createElement("div");
    s1.className = "f-s1";
    s1.innerHTML = '<div class="f-options"><button>I run a business</button></div>';
    document.body.append(s1);
    s1.querySelector("button")!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(optionPressed()).toBe(true);
    await act(async () => screen!.rerender(<LandingSpineSlot on={false} />));
    expect(optionPressed()).toBe(true);
    await act(async () => screen!.rerender(<LandingSpineSlot on />));
    expect(optionPressed()).toBe(false);
  });
});
