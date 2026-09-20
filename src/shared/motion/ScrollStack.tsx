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
 *  content being removed rather than as depth. 0.15 is a ghost, which is what
 *  depth should look like; it was 0.35, which is still comfortably readable
 *  body text and is why an outgoing card competed with the one arriving. */
const MIN_OPACITY = 0.15;

/**
 * THE FADE FINISHES BEFORE THE INCOMING CARD DOES, and that is the whole point.
 *
 * The opacity used to be linear across the full travel, so at the midpoint of a
 * transition the outgoing card was still at 0.675 while the incoming card was
 * fully opaque and sliding over it. Two large blocks of text, both readable,
 * competing. The last card in the stack looked better only because nothing
 * follows it, so it never faded at all; it was the reference by accident.
 *
 * Completing the fade at 62 percent of the travel means the outgoing card has
 * reached its floor before the arriving one takes the top of the screen, so
 * there is no moment where both are legible. Depth keeps developing after that
 * through scale and lift, which do run the full span: the card carries on
 * receding, it just stops being something you could read.
 */
const FADE_COMPLETE_AT = 0.62;
/** Vertical offset per card, so the stack reads as a deck with visible edges. */
const STEP_PX = 18;

/**
 * ── THE GAP BUG, AND WHY THE RUNWAY IS NOW MEASURED ───────────────────
 *
 * The gap under each card used to be a fixed fraction of the viewport
 * (0.85vh). That number had nothing to do with how tall the cards actually
 * were, and the two quantities have to agree, because:
 *
 *   scroll between card N and card N+1 arriving  =  card height + gap
 *   scroll during which anything visibly moves   =  viewport - topOffset
 *
 * Measured on the live page at 949px tall: cards 581px, gap 807px, so 1,388px
 * of scrolling to advance a card whose transition only occupies 833px of it.
 * The other 555px was scroll in which the pinned card sat motionless with
 * white space under it and the next card still below the fold. Per gap. That
 * is the "so much gap" in the complaint, and it is also the "slow": a scrub
 * that spends 40 percent of its runway producing no change reads as drag even
 * though nothing is easing or lagging.
 *
 * So the gap is no longer chosen. It is derived: gap = span - cardHeight, for
 * each card separately, which makes the runway equal the transition span and
 * leaves no scroll in which nothing happens. Cards of different heights get
 * different gaps, which is the point; a fixed vh could not do that.
 *
 * Recomputed on resize AND on card resize, because these cards contain
 * disclosures. Opening one makes the card taller, which must shorten its gap
 * by the same amount or the dead band comes straight back.
 */

/** Smallest gap, for when a card is nearly as tall as the span. Below this the
 *  deck stops reading as separate plates. */
const MIN_GAP = 40;
/**
 * Largest gap, and the reason there is an upper bound at all.
 *
 * `span - height` is the gap that makes the runway exactly one transition, but
 * it is also literally the white band under the pinned card, so on a short
 * card it trades dead scroll for dead space. Capping it does three things at
 * once: less white, a shorter section, and a faster advance, because the gap
 * IS the runway. The cost is that the incoming card starts arriving slightly
 * before the outgoing one has finished receding, which reads as continuous
 * rather than as a queue.
 */
const MAX_GAP = 180;
/**
 * How much of the next card is already showing when the current one pins.
 * A sliver of the following card is what tells a reader there is more, and it
 * is what stops the bottom of the viewport looking like the end of the page.
 */
const PEEK = 120;
/** Gap used when the stack is not stacking: no JavaScript, or reduced motion.
 *  Ordinary spacing in an ordinary list. */
const REST_GAP = 48;

interface ScrollStackProps {
  children: ReactNode[];
  /** Where the pinned card rests, in px from the top of the viewport. */
  topOffset?: number;
  className?: string;
}

export default function ScrollStack({
  children,
  topOffset = 120,
  className,
}: ScrollStackProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const lastY = useRef(Number.NaN);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-stack-card]")];
    if (cards.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // The gentle equivalent, and it has to actually be one. The markup is a
      // plain list, but the cards were still being made sticky with a gap
      // nearly a viewport tall, so this reader got the pinning and the dead
      // space and none of the motion that justified them. Leave them static,
      // evenly spaced, full size, full opacity.
      root.dataset.stacked = "false";
      for (const card of cards) {
        card.style.position = "static";
        card.style.marginBottom = `${REST_GAP}px`;
      }
      cards[cards.length - 1].style.marginBottom = "0px";
      return;
    }
    root.dataset.stacked = "true";

    /**
     * Derive each card's gap from its own measured height, so the scroll
     * between two cards arriving is exactly the scroll during which the
     * incoming one is visibly travelling. Run before paint, and again whenever
     * the viewport or a card changes size.
     */
    const layout = () => {
      const span = Math.max(1, window.innerHeight - topOffset);
      for (let i = 0; i < cards.length; i += 1) {
        cards[i].style.position = "sticky";
        cards[i].style.willChange = "transform, opacity";
        if (i === cards.length - 1) {
          // Nothing follows the last card, so it needs no runway at all. Any
          // gap here is pure trailing white space before the next section.
          cards[i].style.marginBottom = "0px";
          continue;
        }
        // Measure the unscaled height: the card may currently be drawn scaled
        // down, and feeding a transformed height back into the layout would
        // make the gap drift every frame.
        const h = cards[i].offsetHeight;
        const gap = Math.max(MIN_GAP, Math.min(MAX_GAP, Math.round(span - h - PEEK)));
        cards[i].style.marginBottom = `${gap}px`;
      }
    };

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
        // Scale and lift track `behind` across the whole travel; opacity runs
        // on its own shorter clock so readability resolves first.
        const faded = Math.min(1, behind / FADE_COMPLETE_AT);
        const opacity = 1 - (1 - MIN_OPACITY) * faded;
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

    const relayout = () => {
      layout();
      paint();
    };

    relayout();
    // Passive: this listener must never be able to delay or cancel a scroll.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", relayout, { passive: true });

    // The cards hold disclosures. Opening one grows the card, and its gap has
    // to shrink by the same amount or the dead band returns for that card
    // alone. Observing height is the only way to catch that: it is not a
    // resize, not a scroll, and not a prop change.
    const ro = new ResizeObserver(relayout);
    for (const card of cards) ro.observe(card);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", relayout);
      ro.disconnect();
      cancelAnimationFrame(frame.current);
      for (const card of cards) {
        card.style.transform = "";
        card.style.opacity = "";
        card.style.marginBottom = "";
        card.style.position = "";
        card.style.willChange = "";
      }
    };
  }, [topOffset]);

  return (
    <div ref={rootRef} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          data-stack-card
          // Deliberately NOT sticky here. Sticky and the runway gap are both
          // applied by the effect, because both only make sense once the
          // cards have been measured. What the server emits, and what a
          // reader with no JavaScript gets, is an ordinary spaced list that
          // reads top to bottom. z-index is harmless either way and rises
          // with index so a later card covers the one before it.
          style={{
            top: `${topOffset}px`,
            zIndex: i + 1,
            transformOrigin: "center top",
            marginBottom: i === children.length - 1 ? 0 : `${REST_GAP}px`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
