import { useEffect, useRef, useState } from "react";
import { animate, createAnimatable, createTimeline, cubicBezier, stagger } from "animejs";
import { ArrowUpRight } from "lucide-react";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import Beam from "@/shared/motion/Beam";
import {
  CSS_EASE,
  DURATION,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
  VIEWPORT,
} from "@/shared/motion/tokens";
import {
  INTERIM_BOOKING_URL,
  MIN_SESSION_MINUTES,
} from "@/features/pricing/entities/rates";
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

/**
 * ── CURRENCY: DETECTED, NOT ASKED ─────────────────────────────────────
 *
 * The rate shown is the visitor's own, worked out silently. There is nothing
 * on screen about currency or region: no label, no selector, no wording about
 * where the visitor is or how we know.
 *
 * Two things have been removed from this spot, and neither should come back:
 *
 *   1. "[ INDIA · DETECTED FROM YOUR IP ]" above the rate, and
 *      "[ DETECTING YOUR REGION ]" while the lookup ran. Accurate and
 *      well-meant, but telling visitors you have identified their location
 *      reads as surveillance even when it is harmless.
 *   2. A USD / INR button pair that replaced it. If the region is already
 *      detected, asking the visitor to pick a currency undoes the point of
 *      detecting it: it makes them do work the page has already done, and it
 *      re-raises the question of how the page knew which button to preselect.
 *      One correct number, shown without comment, is the whole feature.
 *
 * The lookup itself is a separate question from the copy. Hosting, CDN and
 * infrastructure still receive IPs, and the Privacy Policy must keep
 * disclosing that accurately whatever this page does or does not say.
 */

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

/** What the client walks away with. Three blocks, a label and one line each.
 *  This was three headed paragraphs; the information is unchanged and the
 *  prose around it is gone, because the page already shows the price, the
 *  duration and the deliverables and did not need to argue for them.
 *
 *  Generic outcomes only: nothing here promises a result the session cannot
 *  control. Confirm with the business before adding specifics: turnaround
 *  times, written reports or recaps, document formats and follow-up calls all
 *  stay out of this list until the business has agreed to deliver them. */
const deliverables = [
  { title: "Priority opportunities", detail: "Ranked in the order we would build them." },
  { title: "Rough ROI and effort sizing", detail: "Hours back, set against effort to build." },
  { title: "One recommended next move", detail: "Build it, hand it over, or let it wait." },
];

