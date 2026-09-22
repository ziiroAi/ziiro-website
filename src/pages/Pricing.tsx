import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { animate, createAnimatable, createTimeline, stagger } from "animejs";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import {
  serviceCatalogSchema,
} from "@/shared/components/seo-schema";
import { PRICING_PAGE_FAQS as faqs } from "@/features/faq/entities/questions";
import {
  MINIMUM_ENGAGEMENT,
  MINIMUM_LABEL,
  PUBLISHED_RATE,
} from "@/features/pricing/entities/rates";

/**
 * The consultation rate and the session minimum, both imported rather than
 * derived here, so this page cannot drift from /book-a-call or from rates.ts.
 *
 * Both currencies are shown side by side. The rates are set per market and are
 * deliberately NOT conversions of each other, so there is no single number to
 * print; showing both is also the one presentation that needs no region
 * detection, which is the thing Contact just removed from view. A visitor reads
 * their own currency without the page telling them where they are.
 *
 * These were local constants built from the same expression /book-a-call used
 * under a different name. They now come from the entity, which is the only
 * place a rate or a minimum is allowed to be decided.
 */
const HOURLY = PUBLISHED_RATE;

/** The four questions this page exists to answer, in the order a buyer asks
 *  them: what the first conversation costs, how a project is priced, what
 *  determines the scope, and when the number is known. Steps 01 to 03 answer
 *  the first, second and fourth; the stage rows below answer the third.
 *
 *  This used to be "the hour / the scope / the stage" with the rate pushed off
 *  to Contact. A pricing page that will not say a price is a pricing page a
 *  reader has to leave, so the figure is stated here. */
const howItRuns = [
  {
    step: "Consultation",
    line: `${HOURLY} an hour, ${MINIMUM_LABEL}. We work out what is worth pursuing, and you leave with a direction either way.`,
  },
  {
    step: "Scope",
    line: "We agree the stage, the systems or processes included, the integrations, the expected output and the timeline.",
  },
  {
    step: "Quote",
    line: "One scope, one project price, agreed before work starts. A change of scope is re-quoted, never invoiced after the fact.",
  },
];

/** The same three stages Products.tsx sets out, carrying ONLY what moves their
 *  price. What each stage actually produces is Products' job and is not
 *  repeated here: this page used to re-list all fourteen deliverables, which is
 *  most of the Products page restated under a different heading.
 *
 *  Spans are the ranges the site publishes. Diagnose says 1 to 3 weeks, which
 *  is the figure Docs now uses too; the two pages disagreed before. */
const stages = [
  {
    name: "Diagnose",
    desc: "Find out what is worth building",
    scopedBy:
      "The number of processes in scope, and how complex they are.",
    span: "Typical span: 1 to 3 weeks",
  },
  {
    name: "Build",
    desc: "Ship it into the operation",
    scopedBy:
      "Workflows, integrations, and how complex the system has to be.",
    span: "Typical span: 4 to 12 weeks",
  },
  {
    name: "Optimize",
    desc: "Keep it earning after launch",
    scopedBy:
      "How many systems are live under measurement, and at what cadence.",
    span: "Runs in cycles, not to a finish date",
  },
];

type Animatable = ReturnType<typeof createAnimatable>;
type PanelAnimation = ReturnType<typeof animate>;

/** The stagger tokens are in seconds, because framer-motion counts in seconds;
 *  anime.js counts in milliseconds. Everything handed to anime goes through
 *  here rather than being re-typed as a second, hand-rounded number. */
const ms = (seconds: number) => Math.round(seconds * 1000);

