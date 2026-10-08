/**
 * (C) W14-I: the live spine on S0. This slot is all the entry bundle carries. After hydration it lazy-loads the layer
 * (LandingSpine), which in turn loads the 3D in idle time, so the prerendered greeting stays the LCP. On the first tap
 * into S1 the layer fades out, and it unmounts only after the fade, so the tap itself costs a class change.
 */
import { lazy, Suspense, useEffect, useState } from "react";

const LandingSpine = lazy(() => import("./LandingSpine").then((m) => ({ default: m.LandingSpine })));

/** Matches .f-spine's opacity transition in flow.css. */
export const SPINE_FADE_MS = 300;

export function LandingSpineSlot({ on }: { on: boolean }): JSX.Element | null {
  const [hydrated, setHydrated] = useState(false);
  const [mounted, setMounted] = useState(on);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (on) {
      setMounted(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), SPINE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [on]);
  if (!hydrated || !mounted) return null;
  return (
    <Suspense fallback={null}>
      <LandingSpine visible={on} />
    </Suspense>
  );
}
