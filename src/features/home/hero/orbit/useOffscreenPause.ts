import { useEffect, useState, type RefObject } from "react";

/**
 * True while `ref` is off screen or the tab is hidden. HeroStage passes its own
 * `paused` too; this is the orbit's own guarantee, so it never spends frames
 * nobody can see even when mounted somewhere that forgets to pass one.
 *
 * Starts false so the server-rendered frame and the first client render agree.
 */
export function useOffscreenPause(ref: RefObject<Element>): boolean {
  const [offscreen, setOffscreen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) =>
      setOffscreen(!entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return offscreen || hidden;
}
