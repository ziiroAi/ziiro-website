import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { STAGGER } from "@/shared/motion/tokens";

/**
 * The company in four rows, and the first thing after the hero.
 *
 * WHY IT SITS ABOVE THE ORIGIN STORY. It used to be the third thing on the
 * page, below two paragraphs of prose, which meant the only genuinely
 * scannable content here was the last thing a reader reached. Scanning the
 * page's large type gave you four display headlines and not one concrete fact
 * about the company. These four rows are what answer "who is this", so they
 * now come before the narrative that explains why. Nothing was cut to do it.
 *
 * Every line restates something the site already publishes (the Organization
 * data in index.html), so keep them in step.
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
    // Its own section rather than a div inside the origin story, because a
    // separated group is the thing that was missing. No top hairline: the
    // hero's own animated rule already closes the block above this one, and a
    // second line 80px below it reads as a mistake rather than as structure.
    <section aria-labelledby="at-a-glance" className="pb-24 pt-16 md:pb-32 md:pt-20">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <MotionReveal stagger={STAGGER.card}>
          <MotionRevealItem>
            {/* An h2 now, not an h3. It is a sibling of the other sections
                rather than a child of the origin story, and an orphan h3 at
                the top level would misreport the page outline to anything
                reading structure instead of pixels. It stays visually quiet:
                the hierarchy here is in the outline, not in the type size. */}
            <h2
              id="at-a-glance"
              className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              ( Ziiro at a glance )
            </h2>
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
    </section>
  );
}
