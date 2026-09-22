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
 *  content being removed rather than as depth. 0.12 is a ghost, which is what
 *  depth should look like; it was 0.35, which is still comfortably readable
 *  body text and is why an outgoing card competed with the one arriving. */
const MIN_OPACITY = 0.12;

/**
 * ── IT IS A CROSSFADE NOW, AND THAT IS WHAT BOUNDS THE OVERLAP ────────────
 *
 * The previous attempt at this only fixed half of it, and the note it left
 * behind claimed a result the page did not have. It shortened the outgoing
 * card's fade to 62 percent of the travel and concluded "there is no moment
 * where both are legible". Measured on the built page at 1440x900, there were
 * 42 such moments: at scrollY 896 the incoming heading sat at 665px, well
 * inside the reading area, while the outgoing card was still at 0.518. The
 * worst frame summed to 1.924.
 *
 * The reason shortening the fade could not fix it: only ONE side was fading.
 * The incoming card was pinned at opacity 1 from the instant it appeared, so
 * the best any outgoing curve could do was decide how long the reader spent
 * with two legible blocks, never whether they had them.
 *
 * So both sides move now, and they are driven by the SAME quantity. A card's
 * recession is a function of how far the next card has travelled, and that next
 * card's arrival is a function of its own position, which is the same number.
 * Feeding both through one constant makes them exact complements:
 *
 *     out = 1 - (1 - MIN_OPACITY) * f        in = f          f = min(1, t / CROSSFADE_AT)
 *     out + in = 1 + MIN_OPACITY * f   ->  never exceeds 1 + MIN_OPACITY
 *
 * The sum is bounded by construction at 1.12 rather than tuned down by trial,
 * which is why this does not need re-checking every time the cards change
 * height. Measured after the change: worst frame 1.120, and zero frames with
 * two legible blocks.
 *
 * WHY 0.35 AND NOT THE FULL TRAVEL. A crossfade spread over the whole span
 * keeps the sum just as low but leaves both cards half-faded through the
 * middle of the screen, which trades competing text for a washed-out stretch.
 * Completing it at 0.35 keeps the crossfade down in the bottom third, where
 * the arriving card is not being read yet; by the time it reaches the reading
 * area it is fully opaque and the one behind it is a ghost. Depth keeps
 * developing after that through scale and lift, which still run the full span.
 */
