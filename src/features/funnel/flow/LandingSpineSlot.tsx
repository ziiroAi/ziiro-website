/**
 * (C) W14-I: the live spine on S0. This slot is all the entry bundle carries. After hydration it lazy-loads the layer
 * (LandingSpine), which in turn loads the 3D in idle time, so the prerendered greeting stays the LCP. On the first tap
 * into S1 the layer fades out, and it unmounts only after the fade, so the tap itself costs a class change.
 */
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
// W14-X: loaded with the page, so a press on an S1 option is recorded before the lazy layer mounts.
import { markS0Entry } from "../spine3d/option-press";

/** useLayoutEffect warns on the server; the press reset only matters in the browser. */
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const LandingSpine = lazy(() => import("./LandingSpine").then((m) => ({ default: m.LandingSpine })));

/** Matches .f-spine's opacity transition in flow.css. */
export const SPINE_FADE_MS = 300;

export function LandingSpineSlot({ on }: { on: boolean }): JSX.Element | null {
  const [hydrated, setHydrated] = useState(false);
  const [mounted, setMounted] = useState(on);
  /** W14-U L3: each entry to S0 gets a fresh layer, so Back within the fade never reuses a viewer that gave up. */
  const [entry, setEntry] = useState(0);
  const wasOn = useRef(on);
  useEffect(() => setHydrated(true), []);
  // Before the new layer's own effects run: Back to S0 starts a fresh visit, whose 3D the last press must not stop.
  useBrowserLayoutEffect(() => {
    if (on && !wasOn.current) markS0Entry();
  }, [on]);
  useEffect(() => {
    const entering = on && !wasOn.current;
    wasOn.current = on;
    if (on) {
      setMounted(true);
      if (entering) setEntry((n) => n + 1);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), SPINE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [on]);
  if (!hydrated || !mounted) return null;
  return (
    <Suspense fallback={null}>
      <LandingSpine key={entry} visible={on} />
    </Suspense>
  );
}
