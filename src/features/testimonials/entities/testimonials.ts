import type { VslSource } from "@/shared/ui/vsl-player";

/**
 * ── TESTIMONIALS ──────────────────────────────────────────────────────
 * The one file to edit. Every quote card and client video on /who-we-are and
 * /contact derives from `TESTIMONIALS`, and the section renders nothing at all
 * until at least one real entry exists.
 *
 * Rules for a real entry:
 *   - A real person, their real words, credited the way they agreed to be.
 *     Trim for length if you must; never write, polish or "improve" a quote.
 *   - Leave `placeholder` off. That flag is the only thing standing between a
 *     sample and a visitor.
 *   - Photos go in public/testimonials/ and should be square (400x400 is
 *     plenty). Without one, the card draws the person's initials.
 *
 * The `placeholder: true` samples below are layout scaffolding, and they are
 * written to be unmistakable as such. They render under `npm run dev` only:
 * `import.meta.env.DEV` is replaced at build time, so the production bundle and
 * the SSR prerender both see a constant `false` and drop every sample. Delete
 * them once real entries land.
 */

interface TestimonialBase {
  /** Stable React key. Kebab-case, unique across the list. */
  id: string;
  /** Full name, exactly as the person agreed to be credited. */
  name: string;
  /** Their role, e.g. "Founder". */
  role: string;
  company?: string;
  /** Root-relative square photo, e.g. "/testimonials/jane-doe.jpg". */
  photo?: string;
  /** Layout scaffolding. Renders in dev only, never in a production build. */
  placeholder?: boolean;
}

export interface QuoteTestimonial extends TestimonialBase {
  kind: "quote";
  /** Their words, verbatim. Two to four sentences reads best on a card. */
  quote: string;
}

export interface VideoTestimonial extends TestimonialBase {
  kind: "video";
  /**
   * Where the recording lives. Same shape the site's VSL player takes, so
   * YouTube, Vimeo and self-hosted files all work. `null` is for placeholders
   * only: a real entry without a source is hidden rather than shipped as an
   * empty frame.
   */
  source: VslSource | null;
  /** One line from the recording, verbatim, set beside the player. */
  quote?: string;
  /** Human-readable runtime shown on the frame, e.g. "2 min". */
  runtime?: string;
  /** Poster override. YouTube and Vimeo stills resolve on their own. */
  poster?: string;
}

export type Testimonial = QuoteTestimonial | VideoTestimonial;

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "sample-video",
    kind: "video",
    placeholder: true,
    name: "Sample Client",
    role: "Operations Lead",
    company: "Company Name",
    source: null,
    runtime: "2 min",
    quote:
      "Sample pull quote, for layout only. One line lifted verbatim from the recording.",
  },
  {
    id: "sample-quote-medium",
    kind: "quote",
    placeholder: true,
    name: "Sample Client",
    role: "Founder",
    company: "Company Name",
    quote:
      "Sample quote, for layout only. A real client's words go here, verbatim: what the problem was, what changed, and what working together was like.",
  },
  {
    id: "sample-quote-short",
    kind: "quote",
    placeholder: true,
    name: "Second Sample",
    role: "Managing Director",
    quote: "Sample quote. One short line from a real client.",
  },
  {
    id: "sample-quote-long",
    kind: "quote",
    placeholder: true,
    name: "Third Sample",
    role: "Head of Growth",
    company: "Company Name",
    quote:
      "Sample quote, for layout only. This one runs long on purpose, to check how a card holds up when a client says more: the situation before, what the engagement involved week to week, what they would tell someone deciding whether to book, and anything that surprised them along the way.",
  },
];

/**
 * Whether an entry may be shown in the current build. Samples are dev-only,
 * and a real video with nothing to play is held back rather than rendered as a
 * blank frame in front of a visitor.
 */
export const isVisible = (t: Testimonial): boolean => {
  if (t.placeholder) return import.meta.env.DEV;
  if (t.kind === "video" && !t.source) return false;
  return true;
};

export const visibleTestimonials = (
  list: Testimonial[] = TESTIMONIALS,
): Testimonial[] => list.filter(isVisible);
