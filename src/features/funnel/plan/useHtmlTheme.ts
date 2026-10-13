// The theme lane A's head script sets on <html data-theme> (00-index §1.3), followed live,
// so the hero still changes with the colours if the theme changes while the plan is open.
import { useSyncExternalStore } from "react";
import type { Theme } from "../data/contract";

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export const useHtmlTheme = (): Theme => useSyncExternalStore(subscribe, read, () => "light");
