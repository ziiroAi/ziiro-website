import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { animate, createAnimatable, createTimeline, stagger } from "animejs";
import SEO from "@/components/SEO";
import MotionReveal from "@/components/motion/MotionReveal";
import TextReveal from "@/components/motion/TextReveal";
import DotGlyph, { type GlyphVariant, type GlyphEnergy } from "@/components/ui/dot-glyph";

interface Product {
  name: string;
  sub: string;
  desc: string;
  deliverables: string[];
  glyph: GlyphVariant;
  figCaption: string;
  build: string;
}

const products: Product[] = [
  {
    name: "Agentic Systems",
    sub: "Custom AI operators",
    desc: "We build agents that handle real business workflows: research, routing, follow-ups, reporting, and the repetitive decisions that shouldn't live in a founder's head.",
    deliverables: ["Inbox & follow-up agents", "Research & enrichment", "Ops routing", "Reporting agents"],
    glyph: "agents",
    figCaption: "Operators in motion",
    build: "Typical build — 2-6 weeks",
  },
  {
    name: "Self-Optimizing Systems",
    sub: "Feedback loops that learn",
    desc: "Marketing, outreach, website, and workflow loops that track their own outcomes and improve automatically — instead of guessing forever.",
    deliverables: ["Outcome tracking", "A/B loops", "Auto-tuned campaigns", "Weekly learning reports"],
    glyph: "loops",
    figCaption: "A loop, learning",
    build: "Typical build — 2-4 weeks",
  },
  {
    name: "Business Intelligence",
    sub: "Data that drives decisions",
    desc: "KPI baselines, analytics dashboards, ROI calculations, and priority matrices that show exactly where to invest next.",
    deliverables: ["KPI baselines", "Live dashboards", "ROI models", "Priority matrix"],
    glyph: "bars",
    figCaption: "Signal over noise",
    build: "Typical build — 1-3 weeks",
  },
  {
    name: "AI Strategy Sprint",
    sub: "Know what to build",
    desc: "We map your team, stack, and constraints into a focused roadmap. No random tools — just the highest-leverage system to ship first.",
    deliverables: ["Team & stack audit", "Opportunity map", "Build roadmap", "First-system spec"],
    glyph: "path",
    figCaption: "The shortest route",
    build: "Typical build — 1-2 weeks",
  },
  {
    name: "Role Analyzer",
    sub: "People in the right seats",
    desc: "A people-fit diagnostic for founder-led teams: understand what each person should own and how to redesign roles for throughput.",
    deliverables: ["Role diagnostics", "Ownership map", "Throughput redesign", "Hiring guidance"],
    glyph: "clusters",
    figCaption: "Right people, right seats",
    build: "Typical build — 1 week",
  },
];

const sequence = [
  {
    step: "Audit",
    line: "Understand how the business actually runs — before touching any technology.",
  },
  {
    step: "Strategy",
    line: "Pick the one system the numbers justify. No AI for AI's sake.",
  },
  {
    step: "Build",
    line: "Ship a working system into your operation — not a slide deck.",
  },
  {
    step: "Optimize",
    line: "Loops track their own outcomes and keep improving after launch.",
  },
];

type Animatable = ReturnType<typeof createAnimatable>;

