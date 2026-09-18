import { useEffect, useRef } from "react";
import { animate, createAnimatable, createTimeline, cubicBezier, stagger } from "animejs";
import { ArrowUpRight } from "lucide-react";
import SEO from "@/shared/components/SEO";
import {
  CSS_EASE,
  DURATION,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
  VIEWPORT,
} from "@/shared/motion/tokens";
import { BOOKING_URL, MIN_SESSION_MINUTES } from "@/features/pricing/entities/rates";
import { useMarket } from "@/features/pricing/hooks/useMarket";

/** The house expo-out, handed to anime.js. Built from the token control points
 *  rather than retyped, so this page cannot drift the next time the curve is
 *  tuned. */
const expoOut = cubicBezier(...EASE_OUT_EXPO);

/** anime.js counts in milliseconds and the tokens in seconds; converting once
 *  here keeps the arithmetic out of the timeline. */
const RISE_STAGGER_MS = Math.round(STAGGER.card * 1000);

/** Everything that merely changes colour or opacity on this page settles at the
 *  micro duration, stated rather than left to Tailwind's default so the timing
 *  comes from the same file as the rest of the site. */
const microTransition = {
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
} as const;

const colorTransition = {
  transitionProperty: "background-color, border-color, color",
  ...microTransition,
} as const;

const opacityTransition = {
  transitionProperty: "opacity",
  ...microTransition,
} as const;

/** The rate's reveal once the region is known: a view change that keeps its
 *  box, so it settles over the swap duration rather than the micro one. */
const revealTransition = {
  transitionProperty: "opacity",
  transitionDuration: `${DURATION.swap}s`,
  transitionTimingFunction: CSS_EASE.outExpo,
} as const;

const emails = ["aniket@ziiro.work", "govind@ziiro.work"];

/** Derived from the one constant in rates.ts, so changing the minimum there can
 *  never leave this row saying something else. Split into figure and unit so
 *  the row reads in the same figure-then-unit rhythm as the rate above it. */
const minimumEngagement =
  MIN_SESSION_MINUTES % 60 === 0
    ? { amount: MIN_SESSION_MINUTES / 60, unit: MIN_SESSION_MINUTES === 60 ? "hour" : "hours" }
    : { amount: MIN_SESSION_MINUTES, unit: "minutes" };

/** One investment row: label then value, side by side from sm up and stacked
 *  below it, so both rows change shape together on a phone rather than one
 *  wrapping while the other does not. */
const investmentRow =
  "flex flex-col gap-2 border-b border-[var(--border)] py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6";

/** The label column of the investment rows: the site's mono micro-label. */
const rowLabel =
  "shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]";

type MarketSource = ReturnType<typeof useMarket>["source"];

/** Tells the visitor where the rate on screen came from. The visitor's IP alone
 *  decides the market, so the note names a place only once the lookup has found
 *  one. While the lookup is in flight (and in the prerendered HTML) the rate is
 *  hidden, so the note says so rather than claiming a location it does not know
 *  yet. */
function regionNote(source: MarketSource, resolving: boolean, label: string): string {
  if (source === "geo") return `[ ${label} · DETECTED FROM YOUR IP ]`;
  return resolving ? "[ DETECTING YOUR REGION ]" : "[ REGION NOT DETECTED ]";
}

/** Same arrow as the homepage's closing CTA: it travels TRAVEL.nudge and the
 *  link holds still, so the target never moves out from under the cursor.
 *  Zeroed rather than left untransitioned under reduced motion.
 *
 *  Only the client-voices CTA uses it, and that section is commented out at
 *  the bottom of the page for now. It stays defined so the block can be
 *  re-enabled as it is. */
function Arrow({ nudge }: { nudge: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 group-hover:translate-x-[var(--nudge)] group-focus-visible:translate-x-[var(--nudge)]"
      style={{
        transitionProperty: "transform",
        ...microTransition,
        ["--nudge" as string]: nudge ? `${TRAVEL.nudge}px` : "0px",
      }}
    >
      <path d="M3 7.5h9M8.4 3.9 12 7.5l-3.6 3.6" />
    </svg>
  );
}

/** What the client walks away with. Generic outcomes only: nothing here
 *  promises a result the session cannot control.
 *
 *  Confirm with business before adding specifics: turnaround times, written
 *  reports or recaps, document formats and follow-up calls all stay out of
 *  this list until the business has agreed to deliver them. */
const deliverables = [
  {
    title: "A prioritised list of automations",
    detail:
      "The agents, workflows and loops worth building for your business, ranked in the order we would build them.",
  },
  {
    title: "Rough sizing for each one",
    detail:
      "The hours each one could plausibly give back, set against the effort to build it, so you can weigh them side by side.",
  },
  {
    title: "A recommended next step",
    detail:
      "One clear move to make next: build it with us, hand it to your team, or let it wait.",
  },
];

