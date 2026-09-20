import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";

/**
 * The company in four rows, for the reader who wants the facts next to the
 * story. Every line restates something the site already publishes (the
 * Organization data in index.html), so keep them in step.
 *
 * "Based in" says India, not "Haryana, India". The state was doing no
 * commercial work: nothing on the site sells to Haryana specifically, and the
 * extra precision only narrows a company that says in the next row that it
 * works with teams worldwide. Reverse it only if Haryana starts mattering
 * commercially.
 */
const facts = [
  { term: "What", detail: "Business-intelligence-first AI consultancy." },
  { term: "Built for", detail: "Founder-led businesses." },
  { term: "Based in", detail: "India." },
  { term: "Working with", detail: "Teams worldwide." },
];

export default function AtAGlance() {
  return (
    <div className="mt-20">
      <MotionReveal stagger={STAGGER.card}>
        <MotionRevealItem>
          <h3 className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            ( Ziiro at a glance )
          </h3>
        </MotionRevealItem>

        <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <MotionRevealItem key={f.term} className="border-t border-[var(--border)] pt-6">
              <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                {f.term}
              </dt>
              <dd
                className="mt-4 font-display font-medium text-[var(--text-primary)]"
                style={{ fontSize: "clamp(1.15rem, 1.5vw, 1.35rem)", letterSpacing: "-0.02em", lineHeight: 1.35 }}
              >
                {f.detail}
              </dd>
            </MotionRevealItem>
          ))}
        </dl>
      </MotionReveal>
    </div>
  );
}
