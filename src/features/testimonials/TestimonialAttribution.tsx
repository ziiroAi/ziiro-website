import type { Testimonial } from "@/features/testimonials/entities/testimonials";

/** Up to two initials, for the monogram drawn when there is no photo. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

/**
 * Who said it: photo or monogram, name, and role. Shared by the quote card and
 * the video block so a person is credited the same way wherever they appear.
 *
 * The photo carries an empty alt because the name sits right beside it; a
 * screen reader would otherwise announce every person twice.
 */
export default function TestimonialAttribution({
  testimonial,
}: {
  testimonial: Testimonial;
}) {
  const { name, role, company, photo, placeholder } = testimonial;

  return (
    <div className="flex items-center gap-4">
      {photo ? (
        <img
          src={photo}
          alt=""
          aria-hidden="true"
          width={44}
          height={44}
          loading="lazy"
          decoding="async"
          className="h-11 w-11 shrink-0 rounded-full object-cover grayscale"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] font-mono text-[11px] font-bold text-[var(--text-secondary)]"
        >
          {initials(name)}
        </span>
      )}

      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className="font-display font-semibold text-[var(--text-primary)]"
            style={{ fontSize: "1rem", letterSpacing: "-0.01em" }}
          >
            {name}
          </span>
          {/* Samples only exist in dev, and this makes sure nobody reviewing a
              dev build, or a screenshot of one, mistakes a sample for a
              client. It rides the name line so the role keeps its width. */}
          {placeholder && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
              [ Sample ]
            </span>
          )}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          {company ? `${role}, ${company}` : role}
        </p>
      </div>
    </div>
  );
}
