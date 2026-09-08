import SectionHeader from "@/shared/ui/section-header";
import MotionReveal from "@/shared/motion/MotionReveal";

/**
 * How the engagement runs, in five steps a visitor can read in under twenty
 * seconds. This replaces the seven-phase orbital diagram, which needed its own
 * scroll interaction and a spiral background to explain the same idea. The
 * long-form version still lives on /process.
 *
 * Each step carries an accent, and the five of them walk the site's duotone
 * from warm to cool in the same order the system directory's departments do.
 * That is not decoration: the section is a *sequence*, and a ramp is the
 * cheapest way to say so without drawing arrows. Reading the colour tells you
 * roughly where in the process you are before you have read a word.
 */
const steps = [
  {
    n: "01",
    title: "Discover the business",
    body: "Sessions on revenue, operations, and cost structure. How the company actually runs, not how the org chart says it does.",
    accent: "#FF8A3D",
  },
  {
    n: "02",
    title: "Find the bottlenecks",
    body: "Every process step mapped, with the manual work, repeated tasks, and handoffs flagged where the hours disappear.",
    accent: "#FF6A55",
  },
  {
    n: "03",
    title: "Measure the ROI",
    body: "Monthly savings, build cost, and break-even for each opportunity. The numbers decide what gets built, and what doesn't.",
    accent: "#E8598C",
  },
  {
    n: "04",
    title: "Build the systems",
    body: "Agents, loops, and dashboards shipped into your stack. Working systems, not slide decks.",
    accent: "#B061D8",
  },
  {
    n: "05",
    title: "Optimize continuously",
    body: "Each system tracks its own outcomes and gets tuned against them, so performance compounds after launch.",
    accent: "#8C6AFF",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="02"
          label="How It Works"
          meta="five steps"
          titleA="Understand first."
          titleB="Build second."
          sub="Most AI projects start by picking a tool. Ours start by finding out what a saved hour is actually worth to you."
        />

        {/* One stagger group rather than five independent scroll triggers. The
            steps are numbered because they happen in an order, so they should
            arrive in that order too — and on a five-wide row every card shares
            a Y position, so five separate triggers would all fire on the same
            frame and the ordering would be lost entirely.

            These are real, separate cards now. They used to be cells in a
            `gap-px` grid that faked its hairlines by letting a border-coloured
            parent show through 1px gaps — which meant every cell needed a
            permanently opaque background, which meant the cards could not fade
            in at all. Only their text could, and that is why the section never
            looked like it was arriving. Losing the trick costs one CSS
            technique and buys the whole effect.

            The sequence is an explicit per-card delay rather than framer's
            `staggerChildren`. The container version measured as no stagger at
            all — all five cards crossed half opacity on the same frame —
            because the parent drives its variant from `whileInView`, and a
            gesture-driven variant does not reliably propagate stagger timing
            down to children. An index multiplied by a constant cannot fail to
            work and can be read off the page. */}
        <ol className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <MotionReveal
              key={step.n}
              as="li"
              delay={i * 0.11}
              className="sm:last:col-span-2 lg:last:col-span-1"
            >
              <article
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl p-7"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--glass-inset-highlight)",
                }}
              >
                {/* The step's own light, pooled behind its number. Low enough
                    to read as the card being lit rather than as a coloured
                    panel — the copy still has to be the loudest thing here. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${step.accent}26 0%, transparent 70%)`,
                  }}
                />

                {/* The rule across the top. It fades out to the right, so five
                    of them in a row read as one line being handed along rather
                    than five separate lids. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, ${step.accent} 0%, ${step.accent}40 55%, transparent 100%)`,
                  }}
                />

                <p
                  className="relative font-mono text-[11px] font-bold uppercase"
                  style={{ letterSpacing: "0.25em", color: step.accent }}
                >
                  {step.n}
                </p>

                <h3
                  className="relative mt-6 font-display font-semibold text-[var(--text-primary)]"
                  style={{
                    fontSize: "1.2rem",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.25,
                  }}
                >
                  {step.title}
                </h3>

                <p className="relative mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.body}
                </p>

                {/* A tick pinned to the bottom of the card by mt-auto, so the
                    five agree on a baseline however unevenly their copy runs —
                    the ragged bottom edge was most of why the old row looked
                    unfinished. */}
                <span
                  aria-hidden="true"
                  className="relative mt-auto block h-px w-8"
                  style={{
                    background: `linear-gradient(90deg, ${step.accent}66, transparent)`,
                  }}
                />
              </article>
            </MotionReveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
