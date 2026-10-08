/** (C) Test only: mount React trees in jsdom with React's act, and stub what jsdom lacks. */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Mounted { container: HTMLElement; unmount(): void }

export function mount(node: ReactNode): Mounted {
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  act(() => root.render(node));
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element | null): void {
  if (!el) throw new Error("nothing to click");
  act(() => (el as HTMLElement).click());
}

/** Types into a controlled field: the native setter, then the input event React listens for. */
export function typeInto(el: Element | null, value: string): void {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) throw new Error("not a text field");
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** The button whose accessible name is exactly `name`: its aria-label, else its text. */
export function button(root: ParentNode, name: string): HTMLButtonElement | null {
  return [...root.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === name) ?? null;
}

/** jsdom has no matchMedia, and its scrollTo only logs "not implemented". */
export function stubBrowser(media: Record<string, boolean> = {}): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: media[query] ?? false, media: query, addEventListener() {}, removeEventListener() {},
  }));
  vi.stubGlobal("scrollTo", () => undefined);
}

/** Lets timers, promises and the React updates they cause run. */
export async function settle(ms = 0): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

let clock = 0;

/** Puts performance.now() under the test's control, so taps are a person's pace apart, or a double tap's.
 *  Undo it with vi.restoreAllMocks() in afterEach. */
export function stubClock(): void {
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
}

export function advance(ms: number): void {
  clock += ms;
}

/** A deliberate tap, a second after whatever came before, so the tap gate never takes it for a double tap. */
export function tap(el: Element | null): void {
  advance(1_000);
  click(el);
}

/** Taps options by their exact labels, a second apart. */
export function tapThrough(root: ParentNode, ...labels: string[]): void {
  for (const label of labels) tap(button(root, label));
}
