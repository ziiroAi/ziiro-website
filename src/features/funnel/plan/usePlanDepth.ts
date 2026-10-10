// plan_depth (Appendix C): the furthest block the visitor has reached. 0 is "you need only", i is stop i, and the
// number of stops plus one is the close. Each block carries data-depth (Task 15).
import { useCallback, useEffect, useRef } from "react";

/** A block counts as reached once its top is inside the upper 60 % of the screen. */
const ROOT_MARGIN = "0px 0px -40% 0px";

export function usePlanDepth(onDepth: (depth: number) => void): (node: HTMLElement | null) => void {
  const latest = useRef(onDepth);
  const furthest = useRef(-1);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    latest.current = onDepth;
  }, [onDepth]);
  useEffect(() => () => observer.current?.disconnect(), []);

  return useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (node === null || typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver(
      (entries) => {
        const deepest = entries
          .filter((e) => e.isIntersecting)
          .reduce((max, e) => Math.max(max, Number((e.target as HTMLElement).dataset.depth)), -1);
        if (deepest <= furthest.current) return;
        furthest.current = deepest;
        latest.current(deepest);
      },
      { rootMargin: ROOT_MARGIN },
    );
    node.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => watcher.observe(el));
    observer.current = watcher;
  }, []);
}
