import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import { CSS_EASE, DURATION } from "@/shared/motion/tokens";

/**
 * The two things a visitor can do from the hero, drawn to the reference: a
 * black pill and, beside it, a cobalt text link with a north-east arrow.
 *
 * The primary label is "Book a strategy session" rather than the old "Book a
 * call", because that is what the reference says and it is not new copy: it is
 * the name /book-a-call already gives itself, in its h1 and its title. The
 * destination is unchanged. The navbar keeps "Book a Call" for the same route,
 * which is the reference's own pairing.
 *
 * Sizes live in index.css (`.cb-cta`, `.cb-link`), because on desktop they are
 * reference pixels times --u, which Tailwind cannot express. The pill's soft
 * shadow, the link's 2px drop and the larger, 2px-stroke arrow are measured
 * against the reference picture: an 18px label on a 32px inset, a pill shadow
 * of ~1.5/255 darkness just outside it, a 10px arrow on a 2px stroke. The
 * shadow is a Tailwind `shadow-*` class, not CSS, so it composes with the
 * focus ring (both are box-shadow) instead of replacing it.
 *
 * Both controls are at least 44px tall. The link's text is 17px, so it gets
 * the height from `min-h-[44px]` on an inline-flex box; the ink, which is what
 * the reference comparison measures, does not move.
 */

/** Hover and focus resolve in DURATION.micro, like every control on the site. */
const micro: CSSProperties = {
  transitionProperty: "opacity, color",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

export default function HeroActions() {
  return (
    <div
      data-hero-reveal
      data-hero-actions
      className="cb-actions flex flex-wrap items-center"
    >
      <Link
        to="/book-a-call"
        data-hero="cta-primary"
        className="cb-cta inline-flex items-center justify-center whitespace-nowrap rounded-full font-hero-sans font-medium text-white shadow-[0_1px_6px_rgba(14,14,16,0.08)] hover:opacity-[0.86] focus-visible:opacity-[0.86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          ...micro,
          background: "var(--cb-cta)",
          ["--tw-ring-color" as string]: "var(--cb-ink)",
          ["--tw-ring-offset-color" as string]: "#FFFFFF",
        }}
      >
        Book a strategy session
      </Link>

      {/* The engagement runs end to end at /docs#lifecycle, which is exactly
          what this label promises. ScrollToTop owns landing on the hash after
          the route change. */}
      <Link
        to="/docs#lifecycle"
        data-hero="cta-secondary"
        // Focus keeps the underline and adds a cobalt ring, 4px off the box,
        // so a keyboard user can find it at a glance (the underline alone was
        // a few pixels). `-mx-1 px-1` only gives the ring room beside the
        // text; the ink does not move.
        className="cb-link group relative top-[2px] -mx-1 inline-flex min-h-[44px] items-center gap-[0.3em] whitespace-nowrap rounded-sm px-1 font-hero-sans hover:opacity-80 focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-cobalt-ink)] focus-visible:ring-offset-4 focus-visible:ring-offset-white"
        style={{ ...micro, color: "var(--cb-cobalt-ink)", letterSpacing: "0.012em" }}
      >
        See how it works
        <ArrowUpRight
          aria-hidden="true"
          strokeWidth={2}
          className="h-[1.15em] w-[1.15em] shrink-0"
        />
      </Link>
    </div>
  );
}
