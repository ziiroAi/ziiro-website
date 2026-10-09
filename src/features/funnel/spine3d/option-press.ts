// (C) W14-X: the visitor leaving S0, recorded from the entry bundle on. S0's 3D layer is lazy, so on a phone the first
// tap can land before its viewer mounts (worker-2's W14-S: a tap at about 470 ms let the host, the worker and the
// 1.1 MB mesh load anyway). This module is tiny and has no imports: LandingSpineSlot loads it with the page, and the
// press listener goes on as soon as it runs. A viewer that subscribes after the press hears it at once.

/** W14-U L1: S1's options (Landing.tsx). A press on one, or Enter or Space on one, is the visitor leaving S0. */
export const S1_OPTION = ".f-s1 .f-options button";

const ACTIVATING_KEYS = new Set(["Enter", " "]);
const EVENTS = ["pointerdown", "keydown"] as const;

let pressed = false;
const listeners = new Set<() => void>();

/** True for a press of one of S1's options, or Enter or Space on one. A Tab, a screen-reader key, a drag in the
 *  gutter or a scroll is not the visitor leaving S0. */
function isOptionPress(event: Event): boolean {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest(S1_OPTION)) return false;
  return event.type === "pointerdown" || ACTIVATING_KEYS.has((event as KeyboardEvent).key);
}

function record(event: Event): void {
  if (pressed || !isOptionPress(event)) return;
  pressed = true;
  [...listeners].forEach((run) => run());
}

if (typeof window !== "undefined") EVENTS.forEach((type) => window.addEventListener(type, record, true));

/** True once the visitor has pressed an S1 option on this visit to S0. */
export const optionPressed = (): boolean => pressed;

/** A new visit to S0 (Back from S2): the press that left the last one no longer counts. */
export function markS0Entry(): void {
  pressed = false;
}

/** Calls `run` once, when the visitor presses one of S1's options, or at once if they already have. Returns a stop. */
export function onOptionPress(run: () => void): () => void {
  if (pressed) {
    run();
    return () => undefined;
  }
  const once = () => {
    listeners.delete(once);
    run();
  };
  listeners.add(once);
  return () => void listeners.delete(once);
}
