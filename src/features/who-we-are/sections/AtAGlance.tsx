import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";

/**
 * The company in three lines, for the reader who wants the facts next to the
 * story. A block inside the page's Who We Are section, not a section of its
 * own. Every line restates something the site already publishes (the
 * Organization data in index.html), so keep them in step. What we build is not
 * here because the next section is about exactly that.
 */
const facts = [
  // Was "What we are: A business-intelligence-first AI consultancy." That is
  // the exact sentence three other pages were also opening with, and naming the
  // category says less than naming the act. This states what actually happens.
  { term: "What we do", detail: "Measure an operation, then automate the part worth automating." },
  { term: "Who we work with", detail: "Startups and founder-led teams." },
  { term: "Where we are", detail: "Haryana, India, working with teams worldwide." },
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

        <dl className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-3">
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
