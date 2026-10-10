/** (C) The app's first mount. */
import { startTransition, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * A plain root.render() runs on React 18's default lane, which is not time-sliced: the whole first
 * render is one long task (80-95 ms on a phone profile, W15-E). As a transition, React yields every
 * few milliseconds, so no task of it blocks a tap.
 */
export function mountRoot(container: HTMLElement, node: ReactNode): Root {
  const root = createRoot(container);
  startTransition(() => root.render(node));
  return root;
}