const CROSSFADE_AT = 0.35;
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

    /**
     * ── THE ANCHOR, AND THE BUG IT EXISTS FOR ─────────────────────────────
     *
     * One number per card: how much of a recent geometry change that card's
     * top has NOT yet been allowed to express. Normally every entry is 0 and
     * this whole mechanism is inert.
     *
     * It exists because a disclosure inside a card changes the stack's
     * geometry underneath the reader's cursor. Measured on the built page at
     * 1440, clicking "How it runs" on the first stage:
     *
     *     card height        464px -> 863px   (the disclosure, expected)
     *     card marginBottom  180px ->  40px   (layout, clamped at MIN_GAP)
     *     net: the NEXT card moved down 259px
     *
     * and a card recedes by how far the NEXT one has come, so that 259px was
     * a 0.33 step in `behind`, a 3.3% step in scale, and the button the reader
     * had just clicked moved 14.7px out from under them. The last card never
     * moved, which is the proof: nothing follows it, so it has no `behind`.
     *
     * NOT FIXED BY SIMPLY NOT REPAINTING. That was the first attempt and it
     * measured beautifully, 0px on click at both widths, while being wrong:
     * the step just moved to the next scroll event, still 14.7px, now landing
     * as a jerk on the first pixel of scroll instead of on the click. Measure
     * the click alone and that reads as a pass.
     *
     * So the step is absorbed rather than deferred. A geometry change is added
     * to the anchor, `paint` reads each top with the anchor subtracted, and the
     * frame after a disclosure opens is therefore pixel-identical to the frame
     * before it. Scrolling then relaxes the anchor by the distance scrolled, so
     * the stack converges on true geometry over the same distance the content
     * grew, with no discontinuity anywhere in between.
     */
    const anchors = new Array(cards.length).fill(0);

    /**
     * Document Y of a card's LAYOUT box, walking offsetParent rather than
     * reading a rect. Two reasons it has to be this and not
     * getBoundingClientRect:
     *
     *   1. A rect includes the card's own transform, and `paint` writes that
     *      transform. Feeding it back in would let scale and lift drive the
     *      very number that computes them.
     *   2. The anchor below compares this frame's tops against the last
     *      painted ones, so the measurement has to be stable under the
     *      transforms that painting applies.
     *
     * It ignores sticky displacement, which is correct here: a stuck card's
     * value carries on past its pinned position and the clamps below land on
     * the same answer the rect gave.
     */
    const docTop = (el: HTMLElement) => {
      let y = 0;
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
        y += n.offsetTop;
      }
      return y;
    };
    const tops = () => cards.map(docTop);

    /** The tops as of the last paint, and the scroll they were measured at. */
    let painted: number[] = [];
    let paintedY = Number.NaN;

    const paint = () => {
      frame.current = 0;
      const viewport = window.innerHeight;
      const sy = window.scrollY;
      const t = tops();
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
        // Each top is read with that card's own anchor removed, so a geometry
        // change the reader has not scrolled through yet cannot move anything.
        const behind = next
          ? Math.max(0, Math.min(1, (viewport - (t[i + 1] - sy - anchors[i + 1])) / span))
          : 0;
        // How far THIS card has come toward its own resting point. Clamps to 1
        // once it pins, whatever the lift has done to it.
        const arrive = Math.max(0, Math.min(1, (viewport - (t[i] - sy - anchors[i])) / span));
        const scale = 1 - (1 - MIN_SCALE) * behind;
        // Scale and lift track `behind` across the whole travel. Opacity is the
        // crossfade, and both halves of it run on the one clock so they stay
        // exact complements: see the note on CROSSFADE_AT.
        const recede = 1 - (1 - MIN_OPACITY) * Math.min(1, behind / CROSSFADE_AT);
        const emerge = Math.min(1, arrive / CROSSFADE_AT);
        const opacity = recede * emerge;
        const lift = -STEP_PX * behind;
        cards[i].style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        cards[i].style.opacity = opacity.toFixed(3);
      }
      painted = t;
      paintedY = sy;
    };

    const onScroll = () => {
      if (window.scrollY === lastY.current) return;
      // Relax every anchor by the distance actually scrolled, in whichever
      // direction, so an absorbed step is paid back over the same distance the
      // content grew and never all at once.
      const moved = Math.abs(window.scrollY - lastY.current);
      for (let i = 0; i < anchors.length; i += 1) {
        if (anchors[i] > 0) anchors[i] = Math.max(0, anchors[i] - moved);
        else if (anchors[i] < 0) anchors[i] = Math.min(0, anchors[i] + moved);
      }
      lastY.current = window.scrollY;
      if (frame.current) return;
      frame.current = requestAnimationFrame(paint);
    };

    const relayout = () => {
      // A viewport change re-derives everything, so nothing is owed: any
      // absorbed step from before is meaningless against the new geometry.
      anchors.fill(0);
      layout();
      paint();
    };

    /**
     * A content change, which is a disclosure opening or closing. Measure what
     * it did to every card's top, absorb exactly that into the anchors, and
     * repaint: the result is the same pixels as the frame before, on a stack
     * whose geometry has already moved on.
     */
    let primed = false;
    const onContentResize = () => {
      // ResizeObserver always delivers one callback for the initial
      // observation, and at that point `layout` is still swapping every card
      // off REST_GAP onto its measured gap. Anchoring that would bank the
      // whole initial layout as a debt and leave the stack reading as though
      // nothing had receded. The first delivery is the mount, not a
      // disclosure, so it re-lays out and anchors nothing.
      if (!primed) {
        primed = true;
        relayout();
        return;
      }
      layout();
      const now = tops();
      /**
       * Compare against the LAST PAINTED tops, not against a reading taken
       * inside this callback. By the time a ResizeObserver runs, the browser
       * has already laid the grown card out and pushed the next one down, so a
       * before/after pair around `layout` sees only the margin half of the
       * change. That was the first version of this and it anchored -140px when
       * the real step was +259px, which left the jump fully intact.
       *
       * Only absorb a step the reader did not scroll into: if the scroll moved
       * since the last paint, the movement is theirs and the stack should
       * simply track it.
       */
      if (painted.length === now.length && window.scrollY === paintedY) {
        for (let i = 0; i < anchors.length; i += 1) anchors[i] += now[i] - painted[i];
      }
      paint();
    };

    relayout();
    // Passive: this listener must never be able to delay or cancel a scroll.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", relayout, { passive: true });

    // The cards hold disclosures. Opening one grows the card, and its gap has
    // to shrink by the same amount or the dead band returns for that card
    // alone. Observing height is the only way to catch that: it is not a
    // resize, not a scroll, and not a prop change. See the anchor note above
    // for why this goes through `onContentResize` rather than `relayout`.
    const ro = new ResizeObserver(onContentResize);
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
