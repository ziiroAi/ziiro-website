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
 * Three rules keep it from becoming irritating, and each was learned the hard
 * way on sites that get this wrong:
 *
 *   1. The exit is decisive: by the time the next block is seated, this one is
 *      gone rather than lingering at half strength. Two sections held at 40%
 *      either side of a seam is not a transition, it is a dimmer switch — you
 *      still see both, and neither reads as the thing you are on.
 *   2. The exit is driven by this block's BOTTOM edge, which for stacked
 *      sections is the next block's top edge. So the fade is literally "the
 *      old one leaves as the new one arrives", and the two curves are tuned
 *      against each other rather than guessed: EXIT_END matches the point
 *      where a neighbour's enter has completed (see the constants).
 *   3. Nothing fades while its own opening is still on screen. Text that
 *      dims from under someone who is still reading it is worse than a hard
 *      cut, so a block short enough to sit fully in the viewport is gated out
 *      of the exit until its start has climbed past the top.
 *
 * The enter curve is smoothstep, so a block is at full opacity well before it
 * reaches the centre of the screen. A linear scrub leaves content visibly
 * mid-animation exactly where the reader is looking.
 *
 * What this is NOT: there is no scroll-jacking, no wheel interception and no
 * scroll-snap. The page scrolls natively at whatever speed the reader chooses,
 * keyboard paging and anchor jumps land where they always did, and everything
 * here is a pure function of where the block happens to be. "One section at a
 * time" is an opacity effect, never a constraint on the scroller.
 *
 * Writes go straight to style via rAF, never through React state: a scrubbed
 * transform has to land on the compositor, not in a render pass. Only opacity
 * and transform are touched, so nothing here can trigger layout.
 */

/** Bottom edge, as a fraction of the viewport, where a block starts leaving.
 *  0.82 puts the start of the fade at the moment the next section's first line
 *  is on screen — the reader has visibly arrived somewhere new. */
const EXIT_START = 0.82;

/** …and where it is gone. The enter curve below completes once a block's top
 *  reaches 0.45vh, and for stacked sections this block's bottom IS that top,
 *  so anything at or under 0.45 hands over before the next block seats. 0.26
 *  leaves a little margin so the handover is finished, not finishing. */
const EXIT_END = 0.26;

/** Smoothstep. Same curve on both ends, so a scrub never reads as linear. */
const smooth = (x: number) => x * x * (3 - 2 * x);

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export default function ScrollScene({
  children,
  className,
  rise = 26,
  exitTo = 0,
  /** Skip the exit entirely. For the last block on a page, and for anything
   *  a reader might still be interacting with as it leaves — a form, an open
   *  panel, a calculator. Dimming those is hostile. */
  hold = false,
}: {
  children: ReactNode;
  className?: string;
  /** px the block travels up as it resolves */
  rise?: number;
  /** Opacity floor as it leaves. 0 — gone — is the point of the effect; raise
   *  it only for a block that has to stay legible behind whatever follows. */
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
      const enter = clamp01((vh - rect.top) / (vh * 0.55));

      // Exit: 1 (undimmed) while the block owns the screen, falling to 0 over
      // the window between EXIT_START and EXIT_END as its bottom edge — the
      // next block's top edge — climbs the viewport.
      //
      // The direction of this was inverted until it was measured. The original
      // expression, `(0 - rect.bottom) / (vh * 0.6) + 1`, is the exact
      // negation: it returned 0 while the block's bottom was still far BELOW
      // the fold, which is precisely when a reader is starting on it, so every
      // section taller than 0.6 viewports rendered its opening paragraphs
      // dimmed while they were being read.
      const leaving = clamp01(
        (rect.bottom / vh - EXIT_END) / (EXIT_START - EXIT_END),
      );

      // Rule 3: a block whose own opening is still on screen never dims, so a
      // section shorter than the exit window cannot fade while the reader is
      // on its first line. Full strength once the top is 12% of a viewport
      // above the fold; no exit at all while it is still below it.
      const past = clamp01((vh * 0.12 - rect.top) / (vh * 0.18));

      const exit = hold ? 1 : 1 - (1 - smooth(leaving)) * past;

      const e = smooth(enter);
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
    <div
      ref={ref}
      className={className}
      // Marked so a scroll check can read every scene's opacity at once, and
      // so "which block is on hold" is visible in the DOM rather than only in
      // this file. Carries no styling.
      data-scroll-scene
      data-scene-hold={hold ? "" : undefined}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}

/**
 * The join between two sections.
 *
 * Replaces a 1px `border-t`. A hairline is a statement that two things are
 * separate; this is a soft seam that gathers as it crosses the middle of the
 * screen, so a boundary reads as a transition you are passing through rather
 * than a rule someone drew. It carries no content and no semantics — purely
 * the visual join.
 *
 * It used to be a band of the duotone, which only ever worked because it was a
 * band of light on a black field. On paper the same band is a smear of colour
 * across a white page, so the seam is now the page's own ink, densest at the
 * centre and fading out to nothing at both ends. The behaviour is unchanged:
 * what gathers is darkness rather than light.
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
            "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--text-primary) 12%, transparent) 26%, color-mix(in srgb, var(--text-primary) 20%, transparent) 50%, color-mix(in srgb, var(--text-primary) 12%, transparent) 74%, transparent 100%)",
          willChange: "opacity, transform",
        }}
      />
    </div>
  );
}
