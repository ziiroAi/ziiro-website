import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import ZiiroMark from "@/shared/ui/ziiro-mark";
import { CSS_EASE, DURATION, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import { scrollTo } from "@/shared/motion/SmoothScroll";

/**
 * Site navigation, built to the measured reference.
 *
 * The bar is fixed and fully transparent AT THE TOP of a page, which is what
 * makes it read as part of the page rather than as a strip stuck over it. It
 * is not transparent all the way down: as the reader scrolls, a restrained
 * glass surface fades in behind it, because once real content is moving under
 * the bar the links have to stay readable against it.
 *
 * THIS NOTE USED TO SAY THE OPPOSITE, and the history is worth keeping. The
 * human asked for "no blur animation overall", it was read as "remove the
 * blur", and the blur was deleted. They had actually meant they could not SEE
 * it, and the reason was a build defect: Vite's CSS minifier was collapsing
 * the standard and prefixed properties, so production shipped only one of them
 * and the effect was dead on the live site while working in dev. That is fixed
 * now, and the built CSS carries both `-webkit-backdrop-filter` and
 * `backdrop-filter`. Anything added here that uses backdrop-filter must be
 * verified against the BUILT output, not the dev server, because that is
 * exactly how this shipped broken the first time.
 *
 * The surface is two restrained parts and no more: a 20px blur and a thin wash
 * of the page's own ground so contrast actually drops behind the links. Both
 * fade in together on the same scroll progress. It is not a glass card and
 * must not become one.
 *
 * THERE IS NO HAIRLINE. A third part used to sit here, a 1px edge on the bar's
 * bottom added for review item 13's "fine border". The human saw it on the page
 * and asked for it gone, with the blur alone doing the separating, so it was
 * removed rather than hidden. Checked against the BUILT output with body copy,
 * a heading and the dot-art particle field scrolled under the bar: the blur
 * carries it on its own at 20px.
 *
 * The one place an edge survives is the two accessibility blocks in index.css.
 * Both answer a reader who asked for less transparency or more contrast by
 * turning the backdrop solid and switching the blur OFF, so there the border is
 * the only thing left to define the bar's bottom. Do not remove those with this.
 *
 * The logo pill and the three links are there from the first paint. The call to
 * action is the only thing that arrives later, rising in continuously as the
 * reader leaves the hero rather than snapping in at a threshold.
 *
 * ── BELOW 640px THE LINKS LIVE BEHIND A BURGER ─────────────────────────────
 * Under `sm` the three links do not fit beside the logo. They used to wrap onto
 * a second row, which made the bar 116px tall and put the links over the hero's
 * eyebrow pill on a phone. Now the bar is one row at every width: the logo, the
 * call to action and a burger. The burger opens a full-screen white panel with
 * the links set large, plus the call to action.
 *
 * The panel is the SAME element as the desktop link row, restyled by
 * `.site-menu` in index.css below 640px. So the links exist once in the
 * document, in the prerendered HTML, at every width. On a phone the call to
 * action is always shown, as an outlined pill. The scroll-driven fade-in is
 * desktop behaviour, and on a phone it read as a washed-out grey button.
 */

const LINKS = [
  { label: "Mission", to: "/mission" },
  { label: "Who We Are", to: "/who-we-are" },
  { label: "Products", to: "/products" },
  // Three items, and Contact is deliberately not one of them. It was added
  // here briefly when the Book a Call CTA was repointed, on the reasoning that
  // Contact would otherwise leave the header entirely; the human saw the
  // four-item bar and wanted three back. Contact keeps its footer link and its
  // in-body links and is a real page; it simply does not sit in the header.
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
/**
 * 44, not 40, and the reason is touch rather than taste.
 *
 * At 40x40 the logo was the smallest standalone control on the site and sat
 * under the 44px target guidance on both axes. Raising it here is the whole
 * fix, because PILL_INSET below is DERIVED from this number: the inset
 * recomputes from 7 to 9, the pill stays a circle, and the mark stays 24px, so
 * the lockup's measured geometry is untouched.
 *
 * The bar gets 4px taller as a result. Nothing downstream cares any more,
 * because the bar publishes its real height as `--nav-h` and layout reads that
 * instead of assuming 80.
 *
 * The hit area could not be faked here the way it is on the links. This anchor
 * carries `overflow: hidden`, which the wordmark's 0fr-to-1fr reveal depends
 * on, and that clips any pseudo-element used to extend the target past the
 * box. Growing the box was the honest option.
 */
const PILL_PX = 44;
const WORD_PX = 34;
/** Pill inset, left and right, chosen so the resting pill is a circle:
 *  2 borders + 2 insets + the mark = PILL_PX. */
const PILL_INSET = (PILL_PX - 2 - MARK_PX) / 2;
/** Ink to ink, the lockup's own 18/136 of the mark height. */
const WORD_GAP_INK = MARK_PX * (18 / 136);
/** The wordmark's tracking. Named rather than inlined because the trailing
 *  compensation below has to subtract it, and the two going out of step is
 *  what sliced the "o". */
const WORD_TRACK_EM = -0.03;

/** Side bearings, measured off the rendered span at WORD_PX and stored as a
 *  FRACTION OF THE FONT SIZE rather than as pixels. A bearing is a property of
 *  the glyph, so it scales with the type; as a fixed px value it was only ever
 *  correct at one size, and anything that changed WORD_PX would have re-cut the
 *  word. The "i" carries 1.97px of air before its stem at 34px and the "o"
 *  1.29px after its bowl. */
const I_BEARING_EM = 1.97 / 34;
const O_BEARING_EM = 1.29 / 34;

const I_BEARING = I_BEARING_EM * WORD_PX;

/**
 * ── WHY THE TRAILING COMPENSATION IS NOT JUST THE BEARING ──────────────
 *
 * This used to be `marginRight: -O_BEARING`, and it sliced the bowl off the
 * final "o" against the pill's overflow.
 *
 * CSS letter-spacing is added after EVERY character including the last, so the
 * text box already ends WORD_TRACK_EM short of the glyph advance before any
 * margin is applied. Taking the full bearing off on top of that removed the
 * same air twice and then kept going into the ink:
 *
 *   box end = advance + track + margin
 *           = advance - 1.02 - 1.29   = advance - 2.31
 *   ink end = advance - 1.29 (the bearing)
 *   so the box ended 1.02px INSIDE the ink, and overflow:hidden cut it.
 *
 * The compensation is therefore the bearing NET of the tracking already taken,
 * which lands the box edge exactly on the end of the ink. Measured after the
 * fix: left inset 8.00, right inset 8.00, nothing clipped.
 */
const O_TRIM = -(O_BEARING_EM + WORD_TRACK_EM) * WORD_PX;
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

/**
 * Where the burger takes over: below Tailwind's `sm`, the width at which the
 * three links stop fitting beside the logo (measured: 620 wraps, 640 does not).
 * `.site-menu` in index.css switches at the same 640, and the two have to
 * agree or the panel and the button would exist at different widths.
 */
const COMPACT_QUERY = "(max-width: 639.98px)";

/** Everything the menu's focus trap can land on, filtered to what is actually
 *  shown: the row's call to action is hidden while the panel is open, and the
 *  panel's own call to action does not exist above 640. */
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
  ).filter(
    (el) =>
      el.tabIndex >= 0 &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== "hidden",
  );
}

