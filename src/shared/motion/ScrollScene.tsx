import { useEffect, useRef, type ReactNode } from "react";

/**
 * A block whose arrival and departure are both scrub-linked to scroll.
 *
 * This is the piece that makes the page read as one continuous travel rather
 * than a stack of independent panels. Section-level reveals — however well
 * tuned — animate each block *in isolation*: every section arrives the same
 * way onto an identical backdrop and nothing connects one to the next. What
 * connects them is overlap. The outgoing block has to still be leaving while
 * the incoming block is already arriving.
 *
 * So the shape is deliberate: content resolves over the approach, holds fully
 * legible through the middle, then recedes as it leaves.
 *
 * Two rules keep it from becoming irritating, and both were learned the hard
 * way on sites that get this wrong:
 *
 *   1. The exit only dims to `exitTo` (never 0) and starts late — once the
 *      block's bottom is genuinely climbing past the top of the screen. Text
 *      that fades out from under someone who is still reading is a worse sin
 *      than a hard cut.
 *   2. The enter curve is smoothstep, so the block is at full opacity well
 *      before it reaches the centre of the screen. A linear scrub leaves
 *      content visibly mid-animation exactly where the reader is looking.
 *
 * Writes go straight to style via rAF, never through React state: a scrubbed
 * transform has to land on the compositor, not in a render pass. Only opacity
 * and transform are touched, so nothing here can trigger layout.
 */
export default function ScrollScene({
  children,
  className,
  rise = 26,
  exitTo = 0.4,
  /** Skip the exit entirely. For the last block on a page, and for anything
   *  a reader might still be interacting with as it leaves — a form, an open
   *  panel, a calculator. Dimming those is hostile. */
  hold = false,
}: {
  children: ReactNode;
  className?: string;
  /** px the block travels up as it resolves */
  rise?: number;
  /** opacity floor as it leaves */
  exitTo?: number;
  hold?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.willChange = "auto";
      return;
    }

    let raf = 0;

    const apply = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      // Enter: from the moment the top edge crosses the bottom of the screen
      // until the block is a third of the way up.
      const enter = Math.max(0, Math.min(1, (vh - rect.top) / (vh * 0.55)));

      // Exit: 1 (undimmed) for as long as any meaningful part of the block is
      // still on screen, falling to 0 only as its bottom edge climbs past the
      // top of the viewport.
      //
      // This was inverted until it was measured. The original expression,
      // `(0 - rect.bottom) / (vh * 0.6) + 1`, is the exact negation of this
      // one: it returned 0 while the block's bottom was still far BELOW the
      // fold, which is precisely when a reader is starting on it. The result
      // was that every section taller than 0.6 viewports rendered its opening
      // paragraphs at `exitTo` — 40% — while they were being read. It went
      // unnoticed because the component was dead code: written, committed, and
      // never actually mounted anywhere until this pass.
      const exit = hold
        ? 1
        : Math.max(0, Math.min(1, rect.bottom / (vh * 0.6)));

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
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rise, exitTo, hold]);

  return (
    <div ref={ref} className={className} style={{ willChange: "opacity, transform" }}>
      {children}
    </div>
  );
}

/**
 * The join between two sections.
 *
 * Replaces a 1px `border-t`. A hairline is a statement that two things are
 * separate; this is a soft seam of the page's own light that brightens as it
 * crosses the middle of the screen, so a boundary reads as a transition you
 * are passing through rather than a rule someone drew. It carries no content
 * and no semantics — purely the visual join.
 */
export function SectionSeam() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "0.5";
      return;
    }

    let raf = 0;
    const apply = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 1 when the seam is at the vertical centre, falling off either side.
      const d = (rect.top + rect.height / 2 - vh / 2) / (vh * 0.55);
      el.style.opacity = Math.max(0.16, Math.exp(-d * d)).toFixed(3);
      el.style.transform = `scaleX(${(0.55 + 0.45 * Math.exp(-d * d)).toFixed(3)})`;
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
    <div aria-hidden="true" className="relative h-px w-full overflow-visible">
      <div
        ref={ref}
        className="absolute inset-x-0 top-0 h-px origin-center"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,138,61,0.28) 22%, rgba(232,89,140,0.34) 50%, rgba(140,106,255,0.28) 78%, transparent 100%)",
          willChange: "opacity, transform",
        }}
      />
    </div>
  );
}
