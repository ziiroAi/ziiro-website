// @vitest-environment jsdom
// (C) W14-X: S0's "leaving" press is recorded from the entry bundle on, so a press that lands before the lazy layer
// mounts still stops its 3D (worker-2's W14-S: a phone tap at about 470 ms let the 3D load anyway).
import { afterEach, describe, expect, it, vi } from "vitest";
import { markS0Entry, onOptionPress, optionPressed } from "./option-press";

function option() {
  const s1 = document.createElement("div");
  s1.className = "f-s1";
  s1.innerHTML = '<div class="f-options"><button>I run a business</button></div>';
  document.body.append(s1);
  return s1.querySelector("button")!;
}
const press = (target: EventTarget) => target.dispatchEvent(new Event("pointerdown", { bubbles: true }));
const key = (target: EventTarget, name: string) => target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));

afterEach(() => {
  markS0Entry();
  document.body.replaceChildren();
});

describe("S1 option presses (W14-X)", () => {
  it("tells a viewer that subscribes after the press, at once", () => {
    press(option());
    expect(optionPressed()).toBe(true);
    const run = vi.fn();
    onOptionPress(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("tells a viewer already watching once, on a press or on Enter or Space, and not after it stops", () => {
    const button = option();
    const run = vi.fn();
    const stop = onOptionPress(run);
    press(button);
    key(button, "Enter");
    expect(run).toHaveBeenCalledTimes(1);
    stop();
    markS0Entry();
    press(button);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("counts Enter and Space on an option as a press", () => {
    key(option(), " ");
    expect(optionPressed()).toBe(true);
  });

  it("ignores a Tab, a screen-reader key, a press outside the options and a key on the page (W14-U L1)", () => {
    const button = option();
    key(button, "Tab");
    key(button, "ArrowDown");
    key(document.body, "Enter");
    press(document.body);
    expect(optionPressed()).toBe(false);
  });

  it("starts each visit to S0 afresh", () => {
    press(option());
    markS0Entry();
    expect(optionPressed()).toBe(false);
    const run = vi.fn();
    onOptionPress(run);
    expect(run).not.toHaveBeenCalled();
  });
});
