import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { animate, createAnimatable, createTimeline, stagger } from "animejs";
import SEO from "@/components/SEO";
import MotionReveal from "@/components/motion/MotionReveal";
import TextReveal from "@/components/motion/TextReveal";
import SectionHeader from "@/components/ui/section-header";
import MethodPath from "@/components/ui/method-path";

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
    desc: "Visual documentation of every process step — flagging manual work, bottlenecks, repeated tasks, errors, and handoffs.",
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
    desc: "Establishing baseline metrics: revenue health, operational efficiency, error rates — before any changes.",
    days: "Week 1",
    gets: [
      "A KPI baseline sheet — your numbers before anything changes",
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
      "A fit assessment for each — and what we ruled out, and why",
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
    desc: "Ranking opportunities by value vs. implementation difficulty — a clear 2×2 grid for decision-making.",
    days: "Week 3",
    gets: [
      "A 2×2 value vs. difficulty matrix of every opportunity",
      "The single first build, with the rationale in writing",
      "A do-not-build list — things that don't pay for themselves",
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
  "Duration — 2-3 weeks",
  "Scope — Fixed",
  "Obligation — None",
];

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
    progressAnim.current = createAnimatable(progress.current, {
      p: 900,
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

    const tl = createTimeline({ defaults: { duration: 700, ease: "out(3)" } });
    tl.add(label, { opacity: [0, 1], y: [14, 0] })
      .add(title, { opacity: [0, 1], y: [26, 0] }, "-=520")
      .add(sub, { opacity: [0, 1], y: [18, 0] }, "-=540")
      .add(rule, { scaleX: [0, 1], duration: 800, ease: "inOut(3)" }, "-=460");

    return () => tl.cancel();
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
          y: [16, 0],
          delay: stagger(110),
          duration: reduced.current ? 0 : 700,
          ease: "out(3)",
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
              x: [-10, 0],
              delay: stagger(70),
              duration: reduced.current ? 0 : 520,
              ease: "out(3)",
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
        title="Process — The AI Transformation Audit"
        description="A fixed-scope, 2-3 week engagement that maps how your business runs and proves where AI pays for itself — before anything gets built."
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
            ( Ziiro — Process )
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
            itself — before anything gets built.
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
            sub="Seven phases over three weeks. Every one ends in a concrete artifact you keep — whether or not we ever build anything together."
          />

          <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-2">
            {/* The journey map rides along while the phases scroll */}
            <div className="hidden lg:block">
              <div className="sticky top-[calc(50vh_-_300px)] flex justify-center">
                <MethodPath
                  progress={progress.current}
                  labels={phases.map((p) => p.num)}
                />
              </div>
            </div>

            {/* Phase stations */}
            <div ref={blocksRef}>
              {phases.map((phase, i) => {
                const isActive = active === i;
                return (
                  <div
                    key={phase.num}
                    data-phase={i}
                    className="border-b border-[var(--border)] py-12 transition-opacity duration-500 first:pt-0"
                    style={{ opacity: isActive ? 1 : 0.35 }}
                  >
                    <div className="mb-3 flex items-baseline justify-between">
                      <span
                        className={`font-mono text-sm transition-colors duration-500 ${
                          isActive
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)]"
                        }`}
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
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal className="border-t border-[var(--border)] pt-20 text-center">
            <p className="flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
              Phase 00
            </p>

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

            <p className="mx-auto mt-7 max-w-md leading-relaxed text-[var(--text-secondary)]">
              Free 30 minutes. We'll tell you if the audit is even worth it for
              you.
            </p>

            <div className="mt-10 flex flex-col items-center gap-6">
              <Link
                to="/contact"
                className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] hover:opacity-85 transition-opacity"
              >
                Book the call
              </Link>
              <Link
                to="/audit"
                className="border-b border-[var(--text-primary)]/25 pb-1 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)]"
              >
                Try the self-audit →
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