export default function Products() {
  const heroRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleAnims = useRef<Animatable[]>([]);
  const energyAnims = useRef<Animatable[]>([]);
  const energies = useRef<{ current: GlyphEnergy }[]>(
    products.map(() => ({ current: { speed: 1, gain: 0 } })),
  );

  // Hero entrance: label -> headline -> sub -> hairline, one sequenced
  // timeline. Elements start hidden via inline style so nothing flashes.
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

  // Entrance: product blocks rise in with a stagger the first time they're seen
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = listRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>("[data-prod-row]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        animate(rows, {
          opacity: [0, 1],
          y: [28, 0],
          delay: stagger(90),
          duration: reduced ? 0 : 800,
          ease: "out(3)",
        });
      },
      { threshold: 0.08 },
    );
    io.observe(list);
    return () => io.disconnect();
  }, []);

  // Animatables: hover-follow product names + per-glyph energy
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const titles = [...list.querySelectorAll<HTMLElement>("[data-prod-title]")];
    titleAnims.current = titles.map((el) =>
      createAnimatable(el, { x: 450, ease: "out(4)" }),
    );
    energyAnims.current = energies.current.map((e) =>
      createAnimatable(e.current, { speed: 400, gain: 400, ease: "out(2)" }),
    );
    return () => {
      titleAnims.current.forEach((a) => a.revert());
      energyAnims.current.forEach((a) => a.revert());
      titleAnims.current = [];
      energyAnims.current = [];
    };
  }, []);

  const rowEnter = (i: number) => {
    titleAnims.current[i]?.x(12);
    energyAnims.current[i]?.speed(2.4);
    energyAnims.current[i]?.gain(0.35);
  };

  const rowLeave = (i: number) => {
    titleAnims.current[i]?.x(0);
    energyAnims.current[i]?.speed(1);
    energyAnims.current[i]?.gain(0);
  };

  return (
    <div className="relative">
      <SEO
        title="Products — Systems, Not Software"
        description="Five ways Ziiro builds leverage: agentic systems, self-optimizing loops, business intelligence, AI strategy sprints, and role diagnostics. Every engagement ships a working system."
        canonical="/products"
      />

      {/* ---- Page hero ---- */}
      <section ref={heroRef} className="pt-36 pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( Ziiro — Products )
          </p>
          <h1
            data-hero-title
            className="font-display font-semibold text-[var(--text-primary)]"
            style={{
              opacity: 0,
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
            }}
          >
            Systems, not software.
            <br />
            <span className="text-[var(--text-secondary)]">
              Five ways we build leverage.
            </span>
          </h1>
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            Every engagement ships a working system — something running inside
            your business, doing real work, measured against real numbers. Not
            a license, not a slide deck. These are the five we build.
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </section>

      {/* ---- Five product blocks ---- */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div ref={listRef}>
            {products.map((p, i) => (
              <article
                key={p.name}
                data-prod-row
                className="grid grid-cols-12 items-center gap-x-6 gap-y-10 border-b border-[var(--border)] py-16 md:py-24"
                style={{ opacity: 0 }}
                onMouseEnter={() => rowEnter(i)}
                onMouseLeave={() => rowLeave(i)}
              >
                <div className="col-span-12 md:col-span-7">
                  <div className="flex items-baseline gap-6 md:gap-10">
                    <span className="font-mono text-sm text-[var(--text-secondary)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2
                        data-prod-title
                        className="font-display font-semibold text-[var(--text-primary)]"
                        style={{
                          fontSize: "clamp(1.7rem, 3.4vw, 2.7rem)",
                          letterSpacing: "-0.03em",
                          lineHeight: 1.04,
                        }}
                      >
                        {p.name}
                      </h2>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                        {p.sub}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 md:pl-[calc(2ch+2.5rem)]">
                    <p className="max-w-xl leading-relaxed text-[var(--text-secondary)]">
                      {p.desc}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2.5">
                      {p.deliverables.map((d) => (
                        <span
                          key={d}
                          className="neo-inset rounded-full px-4 py-2 font-mono text-xs tracking-wide text-[var(--text-secondary)]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                    <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70">
                      [ {p.build} ]
                    </p>
                  </div>
                </div>

                <div className="hidden md:col-span-4 md:col-start-9 md:flex md:flex-col md:items-center md:justify-center">
                  <DotGlyph variant={p.glyph} energy={energies.current[i]} />
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                    Fig. {String(i + 1).padStart(2, "0")} — {p.figCaption}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- The order that works ---- */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  Sec. 02 — Sequence
                </p>
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70 md:block">
                  [ 04 steps ]
                </p>
              </div>
            </div>
          </MotionReveal>

          {/* The page's statement: scroll-scrubbed word-by-word reveal */}
          <TextReveal
            text="The order that works."
            as="h2"
            className="mt-10 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.06,
            }}
          />

          <MotionReveal>
            <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              Start anywhere, but this is the route most teams take —
              understanding first, technology only when the numbers prove it.
            </p>
          </MotionReveal>

          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {sequence.map((s, i) => (
              <MotionReveal key={s.step} delay={i * 0.08}>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70">
                    {String(i + 1).padStart(2, "0")} / 04
                  </p>
                  <p className="mt-5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
                    {s.step}
                    {i < sequence.length - 1 && (
                      <span className="ml-3 text-[var(--text-secondary)]/60">→</span>
                    )}
                  </p>
                  <p className="mt-4 max-w-[26ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                    {s.line}
                  </p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Final CTA band ---- */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-20 text-center">
              <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( Start Anywhere )
              </p>
              <h2
                className="font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                Not sure which one
                <br />
                <span className="text-[var(--text-secondary)]">you need?</span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                That's exactly what the audit answers.
              </p>
              <Link
                to="/contact"
                className="mt-10 inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
              >
                Book a call
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