const Contact = () => {
  // Detection is the only source of the rate now, so the market it returns is
  // the market shown. Nothing on the page can override it.
  const { market, resolving } = useMarket();

  // The rate stays hidden until there is a real one to show: the default
  // market is not the visitor's, so it must never flash before theirs lands.
  const rateHidden = resolving;

  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLElement>(null);
  const ctaArrowRef = useRef<HTMLSpanElement>(null);
  const emailAnims = useRef<ReturnType<typeof createAnimatable>[]>([]);
  const ctaArrowAnim = useRef<ReturnType<typeof createAnimatable> | null>(null);
  const reduced = useRef(false);
  /** Pointer is over the book button, so the card's beam picks up. State
   *  rather than a ref because the beam is rendered, not animated by hand. */
  const [ctaHot, setCtaHot] = useState(false);

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
    setCtaHot(true);
    ctaArrowAnim.current?.x(TRAVEL.nudge);
    ctaArrowAnim.current?.y(-TRAVEL.nudge);
  };
  const ctaLeave = () => {
    setCtaHot(false);
    ctaArrowAnim.current?.x(0);
    ctaArrowAnim.current?.y(0);
  };

  return (
    <div ref={rootRef} className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Book a Consultation: 60-Minute Minimum, Paid"
        // No mention of region here either: a meta description is rendered
        // copy, it just renders in a search result instead of on the page.
        description="Book the session. Paid, one hour minimum, no pitch. You leave with the priority opportunities ranked, rough sizing for each, and one recommended next move."
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
            <SplitHeadline lead="Book a strategy session." tail="Leave with a plan you can act on." />
          </h1>
          <p
            data-rise
            data-reveal
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            Bring the work that eats your week. We&apos;ll identify where AI can create
            measurable leverage, what is worth building and what should come first.
          </p>

          {/* The brand line, as a reminder only. Mission is where the idea is
              explained; this is the one-line version a visitor needs at the
              moment they are deciding to book, and it must not grow into a
              second explainer. */}
          <p
            data-rise
            data-reveal
            className="mt-8 max-w-xl border-l border-[var(--border-strong)] pl-5 text-sm leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="font-medium text-[var(--text-primary)]">Leverage AI Anywhere.</span>{" "}
            Anywhere doesn&apos;t mean everywhere. We look across your operation and use AI only
            where the numbers justify it.
          </p>
        </header>

        {/* ─── Your investment + direct lines ───
            The investment comes first in the source so it leads on phones and
            for keyboard and screen-reader order; from lg up the grid places it
            in the right-hand column. */}
        <div className="grid grid-cols-1 gap-16 pb-20 pt-16 lg:grid-cols-12">
          {/* The one beam on this page, and one of only two on the site. This
              is the booking card, the single most important thing a visitor
              can act on, so it carries a slow low beam at rest and picks up
              while the pointer is over the book button. Alive, not insistent.

              The grid placement lives on the wrapper rather than the card,
              because the wrapper is the grid item once the beam mounts. The
              card keeps its own look, and `md` traces the full rounded border
              it already has. */}
          <Beam
            className="lg:col-span-6 lg:col-start-7 lg:row-start-1"
            size="md"
            radius={16}
            strength={ctaHot ? 0.46 : 0.2}
            duration={ctaHot ? 5 : 9}
          >
          <section
            data-rise
            data-reveal
            aria-labelledby="investment-heading"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8 md:p-10"
            style={{ opacity: 0 }}
          >
            <h2
              id="investment-heading"
              className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {"( YOUR INVESTMENT )"}
            </h2>
            {/* Two rows, label then value (see investmentRow). The heading
                above used to be followed by a currency selector; the rows now
                sit directly under it, so the spacing that separated the two
                moves here. */}
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
                  aria-busy={rateHidden}
                  data-reveal
                  className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                  style={{ ...revealTransition, opacity: rateHidden ? 0 : 1 }}
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
                style={{ ...revealTransition, opacity: rateHidden ? 0 : 1 }}
              >
                {market.note}
              </p>
            )}

            <a
              href={INTERIM_BOOKING_URL}
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

            {/* THE GUARANTEE LINE IS DELIBERATELY ABSENT. IT NEEDS THE HUMAN.

                This card used to close with "If the session doesn't give you a
                clear next step, tell us before you leave the call and we'll
                make it right." It named no remedy and no condition, so it
                promised nothing while sounding like a promise, which is the
                worst of both. The alternative on the table is a real policy,
                "Clear-next-step guarantee: if we cannot identify a useful next
                step during the session, you don't pay", and that is a refund
                commitment the business has not agreed to and we cannot invent
                on its behalf.

                So it is removed rather than reworded. To restore it, get the
                policy confirmed first (what the remedy is, who judges it, and
                by when it must be raised), then write that. Do not reinstate
                the old wording. */}
          </section>
          </Beam>

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
            {/* No gap: each address is its own 44px row, and two 44px targets
                need to sit flush rather than overlap into the space between
                them. These are the page's contact actions, not links inside a
                sentence, so they get a thumb-sized row. */}
            <div className="flex flex-col">
              {emails.map((email, i) => (
                <a
                  key={email}
                  data-email-link
                  href={`mailto:${email}`}
                  onMouseEnter={() => emailAnims.current[i]?.x(TRAVEL.nudge)}
                  onMouseLeave={() => emailAnims.current[i]?.x(0)}
                  style={colorTransition}
                  className="flex min-h-[44px] w-fit items-center font-mono text-sm tracking-wide text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
          <div data-value-rise data-reveal className="lg:col-span-4" style={{ opacity: 0 }}>
            <h2
              id="value-heading"
              className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {"( YOU LEAVE WITH )"}
            </h2>
          </div>

          {/* Three blocks side by side from sm up, a label and one line each.
              This was three headed paragraphs plus a closing claim about the
              hour being worth more than it costs; the claim is gone because it
              was ours to make and nothing could back it. */}
          <ol className="grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:col-span-8">
            {deliverables.map((d, i) => (
              <li
                key={d.title}
                data-value-rise
                data-reveal
                className="bg-[var(--background)] p-6"
                style={{ opacity: 0 }}
              >
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

            BEFORE RE-ENABLING, FIX THE LINK. The anchor below is
            /who-we-are#testimonials and there is no longer an element with
            that id: the testimonials mount on Who We Are is commented out too,
            so uncommenting this section as it stands ships a broken link. It
            stays written down rather than corrected because there is nothing
            correct to point it at yet. Testimonials are deliberately hidden in
            production until there are real ones, so restoring the anchor is
            part of restoring the testimonials, not a separate fix.

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
