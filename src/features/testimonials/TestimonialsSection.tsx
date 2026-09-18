import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";

import {
  visibleTestimonials,
  type QuoteTestimonial,
  type VideoTestimonial,
} from "@/features/testimonials/entities/testimonials";
import TestimonialCard from "@/features/testimonials/TestimonialCard";
import VideoTestimonialCard from "@/features/testimonials/VideoTestimonialCard";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, STAGGER, TRAVEL } from "@/shared/motion/tokens";

export interface TestimonialsSectionProps {
  /**
   * The display headline. A line break ("\n") splits it into the site's
   * two-tone treatment: the first line in full ink, the rest a step quieter.
   */
  heading?: string;
  /** The mono label above the headline. */
  eyebrow?: string;
  /**
   * Where the closing button points. Root-relative paths route in-app and
   * http(s) URLs open in a new tab. Leave it out and the section ends on the
   * testimonials themselves.
   */
  ctaHref?: string;
}

const DEFAULT_HEADING = "Don't take our word for it.\nTake theirs.";

const micro: CSSProperties = {
  transitionProperty: "opacity",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

/** Same arrow as the closing CTA on the homepage: it travels TRAVEL.nudge and
 *  the button holds still, so the target never moves out from under the
 *  cursor. Zeroed under reduced motion rather than left untransitioned. */
function Arrow({ nudge }: { nudge: boolean }) {
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
      className="group-hover:translate-x-[var(--nudge)] group-focus-visible:translate-x-[var(--nudge)]"
      style={{
        transitionProperty: "transform",
        transitionDuration: `${DURATION.micro}s`,
        transitionTimingFunction: CSS_EASE.out,
        ["--nudge" as string]: nudge ? `${TRAVEL.nudge}px` : "0px",
      }}
    >
      <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
    </svg>
  );
}

/** An in-app route gets a router Link so it doesn't reload the page; anything
 *  else is a plain anchor, and an external booking page opens in a new tab so
 *  the visitor keeps their place here. */
function CtaLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link to={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className={className}
      style={style}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}

/**
 * Testimonials: client videos first, set wide, then a grid of written quotes.
 *
 * Everything derives from `entities/testimonials.ts`. When that holds nothing
 * showable, which in production means until the first real entry lands, this
 * renders null and the page closes up around it. Nothing on the page ever
 * claims a client it doesn't have.
 *
 * The section brings its own container and horizontal padding, so mount it
 * outside a page's max-width wrapper, not inside one.
 */
export default function TestimonialsSection({
  heading = DEFAULT_HEADING,
  eyebrow = "Testimonials",
  ctaHref,
}: TestimonialsSectionProps) {
  // Before the early return: hooks must run the same way on every render.
  const shouldReduce = useReducedMotion();

  const list = visibleTestimonials();
  if (list.length === 0) return null;

  const videos = list.filter((t): t is VideoTestimonial => t.kind === "video");
  const quotes = list.filter((t): t is QuoteTestimonial => t.kind === "quote");
  // People, not entries: one client can give both a video and a quote. Derived
  // from the data so the figure can never run ahead of it.
  const people = new Set(list.map((t) => t.name)).size;

  const [titleA, ...rest] = heading.split("\n");
  const titleB = rest.join(" ").trim();

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="pb-24 md:pb-32"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* The same header every numbered section uses, less the number: this
            section mounts on more than one page, at a different position on
            each, so any index it carried would be wrong somewhere. */}
        <MotionReveal
          stagger={STAGGER.line}
          className="border-t border-[var(--border)] pt-6"
        >
          <MotionRevealItem className="mb-10 flex items-center justify-between gap-4">
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
              {eyebrow}
            </p>
            <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
              [ {String(people).padStart(2, "0")}{" "}
              {people === 1 ? "person" : "people"} ]
            </p>
          </MotionRevealItem>

          <MotionRevealItem>
            <h2
              id="testimonials-heading"
              className="font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.04,
              }}
            >
              {titleA}
              {titleB && (
                <>
                  <br />
                  {/* Two-tone by weight of ink, not by hue. The second line
                      steps back to --text-secondary, which also puts the
                      descenders back: they were being clipped by the
                      background-clip box this used to need. */}
                  <span className="text-[var(--text-secondary)]">{titleB}</span>
                </>
              )}
            </h2>
          </MotionRevealItem>
        </MotionReveal>

        {/* mt-10, not the grid's mt-16: the player's frame brings its own top
            padding, and the two should land the same distance under the
            headline. */}
        {videos.length > 0 && (
          <div className="mt-10 space-y-16 md:space-y-24">
            {videos.map((t, i) => (
              <MotionReveal key={t.id}>
                <VideoTestimonialCard testimonial={t} reverse={i % 2 === 1} />
              </MotionReveal>
            ))}
          </div>
        )}

        {quotes.length > 0 && (
          // Per-card delays by column rather than framer's staggerChildren,
          // which measured as no stagger at all on the process steps. A lone
          // last card on the two-column row spans both, so the grid never ends
          // on a hole.
          <ul
            role="list"
            className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {quotes.map((t, i) => (
              <MotionReveal
                key={t.id}
                as="li"
                delay={(i % 3) * STAGGER.card}
                className="md:odd:last:col-span-2 lg:odd:last:col-span-1"
              >
                <TestimonialCard testimonial={t} />
              </MotionReveal>
            ))}
          </ul>
        )}

        {ctaHref && (
          <MotionReveal className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-[var(--border)] pt-10 md:flex-row md:items-center">
            <p className="max-w-md leading-relaxed text-[var(--text-secondary)]">
              Ready to look at your own numbers?
            </p>
            <CtaLink
              href={ctaHref}
              className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[var(--text-primary)] px-8 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-85"
              style={micro}
            >
              Book a consultation
              <Arrow nudge={!shouldReduce} />
            </CtaLink>
          </MotionReveal>
        )}
      </div>
    </section>
  );
}