const Contact = () => {
  const { market, source, resolving } = useMarket();

  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLElement>(null);
  const ctaArrowRef = useRef<HTMLSpanElement>(null);
  const emailAnims = useRef<ReturnType<typeof createAnimatable>[]>([]);
  const ctaArrowAnim = useRef<ReturnType<typeof createAnimatable> | null>(null);
  const reduced = useRef(false);

  // Sequenced entrance: label -> headline -> sub -> investment -> direct lines
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-rise]")];
    if (els.length === 0) return;
    const tl = createTimeline({
      defaults: { ease: expoOut, duration: reduced.current ? 0 : MS.reveal },
    });
    els.forEach((el, i) => {
      tl.add(
        el,
        { opacity: [0, 1], y: [TRAVEL.reveal, 0] },
        reduced.current ? 0 : i * RISE_STAGGER_MS,
      );
    });
    return () => {
      tl.revert();
    };
  }, []);

  // The value block sits below the fold on most screens, so it rises when it
  // is scrolled to rather than on mount, where its entrance would play unseen.
  useEffect(() => {
    const block = valueRef.current;
    if (!block) return;
    const els = block.querySelectorAll<HTMLElement>("[data-value-rise]");
    let anim: ReturnType<typeof animate> | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        anim = animate(els, {
          opacity: [0, 1],
          y: [TRAVEL.reveal, 0],
          delay: reduced.current ? 0 : stagger(RISE_STAGGER_MS),
          duration: reduced.current ? 0 : MS.reveal,
          ease: expoOut,
        });
      },
      { threshold: VIEWPORT.amount },
    );
    io.observe(block);
    return () => {
      io.disconnect();
      anim?.revert();
    };
  }, []);

  // Hover-follow micro-interactions: the direct email links and the CTA arrow
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const links = [...root.querySelectorAll<HTMLElement>("[data-email-link]")];
    emailAnims.current = links.map((el) =>
      createAnimatable(el, { x: MS.micro, ease: expoOut }),
    );
    if (ctaArrowRef.current) {
      ctaArrowAnim.current = createAnimatable(ctaArrowRef.current, {
        x: MS.micro,
        y: MS.micro,
        ease: expoOut,
      });
    }
    return () => {
      emailAnims.current.forEach((a) => a.revert());
      emailAnims.current = [];
      ctaArrowAnim.current?.revert();
      ctaArrowAnim.current = null;
    };
  }, []);

  const ctaEnter = () => {
    if (reduced.current) return;
    ctaArrowAnim.current?.x(TRAVEL.nudge);
    ctaArrowAnim.current?.y(-TRAVEL.nudge);
  };
  const ctaLeave = () => {
    ctaArrowAnim.current?.x(0);
    ctaArrowAnim.current?.y(0);
  };

  return (
    <div ref={rootRef} className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Book a 1-Hour AI Strategy Consultation"
        description="Book a paid one-hour AI strategy consultation with Ziiro AI. Leave with a prioritised plan of the automations worth building and a recommended next step."
        canonical="/contact"
      />

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* ─── Page hero ───
            Every block that starts hidden also carries data-reveal, so the
            prerendered HTML stays readable without JavaScript (index.css). */}
        <header className="border-b border-[var(--border)] pb-16 pt-36">
          <p
            data-rise
            data-reveal
            className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            {"( ZIIRO / CONTACT )"}
          </p>
          <h1
            data-rise
            data-reveal
            className="mt-10 font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
              opacity: 0,
            }}
          >
            Book a strategy session.
            <br />
            <span className="text-[var(--text-secondary)]">Leave with a plan you can act on.</span>
          </h1>
          <p
            data-rise
            data-reveal
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            A paid, one-hour consultation with our team. Bring the tasks that
            eat your week, and we&apos;ll work out which agents, automations
            and workflows are worth building, and in what order.
          </p>
        </header>

        {/* ─── Your investment + direct lines ───
            The investment comes first in the source so it leads on phones and
            for keyboard and screen-reader order; from lg up the grid places it
            in the right-hand column. */}
        <div className="grid grid-cols-1 gap-16 pb-20 pt-16 lg:grid-cols-12">
          <section
            data-rise
            data-reveal
            aria-labelledby="investment-heading"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8 md:p-10 lg:col-span-6 lg:col-start-7 lg:row-start-1"
            style={{ opacity: 0 }}
          >
            <h2
              id="investment-heading"
              className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {"( YOUR INVESTMENT )"}
            </h2>
            <p className="mt-3 text-balance font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {regionNote(source, resolving, market.label)}
            </p>

            {/* Two rows, label then value (see investmentRow). */}
            <dl className="mt-8 border-t border-[var(--border)]">
              <div className={investmentRow}>
                <dt className={rowLabel}>Hourly Rate</dt>
                {/* Hidden, not removed, while the region resolves: the default
                    market's rate is not the visitor's, so it must never flash
                    before theirs lands. The text stays in the DOM for crawlers,
                    data-reveal shows it when JavaScript never runs (index.css),
                    and the box keeps its height so nothing shifts on reveal.
                    aria-busy holds the announcement until the real rate is in. */}
                <dd
                  aria-live="polite"
                  aria-busy={resolving}
                  data-reveal
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                  style={{ ...revealTransition, opacity: resolving ? 0 : 1 }}
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
                  <span className="text-base text-[var(--text-secondary)]">{market.per}</span>{" "}
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {market.currency}
                  </span>
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
                  <span className="text-base text-[var(--text-secondary)]">{minimumEngagement.unit}</span>
                </dd>
              </div>
            </dl>
            {market.note && (
              <p
                data-reveal
                className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]"
                style={{ ...revealTransition, opacity: resolving ? 0 : 1 }}
              >
                {market.note}
              </p>
            )}

            <p className="mt-6 text-sm leading-relaxed text-[var(--text-secondary)]">
              You&apos;re not paying for an hour of conversation. You&apos;re
              investing in the analysis and expertise we bring to how your
              business actually runs, and you take away recommendations and a
              clear direction you can act on.
            </p>

            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener"
              onMouseEnter={ctaEnter}
              onMouseLeave={ctaLeave}
              style={opacityTransition}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--text-primary)] px-8 py-4 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-90"
            >
              Book your session
              <span ref={ctaArrowRef} aria-hidden="true" className="inline-flex">
                <ArrowUpRight size={14} />
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>

            {/* Assurance, deliberately conditional: it asks the client to raise
                it before the call ends and names no remedy. The exact guarantee
                (refund, credit, follow-up session, and on what conditions) is
                pending business confirmation. Do not harden this copy until the
                business has agreed it. */}
            <p className="mt-4 text-balance text-center text-xs leading-relaxed text-[var(--text-secondary)]">
              If the session doesn&apos;t give you a clear next step, tell us
              before you leave the call and we&apos;ll make it right.
            </p>
          </section>

          <div
            data-rise
            data-reveal
            className="lg:col-span-5 lg:col-start-1 lg:row-start-1"
            style={{ opacity: 0 }}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                {"( DIRECT )"}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                [ RESPONSE &lt; 24H ]
              </p>
            </div>
            <p className="mb-6 max-w-md leading-relaxed text-[var(--text-secondary)]">
              Questions before you book? Email us directly.
            </p>
            <div className="flex flex-col gap-3">
              {emails.map((email, i) => (
                <a
                  key={email}
                  data-email-link
                  href={`mailto:${email}`}
                  onMouseEnter={() => emailAnims.current[i]?.x(TRAVEL.nudge)}
                  onMouseLeave={() => emailAnims.current[i]?.x(0)}
                  style={colorTransition}
                  className="inline-block w-fit font-mono text-sm tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {email}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Value of your investment ─── */}
        <section
          ref={valueRef}
          aria-labelledby="value-heading"
          className="grid grid-cols-1 gap-12 border-t border-[var(--border)] pb-28 pt-16 lg:grid-cols-12 lg:gap-16"
        >
          <div data-value-rise data-reveal className="lg:col-span-5" style={{ opacity: 0 }}>
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {"( DELIVERABLES )"}
            </p>
            <h2
              id="value-heading"
              className="mt-8 font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(1.9rem, 3.6vw, 3rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
              }}
            >
              Value of your investment.
              <br />
              <span className="text-[var(--text-secondary)]">What you leave the hour with.</span>
            </h2>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <ol className="border-t border-[var(--border)]">
              {deliverables.map((d, i) => (
                <li
                  key={d.title}
                  data-value-rise
                  data-reveal
                  className="flex gap-5 border-b border-[var(--border)] py-6"
                  style={{ opacity: 0 }}
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 pt-1 font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{d.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {d.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p
              data-value-rise
              data-reveal
              className="mt-10 max-w-lg font-display font-medium text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(1.15rem, 1.6vw, 1.35rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.35,
                opacity: 0,
              }}
            >
              We aim for the plan you leave with to be worth more than the hour
              you invest in it.
            </p>
          </div>
        </section>

        {/* ─── Client voices: disabled for now ───
            Commented out on the human's request and kept in place so it can
            come back; nothing renders here meanwhile. To re-enable, uncomment
            the <section> below and restore the three things only it uses:
              import { Link } from "react-router-dom";
              import MotionReveal from "@/shared/motion/MotionReveal";
              import { useReducedMotion } from "framer-motion";
            plus `const shouldReduce = useReducedMotion();` at the top of the
            component. The Arrow helper is still defined above.

            It is a pointer rather than the testimonials themselves: they live
            on Who We Are, and one place keeps two copies from drifting apart.

        <section aria-label="Client testimonials" className="pb-24 md:pb-32">
          <MotionReveal className="flex flex-col items-start justify-between gap-5 border-t border-[var(--border)] pt-10 md:flex-row md:items-center">
            <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {"( TESTIMONIALS )"}
            </p>
            <Link
              to="/who-we-are#testimonials"
              className="group inline-flex items-center gap-3 font-display font-semibold text-[var(--text-primary)] hover:opacity-80"
              style={{
                ...opacityTransition,
                fontSize: "clamp(1.3rem, 2.4vw, 1.9rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              See what our clients think about our AI audit
              <Arrow nudge={!shouldReduce} />
            </Link>
          </MotionReveal>
        </section>
        */}
      </div>
    </div>
  );
};

export default Contact;
