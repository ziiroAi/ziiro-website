import { useEffect, useRef } from "react";

/**
 * A hairline at the top of the window showing how far through the page you
 * are.
 *
 * It earns its place on a site this long — the homepage runs several screens
 * and the reader otherwise has no cue about depth. It is also the cheapest
 * possible "this page is responding to me" signal, which is half of what makes
 * scrolling feel good.
 *
 * Written straight to `transform` inside a rAF, never through React state: a
 * scroll-linked value that goes through a render pass arrives a frame late and
 * the bar visibly lags the scroll. `scaleX` on a full-width element keeps the
 * whole thing on the compositor with no layout at all.
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = -1;

    const apply = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      // Skip sub-pixel churn: at 1440px wide, 0.001 of progress is 1.4px.
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      bar.style.transform = `scaleX(${p})`;
      bar.style.opacity = p > 0.005 ? "1" : "0";
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left"
        style={{
          transform: "scaleX(0)",
          opacity: 0,
          background:
            "linear-gradient(90deg, var(--accent) 0%, #e8598c 55%, var(--accent-light) 100%)",
          transition: "opacity 240ms ease",
        }}
      />
    </div>
  );
}
