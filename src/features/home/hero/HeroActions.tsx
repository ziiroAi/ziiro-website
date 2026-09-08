import type { CSSProperties, MouseEvent } from "react";
import { Link } from "react-router-dom";

import { scrollTo } from "@/shared/motion/SmoothScroll";
import { CSS_EASE, DURATION, TRAVEL } from "@/shared/motion/tokens";

/**
 * The two things a visitor can do from the hero. Both already exist on the
 * site — the strategy session is the standing offer, and "how it works" is the
 * section directly below — so neither button promises anything new.
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
    "transform, background-color, border-color, box-shadow, color",
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
  "group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] px-6 text-[14px] font-medium tracking-[-0.005em] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

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
      className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
    >
      <Link
        to="/contact"
        className={base}
        style={{
          ...micro,
          background: "var(--hero-ink)",
          color: "#0b0714",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 40px -14px rgba(255,224,196,0.5)",
          // Tailwind can't alpha-modify a var() colour, so the focus ring
          // offset is painted against the hero ground explicitly.
          ["--tw-ring-offset-color" as string]: "#000000",
          ["--tw-ring-color" as string]: "rgba(255,224,196,0.9)",
        }}
      >
        Book a strategy session
        <Arrow
          className="group-hover:translate-x-[var(--nudge)] group-focus-visible:translate-x-[var(--nudge)]"
          style={nudge}
        />
      </Link>

      <a
        href="#how-it-works"
        onClick={goToHowItWorks}
        className={`${base} border`}
        style={{
          ...micro,
          borderColor: "var(--hero-line)",
          color: "var(--hero-ink)",
          background:
            "linear-gradient(180deg, rgba(242,238,233,0.045), rgba(242,238,233,0.015))",
          ["--tw-ring-offset-color" as string]: "#000000",
          ["--tw-ring-color" as string]: "rgba(255,138,61,0.85)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,138,61,0.5)";
          e.currentTarget.style.boxShadow =
            "0 0 30px -8px rgba(255,138,61,0.4), inset 0 0 24px -14px rgba(255,138,61,0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--hero-line)";
          e.currentTarget.style.boxShadow = "none";
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
