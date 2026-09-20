import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ZiiroMark from "@/shared/ui/ziiro-mark";
import { CSS_EASE, DURATION } from "@/shared/motion/tokens";
import { scrollTo } from "@/shared/motion/SmoothScroll";

/**
 * Site navigation, built to the measured reference.
 *
 * The bar is fixed and completely transparent at every scroll depth: no
 * backdrop, no blur, no border, no shadow. That transparency is the whole
 * reason it reads as part of the page rather than as a strip stuck to the top,
 * so nothing here should ever start painting a background again.
 *
 * The logo pill and the three links are there from the first paint. The call to
 * action is the only thing that arrives later, rising in continuously as the
 * reader leaves the hero rather than snapping in at a threshold.
 */

const LINKS = [
  { label: "Mission", to: "/mission" },
  { label: "Who We Are", to: "/who-we-are" },
  { label: "Products", to: "/products" },
];

/** The reveal is pinned at 500ms by the measured spec, and there is no 0.5s in
 *  the duration tokens, so it is written out rather than rounded to a token
 *  that would put the mark and the wordmark on different clocks. */
const REVEAL_MS = 500;

/**
 * Geometry lifted off the supplied lockup (the mark followed by "iiro", the
 * mark standing in for the z). In that artwork the mark is 136 units tall, the
 * wordmark's x-height is 101 and the ink-to-ink gap between them is 18, so at a
 * 24px mark the text wants an x-height of 17.8px. Helvetica's x-height is
 * 0.52em, hence 34px. Helvetica Neue stops at Bold, so 700 with a tightened
 * track is as close to the artwork's heavier grotesque as the site's own stack
 * reaches.
 *
 * The pill's inset is a real padding rather than a wider box around the mark,
 * because the mark plus "iiro" has to read as the single word "Ziiro". Dead
 * space inside a square mark box was pushing the letters four pixels clear of
 * the mark and breaking the word in two.
 */
const MARK_PX = 24;
const PILL_PX = 40;
const WORD_PX = 34;
/** Pill inset, left and right, chosen so the resting pill is a circle:
 *  2 borders + 2 insets + the mark = PILL_PX. */
const PILL_INSET = (PILL_PX - 2 - MARK_PX) / 2;
/** Ink to ink, the lockup's own 18/136 of the mark height. */
const WORD_GAP_INK = MARK_PX * (18 / 136);
/** Side bearings measured off the rendered span at WORD_PX: the "i" carries
 *  1.97px of air before its stem and the "o" 1.29px after its bowl. Both are
 *  taken out so the gap and the right inset are ink to ink, not box to box. */
const I_BEARING = 1.97;
const O_BEARING = 1.29;
/** Vertical nudge on the wordmark, in px. Flex centres the 34px line box, which
 *  leaves the letters sitting low against the mark. The anchor that transfers
 *  between typefaces is the baseline: in the lockup the mark's bottom lands on
 *  the wordmark's baseline, a third of a pixel under it at this size, which is
 *  the overshoot a curved form needs to look level with a flat one. Measured
 *  off the rendered pill, that is 1.8px up from where the line box puts it. */
const WORD_SHIFT = -1.8;

/**
 * The reference's call to action is at opacity 0 at the very top, about 0.86
 * with a 1.4px lift one viewport down, and fully seated a little past two.
 * `1 - (1 - p)^3.3` over a span of 2.2 viewports hits all three of those
 * points, and expressing the span in viewports rather than the raw 2000px it
 * was measured at keeps the same feel on a laptop and on a tall monitor.
 */
const CTA_SPAN_VH = 2.2;
const CTA_CURVE = 3.3;
const CTA_LIFT = 10;

/**
 * How far the reader scrolls before the blur behind the bar is fully in, in px.
 *
 * The blur fades in rather than sitting there from the very top, for two
 * reasons. The hero is white space under the header, and blurring white against
 * white cannot produce a visible pixel, so at rest it would be pure cost for no
 * effect. And backdrop-filter is a per-frame GPU job that runs whether or not
 * it changes anything, on the one page that is also running the WebGL orb.
 *
 * 120px is short enough that the blur is already there by the time any real
 * content reaches the bar, and long enough that it arrives as a fade rather
 * than snapping on at a threshold.
 *
 * This ramp is kept under reduced motion, unlike the call to action's lift.
 * The preference is about movement; nothing here moves, and a cross-fade is
 * one of the standard things to reduce movement TO. Popping the blur on at a
 * hard cutoff would be the more jarring of the two.
 */
