import { Link } from "react-router-dom";
import ScrollScene from "@/shared/motion/ScrollScene";

/**
 * Closing CTA. "Book a call" asks the visitor to give up thirty minutes for an
 * unspecified return, so this spells out exactly what those thirty minutes
 * produce and what they explicitly won't be. The deliverables are the offer.
 */
const deliverables = [
  "Identify your operational bottlenecks",
  "Estimate the ROI of automating them",
  "Show where AI actually creates value",
  "Recommend what should, and shouldn't, be automated",
];

export default function FinalCta() {
  return (
    <section className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <ScrollScene exitTo={1}>
          <div className="rounded-3xl border border-[var(--border-strong)] px-7 py-14 md:px-16 md:py-20">
            <p className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
              Free business intelligence session
            </p>

            <h2
              className="max-w-3xl font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 4rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.04,
              }}
            >
              Thirty minutes.
              <br />
              <span className="text-[var(--text-secondary)]">
                Then you'll know the number.
              </span>
            </h2>

            <div className="mt-12 grid gap-12 md:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  In that call we will
                </p>
                <ul className="mt-6 space-y-4">
                  {deliverables.map((d) => (
                    <li
                      key={d}
                      className="flex gap-3 leading-relaxed text-[var(--text-primary)]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]"
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:pl-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  What it isn't
                </p>
                <p className="mt-6 leading-relaxed text-[var(--text-secondary)]">
                  No sales pitch. No generic AI presentation. A straight
                  assessment of where your business can save time or make more
                  money, and an honest answer if that turns out to be nowhere.
                </p>

                <div className="mt-10">
                  <Link
                    to="/contact"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--text-primary)] px-8 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
                  >
                    Book your strategy session
                  </Link>
                  <p className="mt-5 text-xs leading-relaxed text-[var(--text-secondary)]">
                    You leave with the roadmap whether or not you hire us.{" "}
                    <Link
                      to="/privacy"
                      className="underline underline-offset-4 transition-opacity hover:opacity-70"
                    >
                      How we handle your data
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollScene>
      </div>
    </section>
  );
}
