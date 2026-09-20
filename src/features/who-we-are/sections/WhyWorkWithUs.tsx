import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";
import SectionHeader from "@/shared/ui/section-header";

/**
 * Three differentiators, down from six.
 *
 * The other three were not weak, they were someone else's. "Simple beats
 * clever" and "The mechanism, not the value" are two of the three principles
 * /mission now owns outright, and repeating them here is the duplication this
 * job exists to remove. "We use what we build" made a claim the site cannot
 * evidence anywhere. "You keep the work" survives as a clause in the origin
 * section rather than as a card of its own.
 *
 * What is left is the three the brief specifies, and each says something no
 * other page says: the order of work, who does it, and what is actually the
 * advantage.
 */
const reasons = [
  {
    label: "Numbers first",
    body: "We understand the economics before recommending the system.",
  },
  {
    label: "Built by the people who scope it",
    body: "No sales-team-to-junior-team handoff. The person who maps your process is the person who ships it.",
  },
  {
    label: "Model agnostic",
    body: "The model is replaceable. Your workflow, business context and system design are the advantage.",
  },
];

export default function WhyWorkWithUs({ index }: { index: string }) {
  return (
    <section className="pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* The sub is gone and the title no longer says "the people who scope
            it are the people who build it": that is now one of the three cards
            below, and the section was making the same point three times over,
            in the title, the sub and a card. */}
        <SectionHeader
          index={index}
          label="Why Work With Us"
          meta="03 reasons"
          titleA="Three things"
          titleB="that actually differ."
        />

        <MotionReveal
          stagger={STAGGER.card}
          className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {reasons.map((r) => (
            <MotionRevealItem key={r.label}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
                <h3 className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {r.label}
                </h3>
                <p
                  className="mt-6 font-display font-medium text-[var(--text-primary)]"
                  style={{ fontSize: "clamp(1.1rem, 1.5vw, 1.3rem)", letterSpacing: "-0.02em", lineHeight: 1.35 }}
                >
                  {r.body}
                </p>
              </div>
            </MotionRevealItem>
          ))}
        </MotionReveal>
      </div>
    </section>
  );
}