const BACKDROP_SPAN = 120;

/** Pointer feedback across the bar. 0.15s is the value the reference uses on
 *  nearly everything that reacts to a cursor, and it is the difference between
 *  chrome that feels attached to the pointer and chrome that lags it. */
const micro = (properties: string) => ({
  transitionProperty: properties,
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
});

export default function Navbar() {
  const { pathname } = useLocation();

  // 0 at the top of the page, 1 once the call to action is fully seated.
  const [ctaProgress, setCtaProgress] = useState(0);
  // 0 at the top of the page, 1 once the blur behind the bar is fully in.
  const [backdropProgress, setBackdropProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Three ways in, one open state. Hover covers pointers, focus-visible covers
  // the keyboard, and the pinned flag covers touch, which has no hover at all.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const revealed = hovered || focused || pinned;

  const logo = useRef<HTMLAnchorElement>(null);
  // Read once in an effect rather than per event: whether the device can hover
  // decides whether a tap on the logo reveals or navigates.
  const canHover = useRef(true);

  useEffect(() => {
    canHover.current = window.matchMedia("(hover: hover)").matches;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(motion.matches);
    syncMotion();
    motion.addEventListener("change", syncMotion);

    let raf = 0;
    const measure = () => {
      raf = 0;
      const span = window.innerHeight * CTA_SPAN_VH;
      const p = span > 0 ? Math.min(Math.max(window.scrollY / span, 0), 1) : 1;
      setCtaProgress(1 - Math.pow(1 - p, CTA_CURVE));
      // Same frame as the call to action, on purpose: a second scroll listener
      // and a second rAF to read the same scrollY would double the work for a
      // value that changes on exactly the same beat.
      setBackdropProgress(
        Math.min(Math.max(window.scrollY / BACKDROP_SPAN, 0), 1),
      );
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      motion.removeEventListener("change", syncMotion);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // A pill left open by a tap closes on anything that happens outside it, or on
  // Escape. Pointer and keyboard reveals put themselves away on their own.
  useEffect(() => {
    if (!pinned) return;

    const onDown = (e: PointerEvent) => {
      if (logo.current && !logo.current.contains(e.target as Node)) {
        setPinned(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  useEffect(() => {
    setPinned(false);
  }, [pathname]);

  /**
   * Reduced motion gets the end state, not a slower version of the movement:
   * the call to action simply appears once the reader is properly into the
   * page, with no lift and no fade.
   */
  const ctaOpacity = reduced ? (ctaProgress > 0.5 ? 1 : 0) : ctaProgress;
  const ctaLift = reduced ? 0 : -CTA_LIFT * (1 - ctaProgress);
  // Below this it is invisible anyway, and an invisible link that still takes
  // clicks and still answers a screen reader is a trap sitting over the hero.
  const ctaIdle = ctaOpacity < 0.02;

  const reveal = (property: string) => ({
    transitionProperty: property,
    transitionDuration: reduced ? "0s" : `${REVEAL_MS}ms`,
    transitionTimingFunction: CSS_EASE.outSoft,
  });

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 py-5">
      {/* The progressive blur, and the only thing in this bar that is not a
          control. It is first so it paints behind everything below it, and
          aria-hidden because it is a surface, not content.

          Hidden outright while it is invisible rather than left at opacity 0:
          a backdrop-filter at zero opacity can still cost a compositor pass,
          and the top of the page is exactly where the homepage is busiest. */}
      <div
        className="site-nav-backdrop"
        aria-hidden="true"
        style={{
          opacity: backdropProgress,
          visibility: backdropProgress < 0.02 ? "hidden" : "visible",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between px-6 md:px-10">
        {/* ─── The logo pill ───────────────────────────────────────────────
            At rest it is a circle holding just the mark. On hover, on
            focus-visible, or on a tap where there is no hover to be had, the
            mark turns and the pill opens to the right to let the name out.
            The wordmark is "iiro" rather than "ziiro": the mark is the z. */}
        <Link
          ref={logo}
          to="/"
          aria-label="Ziiro home"
          onMouseEnter={() => canHover.current && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={(e) => {
            if (e.currentTarget.matches(":focus-visible")) setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onClick={(e) => {
            // A modified or non-primary click is the reader asking for a new
            // tab, and an unconditional preventDefault swallows it silently.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (e.button !== 0) return;
            // Touch never gets the hover reveal, so there the first tap spends
            // itself opening the pill and the second one follows the link.
            // Pointer devices have already seen the reveal by the time they
            // click, so their click navigates, which is what the link is for.
            if (!canHover.current && !pinned) {
              e.preventDefault();
              setPinned(true);
              return;
            }
            // Clicking home while already home is a no-op for the router, so
            // nothing at all happened here before. Lenis gives it the same
            // eased return the rest of the page scrolls with.
            if (pathname !== "/") return;
            e.preventDefault();
            scrollTo(0);
          }}
          className="inline-flex shrink-0 items-center overflow-hidden rounded-full text-[var(--text-primary)]"
          style={{
            height: PILL_PX,
            paddingLeft: PILL_INSET,
            paddingRight: PILL_INSET,
            border: "1px solid var(--border)",
            background: "var(--background)",
          }}
        >
          <span
            className="flex shrink-0 items-center justify-center"
            style={{
              width: MARK_PX,
              height: MARK_PX,
              // The mark is its own 180-degree rotation, so the turn lands back
              // on the shape it started from. The movement is the gesture; the
              // resting silhouette never changes.
              transform: revealed ? "rotate(180deg)" : "rotate(0deg)",
              ...reveal("transform"),
            }}
          >
            <ZiiroMark style={{ height: MARK_PX }} />
          </span>

          {/* 0fr to 1fr is what widens the pill: it resolves to the wordmark's
              own width with no measured pixel value to go stale, and the pill's
              overflow clips whatever has not been let out yet. */}
          <span
            style={{
              display: "grid",
              gridTemplateColumns: revealed ? "1fr" : "0fr",
              ...reveal("grid-template-columns"),
            }}
          >
            <span style={{ minWidth: 0, overflow: "hidden" }}>
              <span
                aria-hidden="true"
                className="block font-display font-bold"
                style={{
                  fontSize: WORD_PX,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  whiteSpace: "nowrap",
                  paddingLeft: WORD_GAP_INK - I_BEARING,
                  // The pill's own inset supplies the space on the right; this
                  // only cancels the "o"'s side bearing so the ink sits the
                  // same distance from the edge as the mark does on the left.
                  marginRight: -O_BEARING,
                  // Optical, not box, centring: the mark is a symmetric form
                  // read from its middle, the word from the band between its
                  // x-height and its baseline, so centring the two boxes leaves
                  // the word low. See WORD_SHIFT for where the number comes
                  // from and why the baseline is the anchor.
                  transform: revealed
                    ? `translate(0, ${WORD_SHIFT}px)`
                    : `translate(-16px, ${WORD_SHIFT}px)`,
                  opacity: revealed ? 1 : 0,
                  ...reveal("transform, opacity"),
                }}
              >
                iiro
              </span>
            </span>
          </span>
        </Link>

        {/* ─── Centre: the three links ─────────────────────────────────────
            From sm up they are absolutely centred, so they sit on the page's
            axis rather than in whatever space is left between the pill and the
            call to action, which changes width as the reader scrolls.

            Below sm there is no room for all three on the pill's line, so they
            wrap to their own centred row underneath. One element either way:
            rendering a second copy for small screens would put every link in
            the document twice.

            `-my-3 py-3` takes each link from 36px to a 44px tap target and
            hands the padding straight back to the layout, so the row's
            occupied height is the 20px of ink it always was. `leading-5` is
            the last half-pixel: 13px text rides a 19.5px line by default,
            which lands the padded box on 43.5 and just under the target. */}
        <div className="order-3 mt-3 flex w-full items-center justify-center gap-6 sm:absolute sm:left-1/2 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-7 xl:gap-9">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={pathname === link.to ? "page" : undefined}
              className={`-my-3 whitespace-nowrap py-3 text-[13px] leading-5 tracking-wide hover:text-[var(--text-primary)] ${
                pathname === link.to
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)]"
              }`}
              style={micro("color")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ─── Right: the call to action ───────────────────────────────── */}
        <div className="flex items-center">
          <Link
            to="/contact"
            data-reveal
            tabIndex={ctaIdle ? -1 : undefined}
            aria-hidden={ctaIdle || undefined}
            className="flex items-center rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90"
            style={{
              opacity: ctaOpacity,
              transform: `translateY(${ctaLift}px)`,
              visibility: ctaIdle ? "hidden" : "visible",
              pointerEvents: ctaIdle ? "none" : undefined,
              ...micro("opacity"),
            }}
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
