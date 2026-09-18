import { useMemo } from "react";

import type { VideoTestimonial } from "@/features/testimonials/entities/testimonials";
import TestimonialAttribution from "@/features/testimonials/TestimonialAttribution";
import VslPlayer, { type VslConfig } from "@/shared/ui/vsl-player";

/**
 * A client video, set wide with its pull quote and credit beside it.
 *
 * The player is the site's own click-to-play facade, so a testimonial costs
 * the page one poster image and no third-party script until someone presses
 * play. It deliberately emits no VideoObject schema: the video supports the
 * page rather than being its subject, the same call /who-we-are makes for the
 * walkthrough.
 *
 * `reverse` swaps the columns on wide screens, so a run of several videos
 * alternates sides instead of stacking into one heavy left edge.
 */
export default function VideoTestimonialCard({
  testimonial,
  reverse = false,
}: {
  testimonial: VideoTestimonial;
  reverse?: boolean;
}) {
  // Memoised because the player keys an effect on this object's identity, and
  // a fresh literal every render would refetch a Vimeo still each time.
  const vsl = useMemo<VslConfig | null>(
    () =>
      testimonial.source
        ? {
            source: testimonial.source,
            title: `Video testimonial from ${testimonial.name}`,
            description: testimonial.quote ?? "",
            uploadDate: "",
            poster: testimonial.poster,
            runtime: testimonial.runtime,
          }
        : null,
    [testimonial],
  );

  return (
    <figure className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-12">
      <div className={reverse ? "lg:order-2 lg:col-span-7" : "lg:col-span-7"}>
        <VslPlayer vsl={vsl} label="Client video" flush />
      </div>

      <figcaption
        className={reverse ? "lg:order-1 lg:col-span-5" : "lg:col-span-5"}
      >
        {testimonial.quote && (
          <blockquote className="mb-10">
            <p
              className="font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(1.45rem, 2.3vw, 2rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              <span
                aria-hidden="true"
                className="mr-1 font-serif font-normal italic text-[var(--text-muted)]"
              >
                &ldquo;
              </span>
              {testimonial.quote}
            </p>
          </blockquote>
        )}
        <div className="border-t border-[var(--border)] pt-6">
          <TestimonialAttribution testimonial={testimonial} />
        </div>
      </figcaption>
    </figure>
  );
}
