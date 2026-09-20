import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createTimeline, cubicBezier } from "animejs";
import { ArrowUpRight } from "lucide-react";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import StatefulOrb from "@/shared/ui/StatefulOrb";
import ArrowFillLink from "@/shared/ui/arrow-fill-link";
import MotionReveal from "@/shared/motion/MotionReveal";
import {
  CSS_EASE,
  DURATION,
  EASE_IN_OUT,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";
import { INTERIM_BOOKING_URL, MARKETS, MIN_SESSION_MINUTES } from "@/features/pricing/entities/rates";
import { useMarket } from "@/features/pricing/hooks/useMarket";

/**
 * BOOK A CALL: the conversion page.
 *
 * ITS ONLY JOB is helping someone who has already decided to consider Ziiro
 * understand what happens in the session and book one. /contact is the other
 * half of this split and owns general inquiry: partnerships, press, existing
 * clients, questions before booking. The two must never compete, so nothing
 * here invites a message and nothing there sells the hour.
 *
 * WHAT THIS PAGE DELIBERATELY DOES NOT EXPLAIN, because another page owns it:
 * Products owns Diagnose, Build and Optimize; Mission owns why Ziiro works
 * this way; Pricing owns how engagement pricing works; Who We Are owns the
 * team; Docs owns methodology. This page owns exactly one thing, which is what
 * happens IN the session. The brand line below is one statement and one
 * sentence, not a second Mission section.
 *
 * THE CARD MOVED HERE FROM /contact rather than being rewritten, so the rate,
 * the minimum and the deliverables cannot drift into two versions. Contact is
 * being stripped back to a quiet inquiry page in the same job; filed in
 * requests.md so neither page ends up carrying both.
 */

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

/** Derived from the one constant in rates.ts, so changing the minimum there can
 *  never leave this row saying something else. */
const minimumEngagement =
  MIN_SESSION_MINUTES % 60 === 0
    ? { amount: MIN_SESSION_MINUTES / 60, unit: MIN_SESSION_MINUTES === 60 ? "hour" : "hours" }
    : { amount: MIN_SESSION_MINUTES, unit: "minutes" };

/**
 * Both published rates, in the same order and from the same source Pricing
 * derives its own line from, so the two pages can never quote different
 * numbers.
 *
 * WHY THE PAGE STATES BOTH when the row above shows only the visitor's own.
 * The rate row is resolved client side, so the prerendered HTML a crawler and
 * an answer engine receive carries the default market alone: this page was
 * telling them "$40 / hour" with no sign that a second published rate exists.
 * An agent quoting this page in isolation was therefore right but incomplete.
 * The visible personalisation is unchanged; this line simply makes the page
 * answer "what does Ziiro charge" on its own, which is the whole point of the
 * citability fix. It is one sentence rather than a copy of Pricing, because
 * the model, the stages and the scoping still belong to that page.
 */
const PUBLISHED_HOURLY = `${MARKETS.GLOBAL.display} / ${MARKETS.IN.display}`;

const investmentRow =
  "flex flex-col gap-2 border-b border-[var(--border)] py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6";

const rowLabel =
  "shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]";

/** What the visitor leaves with. Three items, a label and one line each.
 *  Generic outcomes only: nothing here promises a result the session cannot
 *  control, and no turnaround, document format or follow-up call is named
 *  until the business has agreed to deliver one. */
const DELIVERABLES = [
  {
    title: "Priority opportunities",
    detail: "Where AI or automation may create the most leverage.",
  },
  {
    title: "Rough ROI and effort sizing",
    detail: "An initial view of potential value against complexity.",
  },
  {
    title: "Recommended next move",
    detail: "A clear recommendation on what should happen next.",
  },
];

export default function BookACall() {
  const heroRef = useRef<HTMLElement>(null);
  // Detection is the only source of the rate, and it is silent. Nothing on
  // this page names a region, a country or an IP: telling a visitor their
  // location was identified reads as surveillance even when it is harmless.
  const { market, resolving } = useMarket();
  const rateHidden = resolving;
  /** Pointer or focus is on the booking action, so the orb warms slightly. It
   *  stays READY throughout: this is emphasis, not a state change. */
  const [ctaHot, setCtaHot] = useState(false);

  // Hero entrance: label -> headline -> sub -> hairline. Elements start hidden
  // via inline opacity so nothing flashes, carry data-reveal so a crawler with
  // no JavaScript still receives them, and the whole timeline is skipped under
  // prefers-reduced-motion rather than run at zero duration.
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const label = root.querySelector<HTMLElement>("[data-hero-label]");
    const title = root.querySelector<HTMLElement>("[data-hero-title]");
    const sub = root.querySelector<HTMLElement>("[data-hero-sub]");
    const rule = root.querySelector<HTMLElement>("[data-hero-rule]");
    if (!label || !title || !sub || !rule) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const el of [label, title, sub]) el.style.opacity = "1";
      rule.style.transform = "scaleX(1)";
      return;
    }

    const step = ms(STAGGER.line);
    const tl = createTimeline({
      defaults: { duration: MS.reveal, ease: cubicBezier(...EASE_OUT_EXPO) },
    });
    tl.add(label, { opacity: [0, 1], y: [TRAVEL.reveal, 0] })
      .add(title, { opacity: [0, 1], y: [TRAVEL.line, 0] }, step)
      .add(sub, { opacity: [0, 1], y: [TRAVEL.reveal, 0] }, step * 2)
      .add(
        rule,
        { scaleX: [0, 1], duration: MS.statement, ease: cubicBezier(...EASE_IN_OUT) },
        step * 3,
      );

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <div className="relative">
      <SEO
        // Not swappable with /contact or /pricing: Contact is general inquiry
        // and Pricing is how a project is priced. This page is the session
        // itself and what a visitor walks away holding.
        title="Book a Strategy Session: What the Hour Covers"
        description="A paid, hourly strategy session with a one hour minimum. Bring the work that consumes time or feels unnecessarily manual, and leave with priority opportunities, rough ROI and effort sizing, and one recommended next move."
        canonical="/book-a-call"
      />

      {/* ── Page hero ── */}
      <header ref={heroRef} className="pt-36 pb-14">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            data-reveal
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( ZIIRO / BOOK A CALL )
          </p>
          <h1
            data-hero-title
            data-reveal
            className="font-display font-semibold text-[var(--text-primary)]"
            style={{
              opacity: 0,
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
            }}
          >
            <SplitHeadline lead="Book a strategy session." tail="Leave with a clear next move." />
          </h1>
          <p
            data-hero-sub
            data-reveal
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            Bring us the work that consumes time, creates bottlenecks, or feels
            unnecessarily manual. We&apos;ll help identify where AI could create
            measurable leverage and what is worth pursuing first.
          </p>
          <div
            data-hero-rule
            className="mt-14 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {/* ── The line, once. Mission owns the argument; this is the reminder. ── */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <p className="max-w-2xl font-display text-xl font-medium leading-snug text-[var(--text-primary)] md:text-2xl">
              Leverage AI Anywhere. Anywhere AI creates measurable leverage. Not
              AI everywhere.
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              We look across your operation and use AI only where the economics
              justify it.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── The booking card ── */}
      <section aria-labelledby="session-heading" className="pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-9 md:p-11">
              <div className="flex items-start justify-between gap-6">
                <h2
                  id="session-heading"
                  className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  {"( STRATEGY SESSION )"}
                </h2>

                {/* The orb: AMBIENT and permanently READY.

                    It stands for Ziiro being reachable at the one point on the
                    site where a visitor is about to engage directly. It never
                    changes state, because nothing here is listening,
                    connecting, searching or working: the booking happens on
                    Calendly, off site, and this page receives no events from
                    it. Cycling states would make the state system theatre, and
                    the moment it is theatre anywhere it stops being
                    information everywhere.

                    IF CALENDLY IS EVER EMBEDDED and real booking events arrive,
                    READY then SCHEDULING then BOOKED becomes legitimate and
                    this is where it goes.

                    `mode="ambient"` keeps it out of the live region, so a
                    screen reader is never given a status it cannot act on. The
                    word READY is rendered by the component itself and is
                    readable whether or not the animation is running. */}
                <StatefulOrb
                  state="idle"
                  size="md"
                  mode="ambient"
                  intensity={ctaHot ? "normal" : "subtle"}
                  className="shrink-0"
                />
              </div>

              <dl className="mt-8 border-t border-[var(--border)]">
                <div className={investmentRow}>
                  <dt className={rowLabel}>Hourly Rate</dt>
                  {/* Hidden, not removed, while the region resolves: the
                      default market's rate is not the visitor's, so it must
                      never flash before theirs lands. The text stays in the DOM
                      for crawlers, data-reveal shows it when JavaScript never
                      runs, the box keeps its height so nothing shifts, and
                      aria-busy holds the announcement until the real rate is
                      in. */}
                  <dd
                    aria-live="polite"
                    aria-busy={rateHidden}
                    data-reveal
                    className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                    style={{
                      transitionProperty: "opacity",
                      transitionDuration: `${DURATION.swap}s`,
                      transitionTimingFunction: CSS_EASE.outExpo,
                      opacity: rateHidden ? 0 : 1,
                    }}
                  >
                    <span
                      className="font-display font-semibold text-[var(--text-primary)]"
                      style={{
                        fontSize: "clamp(2.6rem, 5vw, 4rem)",
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      {market.display}
                    </span>{" "}
                    <span className="text-base text-[var(--text-secondary)]">{market.per}</span>
                  </dd>
                </div>

                <div className={investmentRow}>
                  <dt className={rowLabel}>Minimum Engagement</dt>
                  <dd className="flex items-baseline gap-x-2">
                    <span
                      className="font-display font-semibold text-[var(--text-primary)]"
                      style={{ fontSize: "1.75rem", letterSpacing: "-0.03em", lineHeight: 1 }}
                    >
                      {minimumEngagement.amount}
                    </span>{" "}
                    <span className="text-base text-[var(--text-secondary)]">
                      {minimumEngagement.unit}
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                {PUBLISHED_HOURLY} an hour, {minimumEngagement.amount}{" "}
                {minimumEngagement.unit} minimum. Project work is quoted after the
                session, one stage at a time:{" "}
                <Link
                  to="/pricing"
                  className="border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                >
                  how pricing works
                </Link>
                .
              </p>

              <a
                href={INTERIM_BOOKING_URL}
                target="_blank"
                rel="noopener"
                // Focus as well as hover, so the orb answers a keyboard reader
                // the way it answers a pointer. The orb itself is not
                // `interactive`: that would give a decorative object a tab stop
                // in front of the one button this page exists for.
                onMouseEnter={() => setCtaHot(true)}
                onMouseLeave={() => setCtaHot(false)}
                onFocus={() => setCtaHot(true)}
                onBlur={() => setCtaHot(false)}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--text-primary)] px-8 py-4 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90"
                style={{
                  transitionProperty: "opacity",
                  transitionDuration: `${DURATION.micro}s`,
                  transitionTimingFunction: CSS_EASE.out,
                }}
              >
                Book a call
                <span aria-hidden="true" className="inline-flex">
                  <ArrowUpRight size={14} />
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ── You leave with ── */}
      <section aria-labelledby="leave-with-heading" className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <h2
              id="leave-with-heading"
              className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {"( YOU LEAVE WITH )"}
            </h2>
            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
              {DELIVERABLES.map((d, i) => (
                <li key={d.title} className="bg-[var(--background)] p-6">
                  <span
                    aria-hidden="true"
                    className="font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 font-medium text-[var(--text-primary)]">{d.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {d.detail}
                  </p>
                </li>
              ))}
            </ol>

            {/* The one link off this page. Not a second offer: a visitor who is
                not ready to book has a question, and that is Contact's job. */}
            <div className="mt-12">
              <ArrowFillLink to="/contact">Something else to ask? Contact us</ArrowFillLink>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
