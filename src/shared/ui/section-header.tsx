import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";
import SplitHeadline from "@/shared/components/SplitHeadline";

/**
 * Shared editorial section header: hairline rule, dot marker, mono
 * index/label, bracketed meta on the right, and a tight two-tone
 * display headline set in Inter. Keeps every section speaking the
 * same visual language as the dot-art world and nav wordmark.
 */
export default function SectionHeader({
  index,
  label,
  meta,
  titleA,
  titleB,
  sub,
}: {
  index: string;
  label: string;
  meta?: string;
  /** Optional: omit both title lines and the header is just its eyebrow row. */
  titleA?: string;
  titleB?: string;
  sub?: string;
}) {
  return (
    // One reveal, inherited by every section on the site: the mono label first,
    // then the headline, then the description. Reading order and arrival order
    // are the same thing, which is the whole point of staggering it rather than
    // fading the block in as one lump.
    //
    // This used to be a scrub-linked ScrollScene, which meant the heading dimmed
    // again every time the reader scrolled back up past it. A header that
    // re-hides is the fastest way to make a smooth site an irritating one, so
    // it now fires once (MotionReveal's default viewport) and stays put.
    <MotionReveal
      stagger={STAGGER.line}
      className="border-t border-[var(--border)] pt-6"
    >
      <MotionRevealItem className="mb-10 flex items-center justify-between gap-4">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          Sec. {index} / {label}
        </p>
        {meta && (
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
            [ {meta} ]
          </p>
        )}
      </MotionRevealItem>

      {/* A section can run without a headline: the directory does, where the
          eyebrow and the counted sentence carry it and a display title was one
          voice too many. No empty <h2> is left behind when it does. */}
      {titleA && (
      <MotionRevealItem>
        <h2
          className="font-display font-semibold text-[var(--text-primary)]"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.04,
          }}
        >
          {/* The two lines go through SplitHeadline so one real space joins
              them in the text stream. Inlined here, `{titleA}<br /><span>
              {titleB}</span>` put nothing between the two text runs: <br>
              contributes no characters, so textContent came back glued, as in
              "The model isn'tthe advantage." It looked correct, because block
              layout does not care, but every consumer that reads text rather
              than pixels got the words run together, and this one component
              sits behind roughly two dozen section headings.

              The second line is the quieter half of the pairing, and it says so
              in ink rather than in hue: SplitHeadline paints it
              --text-secondary, the same as the span this replaced. That used to
              be a duotone through background-clip: text, which is why every
              section title on the site read orange-to-violet, and why the line
              needed padding underneath to stop the clip eating its descenders.
              A plain colour needs neither. */}
          {titleB ? <SplitHeadline lead={titleA} tail={titleB} /> : titleA}
        </h2>
      </MotionRevealItem>
      )}

      {sub && (
        <MotionRevealItem>
          <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
            {sub}
          </p>
        </MotionRevealItem>
      )}
    </MotionReveal>
  );
}
