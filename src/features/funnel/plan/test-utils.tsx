// Test helpers for the plan page: React 18's createRoot and act.
import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export interface Rendered {
  container: HTMLElement;
  rerender(ui: ReactElement): void;
  unmount(): void;
}

export function render(ui: ReactElement): Rendered {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element | null): void {
  if (!el) throw new Error("click: no element");
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

/** jsdom can't follow links. Call this before clicking one, and call what it returns afterwards. */
export function stopNavigation(): () => void {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener("click", stop);
  return () => document.removeEventListener("click", stop);
}

export const textOf = (el: Element | null): string => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
