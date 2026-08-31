import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ZiiroMark from "@/shared/ui/ziiro-mark";

/**
 * Site navigation. Transparent until you scroll, then a blurred bar.
 *
 * The homepage opens on sections that paint their own near-black field
 * regardless of the site theme, which would leave a light-theme visitor with
 * dark-on-dark chrome. So the bar watches for any [data-nav-dark] section
 * underneath it and, while it is over one, swaps to `.nav-over-dark`. That class re-points the design tokens
 * this bar's children already consume — the mark draws with currentColor and
 * the CTA pill reads --text-primary and --background — so everything inverts
 * without a single component learning about the hero.
 */

const LINKS = [
  { label: "Mission", to: "/mission" },
  { label: "Who We Are", to: "/who-we-are" },
  { label: "Products", to: "/products" },
  { label: "Process", to: "/process" },
  { label: "Audit", to: "/audit" },
];

/** Roughly the height of the bar: past this, the dark section no longer
 *  reaches under the chrome and the normal palette takes over. */
const BAR_HEIGHT = 76;

export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  // Seeded from the route rather than from a measurement, so the prerendered
  // homepage ships with the inverted palette already applied and there's no
  // one-frame flash of dark text on the dark hero.
  const [overDark, setOverDark] = useState(pathname === "/");

  useEffect(() => {
    let raf = 0;

    const measure = () => {
      raf = 0;
      setScrolled(window.scrollY > 50);
      // Any section can opt in, and the homepage has two stacked, so this
      // asks whether the bar is currently sitting on top of any of them.
      const dark = document.querySelectorAll<HTMLElement>("[data-nav-dark]");
      let on = false;
      dark.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= BAR_HEIGHT && r.bottom > BAR_HEIGHT) on = true;
      });
      setOverDark(on);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--border)] py-3 backdrop-blur-xl"
          : "py-5"
      } ${overDark ? "nav-over-dark" : ""}`}
      style={{
        // Tailwind can't alpha-modify var() colours (bg-[var(--x)]/90 compiles
        // to transparent), so the scrolled backdrop is painted explicitly.
        backgroundColor: scrolled
          ? overDark
            ? "rgba(0,0,0, 0.72)"
            : "color-mix(in srgb, var(--background) 90%, transparent)"
          : "transparent",
      }}
    >
      <div className="relative mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 md:px-10">
        {/* Left: mark + wordmark */}
        <Link
          to="/"
          aria-label="Ziiro home"
          className="flex items-center gap-3 text-[var(--text-primary)] transition-opacity hover:opacity-80"
        >
          <ZiiroMark className="h-8" />
          <span className="font-display text-[26px] font-bold leading-none tracking-tight">
            Ziiro
          </span>
        </Link>

        {/* Centre: the quiet link set. Absolutely centred so it stays on the
            page's axis regardless of how wide the wordmark or the CTA get.
            Below lg it's dropped rather than folded into a menu — every one of
            these lives in the footer, so nothing becomes unreachable. */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex xl:gap-9">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={pathname === link.to ? "page" : undefined}
              className={`-my-2 whitespace-nowrap py-2 text-[13px] tracking-wide transition-colors hover:text-[var(--text-primary)] ${
                pathname === link.to
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className="flex items-center gap-2 rounded-full bg-[var(--text-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-all hover:opacity-90"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </nav>
  );
}
