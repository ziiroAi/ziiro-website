import SectionHeader from "@/shared/ui/section-header";
import ScrollScene from "@/shared/motion/ScrollScene";

/**
 * How the engagement runs, in five steps a visitor can read in under twenty
 * seconds. This replaces the seven-phase orbital diagram, which needed its own
 * scroll interaction and a spiral background to explain the same idea. The
 * long-form version still lives on /process.
 */
const steps = [
  {
    n: "01",
    title: "Discover the business",
    body: "Sessions on revenue, operations, and cost structure. How the company actually runs, not how the org chart says it does.",
  },
  {
    n: "02",
    title: "Find the bottlenecks",
    body: "Every process step mapped, with the manual work, repeated tasks, and handoffs flagged where the hours disappear.",
  },
  {
    n: "03",
    title: "Measure the ROI",
    body: "Monthly savings, build cost, and break-even for each opportunity. The numbers decide what gets built, and what doesn't.",
  },
  {
    n: "04",
    title: "Build the systems",
    body: "Agents, loops, and dashboards shipped into your stack. Working systems, not slide decks.",
  },
  {
    n: "05",
    title: "Optimize continuously",
    body: "Each system tracks its own outcomes and gets tuned against them, so performance compounds after launch.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          index="01"
          label="How It Works"
          meta="five steps"
          titleA="Understand first."
          titleB="Build second."
          sub="Most AI projects start by picking a tool. Ours start by finding out what a saved hour is actually worth to you."
        />

        <ol className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.n} className="bg-[var(--background)]">
              {/* Staggered by travel distance rather than by delay: with a
                  scrub-linked reveal there is no timeline to offset, so the
                  cascade comes from each step having further to come. */}
              <ScrollScene rise={14 + i * 7} exitTo={1}>
                <div className="flex h-full flex-col p-7">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {step.n}
                  </p>
                  <h3
                    className="mt-6 font-display font-semibold text-[var(--text-primary)]"
                    style={{ fontSize: "1.2rem", letterSpacing: "-0.02em", lineHeight: 1.25 }}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {step.body}
                  </p>
                </div>
              </ScrollScene>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
