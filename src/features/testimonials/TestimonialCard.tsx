import type { QuoteTestimonial } from "@/features/testimonials/entities/testimonials";
import TestimonialAttribution from "@/features/testimonials/TestimonialAttribution";

/**
 * One written testimonial, on the same card the process steps use: its own
 * surface, a hairline border, and a top edge caught a little brighter than the
 * rest of it.
 *
 * The site is monochrome, so there is no per-card tint any more and the cards
 * in a row are identical: what distinguishes them is the quote. The top edge
 * fades a neutral ink token out to nothing, which is structure rather than
 * colour, and it is the only gradient left on the card.
 */
export default function TestimonialCard({
  testimonial,
}: {
  testimonial: QuoteTestimonial;
}) {
  return (
    <figure
      className="relative flex h-full flex-col overflow-hidden rounded-2xl p-7 md:p-8"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--glass-inset-highlight)",
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, var(--border-strong) 0%, transparent 100%)",
        }}
      />

      {/* The mark is set in the hero's italic serif, so the one flourish on
          the card is one the site already owns. Quiet grey: it is decoration,
          and at this size full ink would outweigh the quote it opens. */}
      <span
        aria-hidden="true"
        className="relative block select-none font-serif italic"
        style={{
          color: "var(--text-muted)",
          fontSize: "3.75rem",
          lineHeight: 1,
          height: "2.25rem",
        }}
      >
        &ldquo;
      </span>

      <blockquote className="relative mt-4">
        <p
          className="leading-relaxed text-[var(--text-primary)]"
          style={{ fontSize: "1.05rem" }}
        >
          {testimonial.quote}
        </p>
      </blockquote>

      {/* mt-auto pins the credit to the bottom edge, so cards in a row agree
          on a baseline however unevenly their quotes run. */}
      <figcaption className="relative mt-auto pt-10">
        <TestimonialAttribution testimonial={testimonial} />
      </figcaption>
    </figure>
  );
}
