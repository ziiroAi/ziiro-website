import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CSS_EASE, DURATION } from "@/shared/motion/tokens";
import { scrollTo } from "@/shared/motion/SmoothScroll";

/**
 * Site navigation, drawn to the homepage hero's reference picture: a
 * lowercase "ziiro" wordmark on
 * the left, three grey links, and an outlined "Book a Call" pill on the right.
 *
 * The bar is one component on every page, so this restyle is site-wide. On a
 * desktop window its geometry is the reference's, in the same `--u` unit the
 * hero uses, which is what makes the wordmark sit exactly over the hero's
 * left column. Below that it keeps the old heights to the pixel (84px, or
 * 116px where the links wrap to a second row), so the pre-hydration `--nav-h`
 * estimates in index.css stay true and no other page's top padding moves.
 *
 * WHAT CHANGED, AND WHY.
 * - The mark-in-a-pill logo, with its hover reveal of "iiro", is replaced by
 *   the wordmark as plain text. The reference sets the name in the text face,
 *   and /public/logo only has the mark. The whole reveal state machine went
 *   with it.
 * - The call to action is visible from the first paint. It used to fade in as
 *   the reader scrolled away from the top; the reference shows it resting in
 *   the bar at the top of the page, outlined rather than filled.
 *
 * WHAT DID NOT CHANGE.
 * - Fixed and transparent at the top, with the 20px blur fading in over the
 *   first 120px of scroll. The long history of that surface, and the reason
 *   there is no hairline, is in git: the owner asked for exactly this.
 * - The bar publishes its real height as `--nav-h`.
 * - The same three routes. The reference shows a fourth link, "Insights",
 *   which has no route, so it is not rendered.
 */

const LINKS = [
  { label: "Mission", to: "/mission" },
  { label: "Who We Are", to: "/who-we-are" },
  { label: "Products", to: "/products" },
];

/**
 * How far the reader scrolls before the blur behind the bar is fully in, in px.
 * It fades in rather than sitting there from the top: blurring white against
 * white cannot produce a visible pixel, and backdrop-filter costs a compositor
 * pass whether or not it changes anything. Kept under reduced motion, since a
 * cross-fade is what motion is reduced TO; nothing here moves.
 */
const BACKDROP_SPAN = 120;

/** Pointer feedback across the bar, on the site's micro duration. */
const micro = (properties: string) => ({
  transitionProperty: properties,
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
});

/**
 * The keyboard focus ring for every control in the bar: 2px of ink on a 2px
 * white offset, the same treatment as the hero's primary action. It replaces
 * the browser's default ring, which Chrome draws in a pale blue that measures
 * 1.74:1 against this white bar and so fails the 3:1 a focus indicator needs
 * (WCAG 1.4.11 / 2.4.11). A colour change on its own (the links darken to
 * ink) is not an indicator anyone can find at a glance.
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export default function Navbar() {
  const { pathname } = useLocation();
  // 0 at the top of the page, 1 once the blur behind the bar is fully in.
  const [backdropProgress, setBackdropProgress] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      setBackdropProgress(Math.min(Math.max(window.scrollY / BACKDROP_SPAN, 0), 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /**
   * ── TWO MEASUREMENTS THE REST OF THE LAYOUT READS ─────────────────────
   *
   * `--nav-h`: the bar is fixed, so it takes no space, and its height changes
   * when the links wrap, which is a layout event rather than a viewport one (a
   * font finishing loading re-wraps the row at an unchanged width). Layout
   * that has to clear the header reads this instead of guessing.
   *
   * `--vw`: the page width WITHOUT a classic scrollbar. The hero and this bar
   * size themselves in `--u`, a fraction of the width, and `100vw` counts the
   * scrollbar on Windows. That would make the composition ~15px wider than the
   * page and push its right-anchored half off the edge. On macOS the two are
   * equal, and `100vw` is the pre-hydration fallback.
   *
   * Both run on mount, before anything that depends on them needs them.
   */
  useEffect(() => {
    const bar = navRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const publish = () => {
      const h = Math.round(bar.getBoundingClientRect().height);
      if (h > 0) root.style.setProperty("--nav-h", `${h}px`);
      root.style.setProperty("--vw", `${root.clientWidth}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bar);
    ro.observe(root);
    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <nav ref={navRef} className="fixed left-0 right-0 top-0 z-50">
      {/* The progressive blur, and the only thing in this bar that is not a
          control. Hidden outright while invisible: a backdrop-filter at zero
          opacity can still cost a compositor pass. */}
      <div
        className="site-nav-backdrop"
        aria-hidden="true"
        style={{
          opacity: backdropProgress,
          visibility: backdropProgress < 0.02 ? "hidden" : "visible",
        }}
      />

      <div className="cb-nav-inner font-hero-sans">
        <Link
          to="/"
          data-hero="nav-wordmark"
          aria-label="Ziiro home"
          onClick={(e) => {
            // Home while already home is a no-op for the router; give it the
            // same eased return the rest of the page scrolls with. A modified
            // click is a new-tab request and is left alone.
            if (pathname !== "/") return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            scrollTo(0);
          }}
          // `-my-3 py-3` makes a 44px target out of a 26px line and hands the
          // padding back to the layout, the same idiom the links use. The
          // matching `-mx-1.5 px-1.5` only gives the focus ring room beside
          // the letters; the ink does not move.
          className={`cb-nav-word -mx-1.5 -my-3 inline-block rounded-md px-1.5 py-3 font-medium lowercase ${FOCUS_RING}`}
          style={{ color: "var(--cb-ink)" }}
        >
          ziiro
        </Link>

        <div className="cb-nav-links">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              data-hero="nav-link"
              aria-current={pathname === link.to ? "page" : undefined}
              // Colour is a class, not an inline style: an inline colour would
              // outrank the hover class and the link would never answer.
              className={`cb-nav-link -mx-1.5 -my-3 whitespace-nowrap rounded-md px-1.5 py-3 hover:text-[var(--cb-ink)] focus-visible:text-[var(--cb-ink)] ${FOCUS_RING} ${
                pathname === link.to ? "text-[var(--cb-ink)]" : "text-[var(--cb-nav)]"
              }`}
              style={micro("color")}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Outlined, not filled: the filled black pill belongs to the hero's
            primary action, and two filled pills on one screen would compete.
            The border darkens to ink on hover; nothing moves. Keyboard focus
            adds the bar's ring on top, because a 1px border going from pale
            grey to ink is too small a change to find. */}
        <Link
          to="/book-a-call"
          data-hero="nav-cta"
          className={`cb-nav-cta inline-flex items-center whitespace-nowrap rounded-full border border-[var(--cb-pill)] bg-white text-[var(--cb-ink)] hover:border-[var(--cb-ink)] focus-visible:border-[var(--cb-ink)] ${FOCUS_RING}`}
          // Tighter than the links: the reference's label is 74px wide at the
          // same 16px.
          style={{ ...micro("border-color"), letterSpacing: "-0.035em" }}
        >
          Book a Call
        </Link>
      </div>
    </nav>
  );
}
