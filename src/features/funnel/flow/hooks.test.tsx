// @vitest-environment jsdom
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusOnStep } from "./hooks";
import { mount, stubBrowser, type Mounted } from "./test/dom";

let view: Mounted | undefined;
beforeEach(() => stubBrowser());
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.unstubAllGlobals();
});

/** FunnelRoot's shape at S8: the hidden S7 form comes first, then the screen being shown. */
function AtS8(): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useFocusOnStep(8, "s8", root);
  return (
    <div ref={root}>
      <form hidden>
        <h2 data-question tabIndex={-1}>S7 question</h2>
        <button data-focus-first type="submit">Send</button>
      </form>
      <section data-question tabIndex={-1} aria-live="polite">S8 lines</section>
    </div>
  );
}

describe("useFocusOnStep (§11.2)", () => {
  it("moves focus to the visible screen, never into the hidden S7 form (review M1)", () => {
    view = mount(<AtS8 />);
    expect(document.activeElement?.textContent).toBe("S8 lines");
  });
});
