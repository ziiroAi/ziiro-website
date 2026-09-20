import { Link } from "react-router-dom";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, STAGGER } from "@/shared/motion/tokens";
import SplitHeadline from "@/shared/components/SplitHeadline";

const emails = ["aniket@ziiro.work", "govind@ziiro.work"];

/** Links here only change colour or opacity, at the house micro duration. The
 *  curve is applied inline because Tailwind's transition utilities ship their
 *  own timing function and, being classes, outrank the zero-specificity
 *  :where() rule in index.css that puts everything else on expo-out. */
const microTransition = {
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.outExpo,
} as const;

/**
 * The page's closing ask: book a consultation, or write to the team directly.
 * The headline, sub and privacy note are the copy that used to sit under the
 * video; the response time matches the Contact page's.
 */
export default function BookConsultation() {
  return (
    <section aria-labelledby="book-heading" className="pb-24 md:pb-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Staggered rather than revealed as one slab: the closing lines arrive
            in reading order. */}
        <MotionReveal stagger={STAGGER.line} className="border-t border-[var(--border)] pt-20 text-center md:pt-24">
          <MotionRevealItem>
            <p className="flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              ( Next Step )
            </p>
          </MotionRevealItem>

          <MotionRevealItem>
            <h2
              id="book-heading"
              className="mt-8 font-display font-semibold text-[var(--text-primary)]"
              style={{ fontSize: "clamp(2.4rem, 5vw, 4.3rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
            >
              <SplitHeadline lead="Let's look at" tail="your numbers." />
            </h2>
          </MotionRevealItem>

          <MotionRevealItem>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
              An hourly strategy consultation. We'll show you where the hours and money are going.
            </p>
          </MotionRevealItem>

          <MotionRevealItem>
            <div className="mt-10">
              <Link
                to="/contact"
                className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
                style={microTransition}
              >
                Book a consultation
              </Link>
            </div>
          </MotionRevealItem>

          <MotionRevealItem>
            <div className="mt-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                Or write to the team directly
              </p>
              <ul className="mt-4 flex flex-col items-center justify-center gap-x-8 gap-y-2 sm:flex-row">
                {emails.map((email) => (
                  <li key={email}>
                    <a
                      href={`mailto:${email}`}
                      // An address on its own line is an action, not a link
                      // inside a sentence, so the anchor owns a 44px target.
                      // The rule here is text-decoration rather than a border,
                      // so it stays under the words as the box grows.
                      className="inline-flex min-h-[44px] items-center font-mono text-sm tracking-wide text-[var(--text-primary)] underline decoration-[color:var(--border-strong)] underline-offset-4 transition-opacity hover:opacity-70"
                      style={microTransition}
                    >
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                [ Response &lt; 24h ]
              </p>
            </div>
          </MotionRevealItem>

          {/* Handing over your numbers is the scary part; answer it here. */}
          <MotionRevealItem>
            <p className="mx-auto mt-10 max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
              Your numbers stay yours. Nothing you share gets sold or passed on, and you can have it
              deleted whenever you ask.{" "}
              <Link
                to="/privacy"
                className="underline underline-offset-4 transition-opacity hover:opacity-70"
                style={microTransition}
              >
                How we handle your data
              </Link>
              .
            </p>
          </MotionRevealItem>
        </MotionReveal>
      </div>
    </section>
  );
}