export default function Navbar() {
  const { pathname } = useLocation();

  // The phone menu. `compact` is read once up front rather than defaulting to
  // false, because the client renders over the prerendered HTML with
  // createRoot, so a wrong first value would briefly hide the phone call to
  // action from assistive tech. The server has no window and renders false.
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

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

  const navRef = useRef<HTMLElement>(null);
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
    // A route change closes the menu too. That covers every link in the panel,
    // the logo and the call to action, as well as history navigation.
    setOpen(false);
  }, [pathname]);

  // Track the breakpoint. Growing past it, for example by rotating a tablet,
  // closes the menu, because the burger that would close it is gone up there.
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => {
      setCompact(mq.matches);
      if (!mq.matches) setOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /**
   * ── WHILE THE MENU IS OPEN ───────────────────────────────────────────
   *
   * Scroll lock. Lenis drives wheel and keyboard scrolling here, so it is
   * stopped rather than fought, and its own `lenis-stopped` class clips the
   * root. Touch scrolling is native (SmoothScroll leaves touch alone) and
   * Lenis does not exist at all under reduced motion, so the root's overflow
   * is locked directly as well. Both are handed back exactly as found.
   *
   * Everything outside the bar is made `inert`: the panel covers the page, so
   * nothing under it may take focus, clicks or a screen reader's cursor.
   * Focus moves to the first link, Tab cycles through what the bar shows, and
   * Escape closes. On close, focus goes back to the burger if it was still in
   * the bar or had been dropped on the body, so the reader lands where they
   * started.
   */
  useEffect(() => {
    if (!open) return;
    const nav = navRef.current;
    if (!nav) return;
    const burger = burgerRef.current;

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    window.__lenis?.stop();

    const outside = Array.from(nav.parentElement?.children ?? []).filter(
      (el): el is HTMLElement => el !== nav && el instanceof HTMLElement && !el.inert,
    );
    outside.forEach((el) => {
      el.inert = true;
    });

    const raf = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables(nav);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !nav.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !nav.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      outside.forEach((el) => {
        el.inert = false;
      });
      root.style.overflow = prevOverflow;
      window.__lenis?.start();
      const active = document.activeElement;
      if (!active || active === document.body || nav.contains(active)) {
        burger?.focus({ preventScroll: true });
      }
    };
  }, [open]);

  /**
   * ── THE BAR PUBLISHES ITS OWN HEIGHT AS `--nav-h` ─────────────────────
   *
   * At 390 the three links do not fit beside the logo, so they wrap onto a
   * second row and this bar becomes 112px tall instead of 80. Nothing
   * downstream knew that. The hero reserved a fixed 96px of top padding,
   * which clears an 80px bar and not a 112px one, so on the home page the
   * eyebrow pill sat inside the navbar and underneath the wrapped links.
   *
   * Any fixed number here would be wrong again the moment the bar changes:
   * a fourth link, a longer word, a larger tap target, a different font all
   * move it. So the bar measures itself and writes the result to the root
   * element, and layout that has to clear the header reads `--nav-h` instead
   * of guessing. See `.clears-nav` in index.css.
   *
   * ResizeObserver rather than a resize listener, because the height changes
   * when the links WRAP, which is a layout event and not necessarily a
   * viewport one: a font finishing loading re-wraps the row at a viewport
   * width that never changed.
   *
   * This is layout, not decoration, so it must not wait for the blur or the
   * reveal. It runs on mount and writes a real number before first paint of
   * anything that depends on it.
   */
  useEffect(() => {
    const bar = navRef.current;
    if (!bar) return;
    const publish = () => {
      const h = Math.round(bar.getBoundingClientRect().height);
      if (h > 0) document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bar);
    return () => {
      ro.disconnect();
    };
  }, []);

  /**
   * Reduced motion gets the end state, not a slower version of the movement:
   * the call to action simply appears once the reader is properly into the
   * page, with no lift and no fade.
   */
  const ctaOpacity = reduced ? (ctaProgress > 0.5 ? 1 : 0) : ctaProgress;
  const ctaLift = reduced ? 0 : -CTA_LIFT * (1 - ctaProgress);
  // Below this it is invisible anyway, and an invisible link that still takes
  // clicks and still answers a screen reader is a trap sitting over the hero.
  // Never idle on a phone: there the pill is always shown (see `.site-nav-cta`
  // in index.css, which also keeps the prerendered first paint right).
  const ctaIdle = !compact && ctaOpacity < 0.02;

  /** The menu's clocks, all from the token file and handed to index.css as
   *  custom properties, because the panel's transitions live in a media query
   *  there. Zero under reduced motion: the panel simply appears. */
  const menuMotion = {
    ["--menu-in" as string]: reduced ? "0s" : `${DURATION.swap}s`,
    ["--menu-settle" as string]: reduced ? "0s" : `${DURATION.reveal}s`,
    ["--menu-out" as string]: reduced ? "0s" : `${DURATION.quick}s`,
    ["--menu-ease" as string]: CSS_EASE.outExpo,
    ["--menu-stagger" as string]: reduced ? "0s" : `${STAGGER.tight}s`,
    ["--menu-travel" as string]: reduced ? "0px" : `${TRAVEL.reveal}px`,
  } as CSSProperties;
  /** The burger's two strokes meet in the middle as an X. In-out, because the
   *  gesture can be reversed mid-flight by a second tap. */
  const morph: CSSProperties = {
    transitionProperty: "transform",
    transitionDuration: reduced ? "0s" : `${DURATION.swap}s`,
    transitionTimingFunction: CSS_EASE.inOut,
  };

  const reveal = (property: string) => ({
    transitionProperty: property,
    transitionDuration: reduced ? "0s" : `${REVEAL_MS}ms`,
    transitionTimingFunction: CSS_EASE.outSoft,
  });

  return (
    <nav
      ref={navRef}
      className="fixed left-0 right-0 top-0 z-50 py-5"
      data-menu-open={open || undefined}
    >
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
      {/* There is no hairline under the bar. A `.site-nav-edge` div used to sit
          here on the same scroll progress as the band above, and the blur does
          the separating alone now. `backdropProgress` stays because it drives
          that band; it was never the edge's own. The two accessibility blocks
          in index.css still draw a real border-bottom, and must: they switch
          the blur off, so there they are the only thing defining the edge. */}

      {/* `isolate` gives the row its own stacking context, so the phone panel
          inside it can sit at z-index -1: under the logo, the call to action
          and the burger, and over the page. */}
      <div className="relative isolate mx-auto flex w-full items-center justify-between px-6 md:px-10">
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
                  letterSpacing: `${WORD_TRACK_EM}em`,
                  whiteSpace: "nowrap",
                  paddingLeft: WORD_GAP_INK - I_BEARING,
                  // The pill's own inset supplies the space on the right; this
                  // only cancels what is left of the "o"'s side bearing after
                  // the tracking has already taken part of it, so the ink sits
                  // the same distance from the edge as the mark does on the
                  // left. See O_TRIM for why it is not the whole bearing.
                  marginRight: O_TRIM,
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

        {/* ─── Centre: the three links, which are also the phone menu ──────
            From sm up they are absolutely centred, so they sit on the page's
            axis rather than in whatever space is left between the pill and the
            call to action, which changes width as the reader scrolls. Every
            class that styles that row carries `sm:`, so the row is exactly
            what it was.

            Below sm this same element is the menu panel: `.site-menu` in
            index.css makes it a full-screen white sheet under the bar, with
            the links set large and a call to action at the foot. Hidden, it is
            `visibility: hidden`, which keeps it out of the tab order and the
            accessibility tree while the links stay in the document and in the
            prerendered HTML. One element either way: rendering a second copy
            for small screens would put every link in the document twice.

            `sm:-my-3 sm:py-3` takes each desktop link from 36px to a 44px tap
            target and hands the padding straight back to the layout, so the
            row's occupied height is the 20px of ink it always was. `leading-5`
            is the last half-pixel: 13px text rides a 19.5px line by default,
            which lands the padded box on 43.5 and just under the target. */}
        <div
          id="site-menu"
          ref={menuRef}
          data-open={open}
          className="site-menu sm:absolute sm:left-1/2 sm:top-1/2 sm:flex sm:w-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:items-center sm:justify-center sm:gap-7 xl:gap-9"
          style={menuMotion}
        >
          {LINKS.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={pathname === link.to ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`site-menu-item site-menu-link sm:-my-3 sm:whitespace-nowrap sm:py-3 sm:text-[13px] sm:leading-5 sm:tracking-wide sm:hover:text-[var(--text-primary)] ${
                pathname === link.to
                  ? "sm:text-[var(--text-primary)]"
                  : "sm:text-[var(--text-secondary)]"
              }`}
              style={{ ...micro("color"), ["--i" as string]: i }}
              // Phone only: the index beside each large link, drawn by
              // `.site-menu-link::after` from this attribute. CSS rather than a
              // span, so it never becomes part of the link's text for a crawler
              // ("Mission01") or its name for a screen reader.
              data-index={String(i + 1).padStart(2, "0")}
            >
              {link.label}
            </Link>
          ))}
          {/* Phone only: the call to action at the foot of the panel. The row's
              own pill steps aside while the panel is open, so there is exactly
              one of it on screen. */}
          <div
            className="site-menu-item site-menu-foot sm:hidden"
            style={{ ["--i" as string]: LINKS.length }}
          >
            <Link
              to="/book-a-call"
              onClick={() => setOpen(false)}
              className="site-menu-cta"
            >
              Book a call
              <svg
                aria-hidden="true"
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ─── Right: the call to action ─────────────────────────────────
            Two elements, and the split is the point. The wrapper carries the
            scroll-driven state; the link carries the pointer-driven state.

            They used to be one element, and that element had BOTH an opacity
            recomputed on every scroll frame and a 0.15s transition on opacity.
            A transition retargeted every frame does not track its input, it
            chases it: measured from a standing start, the button sat at 0 for
            three frames and then eased 0.33, 0.53, 0.68, 0.79, 0.87, 0.93,
            0.96 while the scroll position had already arrived. Scroll is the
            reader's gesture here, so the rule that applies is that a
            gesture-driven value animates from where it actually is and can be
            reversed at any moment. A transition can do neither: reverse the
            scroll mid-fade and it restarts toward the new target from wherever
            the easing curve had got to.

            So the wrapper has no transition at all at full motion, and the
            opacity is simply the scroll position. Under reduced motion the
            progress is deliberately binary (see ctaOpacity), and a bare
            binary flip is a hard cut, so that case gets a cross-fade instead:
            the preference asks for a gentler equivalent, not for nothing.

            The link keeps its own opacity transition, which is now only ever
            driving the hover. Before the split the two shared one declaration
            and could not be tuned apart.

            Below sm none of the scroll-driven fade applies: `.site-nav-cta` in
            index.css pins the wrapper fully shown (it has to outrank these
            inline styles, hence !important there), and the link turns into the
            outlined pill. The fade was reading as a washed-out grey button on a
            phone. The burger sits to its right on the same row. */}
        <div className="flex items-center gap-2.5">
          <div
            className="site-nav-cta flex items-center"
            style={{
              opacity: ctaOpacity,
              transform: `translateY(${ctaLift}px)`,
              visibility: ctaIdle ? "hidden" : "visible",
              pointerEvents: ctaIdle ? "none" : undefined,
              ...(reduced
                ? {
                    transitionProperty: "opacity",
                    transitionDuration: `${DURATION.swap}s`,
                    transitionTimingFunction: CSS_EASE.out,
                  }
                : null),
            }}
          >
            <Link
              to="/book-a-call"
              data-reveal
              tabIndex={ctaIdle ? -1 : undefined}
              aria-hidden={ctaIdle || undefined}
              // `min-h-[44px]`: this measured 123x36, under the touch guidance on
              // its short axis. The padding stays as it was and the minimum does
              // the work, so the pill keeps its proportions and simply stops
              // being too short to hit. Same idiom the rest of the site uses.
              //
              // `max-sm:` is the phone's outlined pill: the page's ground, a hairline
              // in the same --border as the logo pill and the burger, ink text.
              // Under 360 it gives up some side padding so the tap-opened logo
              // still clears it.
              className="flex min-h-[44px] items-center rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90 max-sm:border max-sm:border-[var(--border)] max-sm:bg-[var(--background)] max-sm:text-[var(--text-primary)] max-[359px]:px-3.5"
              style={micro("opacity")}
            >
              Book a Call
            </Link>
          </div>

          {/* ─── The burger (below sm only) ────────────────────────────────────
              A 44px circle in the logo pill's own vocabulary: the page's ground,
              a --border hairline, the ink. Two strokes rather than three, which
              meet in the middle as an X when the menu is open. */}
          <button
            ref={burgerRef}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:hidden"
            style={{
              border: "1px solid var(--border)",
              background: "var(--background)",
              // Tailwind can't alpha-modify a var() colour, so the focus ring and
              // its offset are painted from real tokens, as HeroActions does.
              ["--tw-ring-offset-color" as string]: "var(--background)",
              ["--tw-ring-color" as string]: "var(--text-primary)",
            }}
          >
            <span aria-hidden="true" className="relative block h-[10px] w-[18px]">
              <span
                className="absolute left-0 top-0 block h-[1.5px] w-full rounded-full bg-current"
                style={{
                  transform: open ? "translateY(4.25px) rotate(45deg)" : "none",
                  ...morph,
                }}
              />
              <span
                className="absolute bottom-0 left-0 block h-[1.5px] w-full rounded-full bg-current"
                style={{
                  transform: open ? "translateY(-4.25px) rotate(-45deg)" : "none",
                  ...morph,
                }}
              />
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
