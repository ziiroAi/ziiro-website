import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll stack: successive cards come forward and the ones behind recede, so a
 * sequence reads as one progression rather than as unrelated sections.
 *
 * HOW IT TRACKS. Each card is `position: sticky`, so the browser does the
 * pinning and the page scrolls normally the entire time. On every frame that
 * the scroll position changed, each card's progress past its own resting point
 * is recomputed and turned into a scale and an opacity. It is a continuous
 * function of scroll offset with no thresholds and no snapping, and because it
 * only ever reads `scrollY` and writes transforms, it never intercepts a wheel,
 * a touch or a key. Nothing here can lock the reader out of the page.
 *
 * WHY STICKY RATHER THAN A PINNED SCROLLER. The alternative is to fix the
 * section and translate cards through it, which means owning the scroll and
 * deciding when to release it. That is exactly the pattern the brief rules out.
 * Sticky keeps the browser in charge of scrolling and leaves this file with
 * only the presentation.
 *
 * REDUCED MOTION gets the gentler equivalent rather than nothing: the cards
 * stop stacking and become an ordinary vertical list, with every card at full
 * size and full opacity. All the same content, none of the travel.
 *
 * PRERENDERING. No browser API in the render body. The server emits the cards
 * in document order inside plain elements, so a crawler reads all three in
 * full; the stacking is layered on afterwards.
 */

/** How far a card scales down once it is fully behind the next one. */
const MIN_SCALE = 0.9;
/** How far it fades. It never reaches zero: a card that vanished would read as
 *  content being removed rather than as depth. */
const MIN_OPACITY = 0.35;
/** Vertical offset per card, so the stack reads as a deck with visible edges. */
const STEP_PX = 18;

interface ScrollStackProps {
  children: ReactNode[];
  /** Distance the page scrolls per card, as a fraction of viewport height. */
  perCardVh?: number;
  /** Where the pinned card rests, in px from the top of the viewport. */
  topOffset?: number;
  className?: string;
}

export default function ScrollStack({
  children,
  perCardVh = 0.85,
  topOffset = 120,
  className,
}: ScrollStackProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const lastY = useRef(Number.NaN);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // The gentle equivalent: leave every card at rest. The markup is already
      // a plain list, so there is nothing to undo.
      root.dataset.stacked = "false";
      return;
    }
    root.dataset.stacked = "true";

    const cards = [...root.querySelectorAll<HTMLElement>("[data-stack-card]")];
    if (cards.length === 0) return;

    const paint = () => {
      frame.current = 0;
      const viewport = window.innerHeight;
      // Distance the next card covers between first appearing at the bottom of
      // the viewport and coming to rest on top of this one.
      const span = Math.max(1, viewport - topOffset);
      for (let i = 0; i < cards.length; i += 1) {
        const next = cards[i + 1];
        // A card recedes by how far the NEXT one has come toward it, not by its
        // own position. Once a card is stuck its own rect.top is pinned at
        // topOffset and stops changing, so measuring itself yields a constant
        // and the stack never moves. The card behind is the thing still
        // travelling, and it is what the depth is actually a function of.
        // The last card has nothing after it, so it never recedes.
        const behind = next
          ? Math.max(0, Math.min(1, (viewport - next.getBoundingClientRect().top) / span))
          : 0;
        const scale = 1 - (1 - MIN_SCALE) * behind;
        const opacity = 1 - (1 - MIN_OPACITY) * behind;
        const lift = -STEP_PX * behind;
        cards[i].style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        cards[i].style.opacity = opacity.toFixed(3);
      }
    };

    const onScroll = () => {
      if (window.scrollY === lastY.current) return;
      lastY.current = window.scrollY;
      if (frame.current) return;
      frame.current = requestAnimationFrame(paint);
    };

    paint();
    // Passive: this listener must never be able to delay or cancel a scroll.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", paint, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", paint);
      cancelAnimationFrame(frame.current);
      for (const card of cards) {
        card.style.transform = "";
        card.style.opacity = "";
      }
    };
  }, [perCardVh, topOffset]);

  return (
    <div ref={rootRef} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          data-stack-card
          // Sticky is what pins each card without anyone owning the scroll.
          // z-index rises with index so a later card covers the one before it.
          className="sticky"
          style={{
            top: `${topOffset}px`,
            zIndex: i + 1,
            transformOrigin: "center top",
            willChange: "transform, opacity",
            // Space below each card is what the page scrolls through while the
            // card is pinned. The last one needs none: the section ends there.
            marginBottom: i === children.length - 1 ? 0 : `${perCardVh * 100}vh`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