export default function Pricing() {
  /** ITEM 20. This was a single index, so the FAQ was exclusive: opening
   *  "02 What's the typical timeline?" closed row 01 above it and the control
   *  the reader had just clicked jumped up by that panel's height. Measured
   *  -77.5px at 1440 and -123px at 390, on rows 02 and 03 both. Independent
   *  rows remove the cause: nothing above the clicked control changes. */
  const [openFaq, setOpenFaq] = useState<ReadonlySet<number>>(() => new Set());

  const heroRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);
  const faqListRef = useRef<HTMLDivElement>(null);
  const faqPanelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const faqPanelAnims = useRef<(PanelAnimation | null)[]>([]);
  const titleAnims = useRef<Animatable[]>([]);
  const plusAnims = useRef<Animatable[]>([]);
  const openRef = useRef<ReadonlySet<number>>(new Set());
  const reduced = useRef(false);

  // Hero entrance: label -> headline -> sub -> hairline, sequenced on a timeline
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = heroRef.current;
    if (!hero) return;
    const els = [...hero.querySelectorAll<HTMLElement>("[data-hero-el]")];
    if (!els.length) return;
    // out(4) is anime's nearest thing to the house expo-out curve. Four
    // elements one STAGGER.line apart, each taking DURATION.statement, lands
    // the last one at about DURATION.entrance, so the hero reads as a single
    // gesture rather than four separate arrivals.
    const tl = createTimeline({
      defaults: { ease: "out(4)", duration: reduced.current ? 0 : MS.statement },
    });
    els.forEach((el, i) => {
      tl.add(
        el,
        { opacity: [0, 1], y: [TRAVEL.reveal, 0] },
        reduced.current ? 0 : i * ms(STAGGER.line),
      );
    });
    // Braced so the cleanup returns void: `() => tl.revert()` returns the
    // Timeline, which is not an EffectCallback.
    return () => {
      tl.revert();
    };
  }, []);

  // Stage rows: staggered rise when scrolled into view + hover-follow titles
  useEffect(() => {
    const list = stagesRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>("[data-stage-row]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        animate(rows, {
          opacity: [0, 1],
          y: [TRAVEL.reveal, 0],
          delay: stagger(ms(STAGGER.card)),
          duration: reduced.current ? 0 : MS.reveal,
          ease: "out(4)",
        });
      },
      { threshold: 0.1 },
    );
    io.observe(list);

    const titles = [...list.querySelectorAll<HTMLElement>("[data-stage-title]")];
    // At 450ms the title visibly trailed the cursor. A hover has to resolve
    // inside DURATION.micro or it stops feeling attached to the pointer.
    titleAnims.current = titles.map((el) =>
      createAnimatable(el, { x: MS.micro, ease: "out(4)" }),
    );

    return () => {
      io.disconnect();
      titleAnims.current.forEach((a) => a.revert());
      titleAnims.current = [];
    };
  }, []);

  // FAQ rows: staggered entrance + rotating plus badges
  useEffect(() => {
    const list = faqListRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>("[data-faq-row]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        animate(rows, {
          opacity: [0, 1],
          y: [TRAVEL.reveal, 0],
          delay: stagger(ms(STAGGER.line)),
          duration: reduced.current ? 0 : MS.reveal,
          ease: "out(4)",
        });
      },
      { threshold: 0.15 },
    );
    io.observe(list);

    const pluses = [...list.querySelectorAll<HTMLElement>("[data-faq-plus]")];
    plusAnims.current = pluses.map((el) =>
      createAnimatable(el, { rotate: MS.swap, ease: "out(4)" }),
    );

    return () => {
      io.disconnect();
      plusAnims.current.forEach((a) => a.revert());
      plusAnims.current = [];
      faqPanelAnims.current.forEach((a) => a?.cancel());
      faqPanelAnims.current = [];
    };
  }, []);

  const toggleFaq = (i: number) => {
    const next = new Set(openRef.current);
    const isOpening = !next.has(i);
    if (isOpening) next.add(i);
    else next.delete(i);
    openRef.current = next;
    setOpenFaq(next);

    // Only the clicked row animates now. It used to walk every panel to find
    // the one it had just closed as a side effect; with independent rows there
    // is no side effect to find, which is the whole point of the change.
    const el = faqPanelRefs.current[i];
    if (!el) return;

    // Interruption-safe: cancel any in-flight animation, pin current height
    // before measuring. Height is the one property this page animates
    // outside transform and opacity, because an accordion has no fixed
    // target box to scale toward; the badge below runs on the same
    // DURATION.swap so panel and badge read as one event.
    faqPanelAnims.current[i]?.cancel();
    const from = el.getBoundingClientRect().height;
    el.style.height = `${from}px`;
    faqPanelAnims.current[i] = animate(el, {
      height: `${isOpening ? el.scrollHeight : 0}px`,
      duration: reduced.current ? 0 : MS.swap,
      ease: "out(4)",
      onComplete: () => {
        if (isOpening) el.style.height = "auto";
      },
    });
    plusAnims.current[i]?.rotate(isOpening ? 45 : 0);
  };

  const stageEnter = (i: number) => titleAnims.current[i]?.x(TRAVEL.nudge);
  const stageLeave = (i: number) => titleAnims.current[i]?.x(0);

  return (
    <div className="relative">
      <SEO
        title="Pricing: One Hourly Rate, Then a Scope"
        description="The consultation is billed by the hour with a one hour minimum. Project work is quoted after it, stage by stage: Diagnose, Build, Optimize."
        canonical="/pricing"
        // Both nodes are read off what the page renders: the stage rows and
        // the FAQ accordion. The rows carry no figure, so neither does the
        // catalog; the one published rate lives on /contact.
        schema={[
          serviceCatalogSchema({
            path: "/pricing",
            name: "Ziiro engagement stages",
            description:
              "Three stages, scoped one at a time: Diagnose to find what is worth building, Build to ship it, Optimize to keep it measured. Consultations are billed by the hour.",
            catalogName: "Stages",
            offerings: stages.map((stage) => ({
              name: stage.name,
              description: stage.desc,
            })),
          }),
        ]}
      />

      {/* ── Page hero ── */}
      <header ref={heroRef} className="clears-nav-page pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-el
            style={{ opacity: 0 }}
            className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( Ziiro / Pricing )
          </p>

          <h1
            data-hero-el
            className="mt-8 font-display font-semibold text-[var(--text-primary)]"
            style={{
              opacity: 0,
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
            }}
          >
            <SplitHeadline lead="One rate is published." tail="The rest is scoped." />
          </h1>

          <p
            data-hero-el
            style={{ opacity: 0 }}
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
          >
            {HOURLY} an hour for the consultation, {MINIMUM_LABEL}.
            Project work is quoted after it, one stage at a time. There is no
            price list, because there is no standard project.
          </p>

          <div
            data-hero-el
            style={{ opacity: 0 }}
            className="mt-14 flex items-center justify-between border-t border-[var(--border)] pt-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              [ 03 Stages ]
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {/* Zero-padded to match "[ 03 Stages ]" beside it, but the
                  number and the unit are derived: this line used to say
                  "01 Hour minimum" as a literal and would have kept saying it
                  after the minimum changed. */}
              [ {String(MINIMUM_ENGAGEMENT.amount).padStart(2, "0")}{" "}
              {MINIMUM_ENGAGEMENT.unit} minimum ]
            </p>
          </div>
        </div>
      </header>

      {/* ── How engaging works: the hour, then the scope ──
          This runs before the stage rows on purpose. A reader who meets the
          stages first asks what they cost; a reader who meets this first
          already knows the answer is "after the hour". */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-6">
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                Sec. 01 / How engaging works
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                [ 03 Steps ]
              </p>
            </div>
          </MotionReveal>

          <MotionReveal
            stagger={STAGGER.card}
            className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3"
          >
            {howItRuns.map((s, i) => (
              <MotionRevealItem key={s.step}>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    {String(i + 1).padStart(2, "0")} / 03
                  </p>
                  <p className="mt-5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
                    {s.step}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {s.line}
                  </p>
                </div>
              </MotionRevealItem>
            ))}
          </MotionReveal>
        </div>
      </section>

      {/* ── The three stages, read as units of scope ── */}
      <section className="pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-6">
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                Sec. 02 / What sets the price
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                [ 03 Stages ]
              </p>
            </div>
          </MotionReveal>

          <div ref={stagesRef} className="mt-4">
            {stages.map((stage, i) => (
              <article
                key={stage.name}
                data-stage-row
                style={{ opacity: 0 }}
                className="grid grid-cols-12 gap-x-4 gap-y-8 border-b border-[var(--border)] py-14 md:py-20"
                onMouseEnter={() => stageEnter(i)}
                onMouseLeave={() => stageLeave(i)}
              >
                <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="col-span-10 md:col-span-9">
                  <h2
                    data-stage-title
                    className="font-display font-semibold text-[var(--text-primary)]"
                    style={{
                      fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.04,
                    }}
                  >
                    {stage.name}
                  </h2>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {stage.desc}
                  </p>

                  {/* The page's actual job: not a figure, but what moves the
                      figure. Every stage says out loud what makes it bigger. */}
                  <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    [ Scoped by ]
                  </p>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    {stage.scopedBy}
                  </p>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    [ {stage.span} ]
                  </p>
                </div>

              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ: animated accordion ── */}
      <section className="pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-6">
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                Sec. 03 / Questions
              </p>
              <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                [ {String(faqs.length).padStart(2, "0")} Answers ]
              </p>
            </div>
          </MotionReveal>

          <div ref={faqListRef} className="mt-12 max-w-3xl">
            {faqs.map((f, i) => {
              const isOpen = openFaq.has(i);
              return (
                <div
                  key={f.q}
                  data-faq-row
                  style={{ opacity: 0 }}
                  className="border-b border-[var(--border)]"
                >
                  <button
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="group flex w-full items-center gap-5 py-6 text-left md:py-7"
                  >
                    <span className="shrink-0 font-mono text-xs text-[var(--text-secondary)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex-1 font-sans font-semibold tracking-tight transition-colors duration-150 ${
                        isOpen
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                      }`}
                      style={{ fontSize: "clamp(1.05rem, 1.8vw, 1.3rem)" }}
                    >
                      {f.q}
                    </span>
                    <span
                      data-faq-plus
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors group-hover:border-[var(--border-strong)] group-hover:text-[var(--text-primary)]"
                    >
                      <Plus size={14} />
                    </span>
                  </button>

                  <div
                    id={`faq-panel-${i}`}
                    ref={(el) => {
                      faqPanelRefs.current[i] = el;
                    }}
                    style={{ height: 0, overflow: "hidden" }}
                  >
                    <p className="max-w-xl pb-8 pl-9 pr-4 text-sm leading-relaxed text-[var(--text-secondary)] md:pl-10">
                      {f.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="pb-36">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Staggered rather than revealed as one slab: the closing lines
              arrive in reading order, which is most of what separates a
              statement from a block that merely faded in. */}
          <MotionReveal
            stagger={STAGGER.line}
            className="border-t border-[var(--border)] pt-20 text-center md:pt-28"
          >
            <MotionRevealItem>
              <p className="flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ( Next Step )
              </p>
            </MotionRevealItem>

            <MotionRevealItem>
              <h2
                className="mx-auto mt-8 font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                <SplitHeadline
                  lead="Still not sure which stage?"
                  tail="That is what the hour is for."
                />
              </h2>
            </MotionRevealItem>

            <MotionRevealItem>
              <div className="mt-12">
                <Link
                  to="/book-a-call"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-transform duration-150 ease-out hover:-translate-y-1"
                >
                  Book a call
                </Link>
              </div>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                [ Paid / {MINIMUM_LABEL} ]
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
