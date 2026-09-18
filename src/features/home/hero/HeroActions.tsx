import type { CSSProperties, MouseEvent } from "react";
import { Link } from "react-router-dom";

import { scrollTo } from "@/shared/motion/SmoothScroll";
import { CSS_EASE, DURATION, TRAVEL } from "@/shared/motion/tokens";

/**
 * The two things a visitor can do from the hero. Both already exist on the
 * site — the strategy session is the standing offer, and "how it works" is the
 * section directly below — so neither button promises anything new.
 *
 * A filled near-black pill and an outlined one, side by side, wrapping to two
 * rows only when the line genuinely runs out. They used to be soft-cornered
 * rectangles carrying a warm inner glow and a 40px orange drop shadow, which
 * is what a control has to do to separate itself from a black field; on white
 * the ground does that work and the glow would just be haze, so both are flat
 * and the only difference between them is fill against outline.
 *
 * The arrow moves, the button doesn't slide around under the cursor, and the
 * press response fires on pointer-down rather than on click, so the control
 * acknowledges you at the moment you touch it.
 */

function Arrow({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
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
      className={className}
      style={style}
    >
      <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
    </svg>
  );
}

/**
 * Hover, focus and press all resolve in DURATION.micro. This is the single
 * value that decides whether a control feels attached to the pointer; the
 * buttons used to run at 200ms and the extra 50ms was enough to read as the
 * page thinking about it rather than answering.
 */
const micro: CSSProperties = {
  transitionProperty:
    "transform, background-color, border-color, box-shadow, color, opacity",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

/** The icon travels TRAVEL.nudge and nothing else does — the button itself
 *  holding still is what keeps the cursor on target while you aim. */
const nudge: CSSProperties = {
  ["--nudge" as string]: `${TRAVEL.nudge}px`,
  transitionProperty: "transform",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

// Sentence case, normal tracking, and small. Uppercase mono at wide tracking
// made a 276px-wide button out of three words and read as decoration rather
// than as a control.
//
// `active:` is deliberately the press state rather than an onClick handler:
// it engages on pointer-down and releases on pointer-up, which is the moment
// the visitor is asking to be acknowledged.
const base =
  "group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[14px] font-medium tracking-[-0.005em] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export default function HeroActions() {
  /**
   * The href stays real so the link is shareable, middle-clickable and legible
   * to a crawler; the click is intercepted so the travel goes through Lenis.
   * A native hash jump sets the document position behind the smooth scroller's
   * back, and the next frame Lenis eases the page back to where it thought it
   * was — which the reader sees as a stutter.
   */
  const goToHowItWorks = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    // Reduced motion: SmoothScroll never constructs Lenis under that
    // preference, so scrollTo() falls back to window.scrollTo with
    // behavior:"smooth" — an animated travel, which is the one thing the
    // preference asks us not to do. Fall through to the browser's own instant
    // hash jump, which is exactly what this link did before.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    scrollTo("#how-it-works");
  };

  return (
    <div
      data-hero-reveal
      data-hero-actions
      className="flex flex-wrap items-center gap-3"
    >
      {/* The filled pill. Hover is a step of opacity rather than a second
          colour: the fill is --text-primary, and the only honest lighter
          version of it on this page is itself over the white ground. */}
      <Link
        to="/contact"
        className={`${base} hover:opacity-[0.86] focus-visible:opacity-[0.86]`}
        style={{
          ...micro,
          background: "var(--text-primary)",
          color: "var(--background)",
          // Tailwind can't alpha-modify a var() colour, so the focus ring and
          // its offset are painted from real tokens explicitly.
          ["--tw-ring-offset-color" as string]: "var(--background)",
          ["--tw-ring-color" as string]: "var(--text-primary)",
        }}
      >
        Book a strategy session
        <Arrow
          className="group-hover:translate-x-[var(--nudge)] group-focus-visible:translate-x-[var(--nudge)]"
          style={nudge}
        />
      </Link>

      {/* The outlined pill. The border darkens to the ink on hover, which is
          the whole response — no fill change, no shadow, nothing that moves
          the edge the cursor is aiming at. */}
      <a
        href="#how-it-works"
        onClick={goToHowItWorks}
        className={`${base} border hover:border-[var(--text-primary)] focus-visible:border-[var(--text-primary)]`}
        style={{
          ...micro,
          borderColor: "var(--border-strong)",
          color: "var(--text-primary)",
          background: "var(--background)",
          ["--tw-ring-offset-color" as string]: "var(--background)",
          ["--tw-ring-color" as string]: "var(--text-primary)",
        }}
      >
        See how it works
        <Arrow
          className="group-hover:translate-y-[var(--nudge)] group-hover:rotate-90 group-focus-visible:translate-y-[var(--nudge)] group-focus-visible:rotate-90"
          style={nudge}
        />
      </a>
    </div>
  );
}
