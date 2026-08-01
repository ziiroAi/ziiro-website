import { useEffect, useRef, type ReactNode } from "react";

/**
 * A block whose arrival and departure are both scrub-linked to scroll.
 *
 * The shape is deliberate: content resolves over the approach, holds fully
 * legible through the middle, then recedes as it leaves — so the outgoing
 * section is already on its way out while the next is on its way in, and the
 * two overlap rather than hard-cutting.
 *
 * The exit only dims to `exitTo` (never 0) and starts late. Text that fades
 * out from under someone who is still reading is a worse sin than a hard cut.
 *
 * Writes go straight to style via rAF, never through React state: a scrubbed
 * transform has to land on the compositor, not in a render pass.
 */
export default function ScrollScene({
  children,
  className,
  rise = 26,
  exitTo = 0.4,
}: {
  children: ReactNode;
  className?: string;
  /** px the block travels up as it resolves */
  rise?: number;
  /** opacity floor as it leaves */
  exitTo?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    let raf = 0;

    const apply = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // Enter: from the moment the top edge crosses the bottom of the screen
      // until the block is a third of the way up. Exit: only once the block's
      // bottom is genuinely climbing past the top of the screen.
      const enter = Math.max(0, Math.min(1, (vh - rect.top) / (vh * 0.55)));
      const exit = Math.max(0, Math.min(1, (0 - rect.bottom) / (vh * 0.6) + 1));

      const e = enter * enter * (3 - 2 * enter);
      const opacity = e * (exitTo + (1 - exitTo) * exit);
      const y = (1 - e) * rise;

      el.style.opacity = opacity.toFixed(3);
      el.style.transform = y > 0.05 ? `translate3d(0,${y.toFixed(2)}px,0)` : "none";
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rise, exitTo]);

  return (
    <div ref={ref} className={className} style={{ willChange: "opacity, transform" }}>
      {children}
    </div>
  );
}
