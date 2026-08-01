import { useEffect, useRef, useState } from "react";

/**
 * Scroll position of an element, as a continuous 0..1 value.
 *
 *   0   the element's top edge is just entering from the bottom
 *   0.5 the element is centred in the viewport
 *   1   the element's bottom edge has just left the top
 *
 * Deliberately not IntersectionObserver-with-a-boolean: the homepage needs a
 * value it can scrub, so that a section can begin leaving while the next is
 * already arriving. Entry triggers can only say "it happened", which is what
 * makes template pages feel like a stack of independent fades.
 *
 * One shared rAF-coalesced scroll listener per hook instance; the state write
 * is throttled to meaningful changes so React isn't re-rendering on every pixel.
 */
export function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let lastPushed = -1;

    const read = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = rect.height + vh;
      const travelled = vh - rect.top;
      const p = Math.max(0, Math.min(1, travelled / span));
      // ~100 discrete steps is plenty for opacity/transform work and keeps
      // React out of the way during fast scrolls.
      if (Math.abs(p - lastPushed) > 0.01) {
        lastPushed = p;
        setProgress(p);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}
