import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";

import MotionReveal from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, TRAVEL } from "@/shared/motion/tokens";
import SplitHeadline from "@/shared/components/SplitHeadline";

/**
 * Closing CTA. "Book a call" asks the visitor to pay for an hour against an
 * unspecified return, so this spells out exactly what that hour produces and
 * what it explicitly won't be. The deliverables are the offer.
 */
const deliverables = [
  "Identify your operational bottlenecks",
  "Estimate the ROI of automating them",
  "Show where AI actually creates value",
  "Recommend what should, and shouldn't, be automated",
];

/**
 * Hover on the two links in the closing panel, at DURATION.micro. This is the
 * last control on the page and the one the whole page exists to get clicked;
 * anything slower than instant reads as the button thinking about it rather
 * than answering, which is the wrong note to end a sales page on.
 */
const micro: CSSProperties = {
  transitionProperty: "opacity",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

/** Matches the hero's primary button: the arrow travels TRAVEL.nudge and the
 *  button itself holds still, so the target never moves out from under the
 *  cursor while the visitor is aiming at it. */
const nudgeBase: CSSProperties = {
  transitionProperty: "transform",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

function Arrow({ nudge }: { nudge: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="group-hover:translate-x-[var(--nudge)] group-focus-visible:translate-x-[var(--nudge)]"
      style={{
        ...nudgeBase,
        // Zeroed rather than left untransitioned under reduced motion: an
        // instant 3px jump on hover is the same distraction the preference
        // exists to remove, only harsher.
        ["--nudge" as string]: nudge ? `${TRAVEL.nudge}px` : "0px",
      }}
    >
      <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
    </svg>
  );
}

export default function FinalCta() {
  const shouldReduce = useReducedMotion();

  return (
    <section className="relative px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        {/* The closing ask arrives as one panel on DURATION.statement, rather
            than as a stagger of its parts. Both halves of that are the same
            decision: this is a single question, and sequencing the eyebrow, the
            headline, the list and the button only delays the moment the button
            is there to be clicked. The longer duration buys the panel weight
            without costing the visitor anything, because the whole thing is
            legible from the first frames of an expo-out.

            It was a scrub-linked ScrollScene before, which meant the panel's
            opacity was still being recomputed while someone read the bullets. */}
        <MotionReveal
          duration={DURATION.statement}
          className="rounded-3xl border border-[var(--border-strong)] px-7 py-14 md:px-16 md:py-20"
        >
          {/* ITEM 10, JAKOB'S LAW, APPLIED TO THE WHOLE CLOSING MOMENT.
              This eyebrow read "Hourly business intelligence session", which
              names the offer in words no visitor arrives already knowing.
              "Strategy session" is the term people search for and the one the
              review itself suggests. "Hourly" stays: how this is billed is a
              commercial position (review item 21) and not mine to change. */}
          <p className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Hourly strategy session
          </p>

          {/* The headline was "One focused hour. / Then you'll know the
              number." A duration is not an offer and "the number" is a riddle,
              so the closing moment stated neither an action nor an outcome and
              left the button to do all the work alone.

              It states the outcome plainly now, and the button beneath states
              the action, which is the division the review asks for: surrounding
              copy carries the personality, the control names the deed. Both
              halves are backed by the list directly below rather than being
              claims on their own: "what to automate first" is the bottleneck
              line, "what it will save you" is the ROI line. */}
          {/* max-w-4xl, not the 3xl this had: the old headline was four words
              and never tested the measure. A lead long enough to say something
              wrapped inside 3xl and orphaned "first." onto a line of its own,
              which the screenshot caught and no check would have. */}
          <h2
            className="max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
            }}
          >
            <SplitHeadline
              lead="Know what to automate first."
              tail="And what it will save you."
            />
          </h2>

          <div className="mt-12 grid gap-12 md:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                In that hour we will
              </p>
              <ul className="mt-6 space-y-4">
                {deliverables.map((d) => (
                  <li
                    key={d}
                    className="flex gap-3 leading-relaxed text-[var(--text-primary)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
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
                  to="/book-a-call"
                  className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[var(--text-primary)] px-8 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-85"
                  style={micro}
                >
                  Book a call
                  <Arrow nudge={!shouldReduce} />
                </Link>
                {/* 13px at phone width, not 12. This is two real sentences, not
                    a micro-label, and reading copy under 13px on a phone is the
                    thing the mobile pass flagged. Desktop keeps 12px, where the
                    viewing distance and the column width both earn it. */}
                <p className="mt-5 text-[13px] leading-relaxed text-[var(--text-secondary)] md:text-xs">
                  You leave with the roadmap whether or not you hire us to
                  build it.{" "}
                  <Link
                    to="/privacy"
                    className="underline underline-offset-4 hover:opacity-70"
                    style={micro}
                  >
                    How we handle your data
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
