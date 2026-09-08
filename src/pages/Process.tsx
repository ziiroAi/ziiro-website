import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { animate, createAnimatable, createTimeline, stagger } from "animejs";
import SEO from "@/shared/components/SEO";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import TextReveal from "@/shared/motion/TextReveal";
import { CSS_EASE, DURATION, MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import SectionHeader from "@/shared/ui/section-header";
import MethodPath from "@/shared/ui/method-path";

interface Phase {
  num: string;
  name: string;
  output: string;
  desc: string;
  days: string;
  gets: string[];
}

const phases: Phase[] = [
  {
    num: "01",
    name: "Understand",
    output: "Business model canvas",
    desc: "Discovery sessions examining revenue models, customer journeys, operations, cost structure, and growth blockers.",
    days: "Days 1-3",
    gets: [
      "A one-page business model canvas of how you actually make money",
      "Documented revenue streams, cost structure, and customer journeys",
      "A ranked list of growth blockers, verified back to you",
    ],
  },
  {
    num: "02",
    name: "Map",
    output: "Process flowcharts",
    desc: "Visual documentation of every process step, flagging manual work, bottlenecks, repeated tasks, errors, and handoffs.",
    days: "Days 3-5",
    gets: [
      "Flowcharts for every core process, step by step",
      "Manual-work and bottleneck flags on each step",
      "A handoff map showing exactly where things stall",
    ],
  },
  {
    num: "03",
    name: "Measure",
    output: "KPI baselines",
    desc: "Establishing baseline metrics before any changes: revenue health, operational efficiency, error rates.",
    days: "Week 1",
    gets: [
      "A KPI baseline sheet: your numbers before anything changes",
      "Error and rework rates per process",
      "Cost-per-task estimates for the manual work we flagged",
    ],
  },
  {
    num: "04",
    name: "Identify",
    output: "AI opportunity list",
    desc: "Evaluating each problem against automation, prediction, summarization, classification, optimization, and decision assistance criteria.",
    days: "Week 2",
    gets: [
      "A scored list of AI opportunities tied to specific processes",
      "A fit assessment for each, plus what we ruled out and why",
    ],
  },
  {
    num: "05",
    name: "Calculate",
    output: "ROI per opportunity",
    desc: "Quantifying monthly savings, implementation costs, break-even timelines, and Year 1 ROI for every opportunity.",
    days: "Week 2",
    gets: [
      "An ROI model per opportunity: savings, cost, break-even",
      "Year 1 projections built on conservative assumptions",
      "A spreadsheet you can rerun with your own numbers",
    ],
  },
  {
    num: "06",
    name: "Prioritize",
    output: "Priority matrix",
    desc: "Ranking opportunities by value vs. implementation difficulty, on a clear 2×2 grid for decision-making.",
    days: "Week 3",
    gets: [
      "A 2×2 value vs. difficulty matrix of every opportunity",
      "The single first build, with the rationale in writing",
      "A do-not-build list: things that don't pay for themselves",
    ],
  },
  {
    num: "07",
    name: "Roadmap",
    output: "Implementation plan",
    desc: "Month-by-month implementation with milestones, dependencies, and success criteria for each system.",
    days: "Week 3",
    gets: [
      "A month-by-month implementation plan with dependencies",
      "Milestones and success criteria for each system",
      "A spec you can build with us, in-house, or with anyone else",
    ],
  },
];

const metaCells = [
  "Duration: 2-3 weeks",
  "Scope: Fixed",
  "Obligation: None",
];

/** The stagger tokens are in seconds, because framer-motion counts in seconds;
 *  anime.js counts in milliseconds. Everything handed to anime goes through
 *  here rather than being re-typed as a second, hand-rounded number. */
const ms = (seconds: number) => Math.round(seconds * 1000);

/** The dim-to-lit change on a phase station. Opacity and colour share one
 *  duration and one curve so a station lights as a single event; it is a style
 *  rather than a Tailwind class because DURATION.swap has no matching duration
 *  utility, and rounding it to 300ms would leave this page fractionally out of
 *  step with every other transition on the site. */
const PHASE_LIGHT =
  `opacity ${DURATION.swap}s ${CSS_EASE.outExpo}, ` +
  `color ${DURATION.swap}s ${CSS_EASE.outExpo}`;

export default function Process() {
  const [active, setActive] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef<HTMLDivElement>(null);
  const progress = useRef({ p: 0 });
  const progressAnim = useRef<ReturnType<typeof createAnimatable> | null>(null);
  const activeRef = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The reader can scroll back up, so this value has to reverse mid-flight:
    // symmetric easing, not the expo-out used for one-way travel.
    progressAnim.current = createAnimatable(progress.current, {
      p: MS.statement,
      ease: "inOut(2)",
    });
    return () => {
      progressAnim.current?.revert();
    };
  }, []);

  // Hero entrance: label -> headline -> sub -> hairline, one sequenced
  // timeline. Elements start hidden via inline style so nothing flashes;
  // the headline words themselves are handled by TextReveal.
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

    // out(4) is anime's nearest thing to the house expo-out curve. Each part
    // takes DURATION.statement and starts one STAGGER.line after the last, so
    // the hairline finishes drawing at about DURATION.entrance: one gesture,
    // rather than four overlaps tuned by hand until they looked right.
    const step = ms(STAGGER.line);
    const tl = createTimeline({
      defaults: { duration: MS.statement, ease: "out(4)" },
    });
    tl.add(label, { opacity: [0, 1], y: [TRAVEL.reveal, 0] }, 0)
      .add(title, { opacity: [0, 1], y: [TRAVEL.reveal, 0] }, step)
      .add(sub, { opacity: [0, 1], y: [TRAVEL.reveal, 0] }, step * 2)
      .add(rule, { scaleX: [0, 1] }, step * 3);

    // Braced so the cleanup returns void: `() => tl.cancel()` returns the
    // Timeline, which is not an EffectCallback.
    return () => {
      tl.cancel();
    };
  }, []);

  // Meta strip: cells rise in with a stagger the first time they're seen
  useEffect(() => {
    const strip = metaRef.current;
    if (!strip) return;
    const cells = strip.querySelectorAll<HTMLElement>("[data-meta-cell]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        animate(cells, {
          opacity: [0, 1],
          y: [TRAVEL.reveal, 0],
          delay: stagger(ms(STAGGER.card)),
          duration: reduced.current ? 0 : MS.reveal,
          ease: "out(4)",
        });
      },
      { threshold: 0.4 },
    );
    io.observe(strip);
    return () => io.disconnect();
  }, []);

  // Activate the phase crossing the vertical center of the viewport
  useEffect(() => {
    const root = blocksRef.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>("[data-phase]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.phase);
          if (idx !== activeRef.current) {
            activeRef.current = idx;
            setActive(idx);
            progressAnim.current?.p(idx);
            // "You get" items relight with a small stagger on arrival
            const items = root.querySelectorAll<HTMLElement>(
              `[data-phase="${idx}"] [data-get]`,
            );
            animate(items, {
              opacity: [0.2, 1],
              x: [-TRAVEL.nudge, 0],
              delay: stagger(ms(STAGGER.tight)),
              duration: reduced.current ? 0 : MS.swap,
              ease: "out(4)",
            });
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    blocks.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative">
      <SEO
        title="Process: The AI Transformation Audit"
        description="A fixed-scope, 2-3 week engagement that maps how your business runs and proves where AI pays for itself, before anything gets built."
        canonical="/process"
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header ref={heroRef} className="pt-36 pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( Ziiro / Process )
          </p>

          {/* The page's statement: word-by-word reveal inside the sequenced hero */}
          <div data-hero-title className="mt-9" style={{ opacity: 0 }}>
            <TextReveal
              text="Understand first. Build second."
              as="h1"
              className="max-w-[17ch] font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            />
          </div>

          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            The AI Transformation Audit is a fixed-scope engagement that maps
            how your business actually runs and proves where AI pays for
            itself, before anything gets built.
          </p>

          {/* Meta strip: hairline top (drawn by the hero timeline) + bottom */}
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
          <div
            ref={metaRef}
            className="grid grid-cols-1 border-b border-[var(--border)] sm:grid-cols-3"
          >
            {metaCells.map((cell) => (
              <div
                key={cell}
                data-meta-cell
                className="border-t border-[var(--border)] py-5 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] first:border-t-0 sm:border-t-0 sm:border-l sm:pl-8 sm:first:border-l-0 sm:first:pl-0"
                style={{ opacity: 0 }}
              >
                {cell}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── The deep-dive ────────────────────────────────────── */}
      <section className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="01"
            label="The Audit, Phase by Phase"
            meta="07 phases"
            titleA="What happens,"
            titleB="and when."
            sub="Seven phases over three weeks. Every one ends in a concrete artifact you keep, whether or not we ever build anything together."
          />

          <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-2">
            {/* The journey map rides along while the phases scroll */}
            <div className="hidden lg:block">
              <div className="sticky top-[calc(50vh_-_360px)] flex justify-center">
                <MethodPath
                  progress={progress.current}
                  labels={phases.map((p) => p.num)}
                />
              </div>
            </div>

            {/* Phase stations */}
            <div ref={blocksRef}>
              {/* Staggered, so the stations arrive as a sequence rather than as
                  one wall of text. `first:pt-0` becomes an index test because
                  each station is now the only child of its own wrapper, and
                  the first-child variant would otherwise match all seven.

                  `amount={0}` is load-bearing, not a preference. An
                  IntersectionObserver threshold is a fraction of the TARGET,
                  so an element taller than 1/threshold viewports can never
                  reach it, and framer-motion's whileInView then never fires.
                  This column is seven stations (~3.6k px) tall: at the 0.2
                  house default it stayed at opacity 0 forever on a 375x667
                  screen — the entire page, permanently blank. Firing on first
                  contact is the only threshold a block this tall cannot miss,
                  and it stays correct if an eighth phase is ever added. */}
              <MotionReveal stagger={STAGGER.card} amount={0}>
                {phases.map((phase, i) => {
                  const isActive = active === i;
                  return (
                    <MotionRevealItem key={phase.num}>
                      <div
                        data-phase={i}
                        className={`border-b border-[var(--border)] pb-12 ${
                          i === 0 ? "" : "pt-12"
                        }`}
                        style={{
                          opacity: isActive ? 1 : 0.35,
                          transition: PHASE_LIGHT,
                        }}
                      >
                        <div className="mb-3 flex items-baseline justify-between">
                          <span
                            className={`font-mono text-sm ${
                              isActive
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-secondary)]"
                            }`}
                            style={{ transition: PHASE_LIGHT }}
                          >
                            {phase.num} / 07
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                            {phase.days}
                          </span>
                        </div>

                        <h3
                          className="mb-3 font-display font-semibold text-[var(--text-primary)]"
                          style={{
                            fontSize: "clamp(1.5rem, 2.4vw, 2.1rem)",
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {phase.name}
                        </h3>

                        <p className="mb-6 max-w-md leading-relaxed text-[var(--text-secondary)]">
                          {phase.desc}
                        </p>

                        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                          You get
                        </p>
                        <ul className="mb-7 max-w-md space-y-2.5">
                          {phase.gets.map((g) => (
                            <li
                              key={g}
                              data-get
                              className="flex items-start gap-3 text-sm leading-relaxed text-[var(--text-secondary)]"
                            >
                              <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--text-primary)] opacity-60" />
                              {g}
                            </li>
                          ))}
                        </ul>

                        <span className="neo-inset inline-block rounded-full px-4 py-2 font-mono text-xs tracking-wide text-[var(--text-secondary)]">
                          → {phase.output}
                        </span>
                      </div>
                    </MotionRevealItem>
                  );
                })}
              </MotionReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who runs it ──────────────────────────────────────── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="02"
            label="Who Runs It"
            meta="No handoffs"
            titleA="The people who scope it"
            titleB="are the people who build it."
            sub="We stay small on purpose. No account layers, no handoff to a junior after the pitch. The person who maps your process in week one is the person who ships the system in week ten."
          />
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <MotionReveal>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                What you end up with is working software: agents, dashboards,
                self-optimizing loops. Never a slide deck. Even if the audit
                ends with us telling you not to build anything, you keep the
                process maps, the baselines, and the ROI math.
              </p>
            </MotionReveal>
            <MotionReveal delay={STAGGER.card}>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                More on{" "}
                <Link
                  to="/who-we-are"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  who we are
                </Link>{" "}
                and the{" "}
                <Link
                  to="/mission"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  principles we work to
                </Link>
                . How we price the work is on{" "}
                <Link
                  to="/pricing"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  the pricing page
                </Link>
                .
              </p>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Staggered rather than revealed as one slab: the closing lines
              arrive in reading order, which is most of what separates a
              statement from a block that merely faded in. */}
          <MotionReveal
            stagger={STAGGER.line}
            className="border-t border-[var(--border)] pt-20 text-center"
          >
            <MotionRevealItem>
              <p className="flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                Phase 00
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
                It starts with
                <br />
                <span className="text-[var(--text-secondary)]">one call.</span>
              </h2>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mx-auto mt-7 max-w-md leading-relaxed text-[var(--text-secondary)]">
                Free 30 minutes. We'll tell you if the audit is even worth it for
                you.
              </p>
            </MotionRevealItem>

            <MotionRevealItem>
              <div className="mt-10 flex flex-col items-center gap-6">
                <Link
                  to="/contact"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity duration-150 ease-out hover:opacity-85"
                >
                  Book the call
                </Link>
                <Link
                  to="/audit"
                  className="border-b border-[var(--border-strong)] pb-1 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-150 ease-out hover:border-[var(--text-primary)]"
                >
                  Try the self-audit →
                </Link>
              </div>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
