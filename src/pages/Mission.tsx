import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  animate,
  createAnimatable,
  createTimeline,
  cubicBezier,
  stagger,
} from "animejs";
import SEO from "@/shared/components/SEO";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import {
  CSS_EASE,
  DURATION,
  EASE_IN_OUT,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";
import TextReveal from "@/shared/motion/TextReveal";
import DotGlyph, { type GlyphVariant, type GlyphEnergy } from "@/shared/ui/dot-glyph";

const words = [
  {
    num: "01",
    word: "Leverage",
    meaning:
      "A force multiplier, not a replacement. We amplify the people, processes, and data you already have.",
  },
  {
    num: "02",
    word: "AI",
    meaning: "Our core tool, stated plainly. No hiding behind jargon.",
  },
  {
    num: "03",
    word: "Anywhere",
    meaning: "Any industry. Any function. Any process. We're not niche-locked.",
  },
];

const beliefs: {
  num: string;
  name: string;
  desc: string;
  glyph: GlyphVariant;
  figCaption: string;
}[] = [
  {
    num: "01",
    name: "Start with numbers. Always.",
    desc: "Every engagement begins with understanding operations, not pitching solutions.",
    glyph: "bars",
    figCaption: "Numbers first",
  },
  {
    num: "02",
    name: "AI is the mechanism, not the value.",
    desc: "The value is hours recovered, money saved, growth unlocked. AI is just how we get there.",
    glyph: "loops",
    figCaption: "The mechanism, not the value",
  },
  {
    num: "03",
    name: "Show, don't tell.",
    desc: "A before/after with real data beats any paragraph of promises. Every case study has ROI. Every recommendation has math behind it.",
    glyph: "path",
    figCaption: "Proof over promises",
  },
  {
    num: "04",
    name: "Simple beats clever.",
    desc: "If a spreadsheet fix saves more than an AI system, we'll tell you. We recommend what works, even if it's simpler and cheaper than expected.",
    glyph: "clusters",
    figCaption: "The simpler fix",
  },
  {
    num: "05",
    name: "Build what you preach.",
    desc: "We run our own company on the same systems we build for clients. If we wouldn't use it ourselves, we won't sell it to you.",
    glyph: "agents",
    figCaption: "Our own medicine",
  },
];

const steps = [
  {
    num: "01",
    name: "Understand",
    desc: "We audit your operations: processes, costs, time allocation, pain points. We find where the leaks are and put numbers on them.",
  },
  {
    num: "02",
    name: "Identify",
    desc: "Not every problem needs AI. We separate what's worth automating from what needs a simpler fix. Every recommendation comes with an ROI calculation.",
  },
  {
    num: "03",
    name: "Build",
    desc: "We design and deploy AI-powered systems tailored to your actual workflows, not off-the-shelf tools forced into your operations.",
  },
  {
    num: "04",
    name: "Measure",
    desc: "Every system we build has clear metrics. You know exactly what it's saving, what it's producing, and whether it's worth keeping.",
  },
];

type Animatable = ReturnType<typeof createAnimatable>;

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

export default function Mission() {
  const heroRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const beliefsRef = useRef<HTMLDivElement>(null);
  const titleAnims = useRef<Animatable[]>([]);
  const energyAnim = useRef<Animatable | null>(null);
  const energy = useRef<GlyphEnergy>({ speed: 1, gain: 0 });

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

    // Absolute positions rather than negative offsets: each element starts one
    // STAGGER.line after the one before it whatever its own duration is, which
    // is what keeps the whole entrance inside DURATION.entrance instead of
    // drifting every time a duration is retuned.
    const step = ms(STAGGER.line);
    const tl = createTimeline({
      defaults: { duration: MS.reveal, ease: cubicBezier(...EASE_OUT_EXPO) },
    });
    tl.add(label, { opacity: [0, 1], y: [TRAVEL.reveal, 0] })
      .add(title, { opacity: [0, 1], y: [TRAVEL.line, 0] }, step)
      .add(sub, { opacity: [0, 1], y: [TRAVEL.reveal, 0] }, step * 2)
      // The hairline is the only thing here that returns to where it began if
      // it is ever reversed, so it takes the symmetric curve.
      .add(
        rule,
        {
          scaleX: [0, 1],
          duration: MS.statement,
          ease: cubicBezier(...EASE_IN_OUT),
        },
        step * 3,
      );

    return () => {
      tl.cancel();
    };
  }, []);

  // The three tagline words rise in with a stagger the first time seen.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = wordsRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>("[data-word-row]");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        animate(rows, {
          opacity: [0, 1],
          // TRAVEL.line rather than TRAVEL.reveal: these are display words at
          // 4.4rem, and the distance a block travels reads relative to its
          // own size.
          y: [TRAVEL.line, 0],
          delay: stagger(ms(STAGGER.card)),
          duration: reduced ? 0 : MS.reveal,
          ease: cubicBezier(...EASE_OUT_EXPO),
        });
      },
      { threshold: 0.15 },
    );
    io.observe(list);
    return () => io.disconnect();
  }, []);

  // Hover-follow on belief titles + glyph energy modulation.
  useEffect(() => {
    const root = beliefsRef.current;
    if (!root) return;
    const titles = [...root.querySelectorAll<HTMLElement>("[data-belief-title]")];
    // DURATION.micro, not the 450ms this used to run at: a hover that takes
    // nearly half a second to start reads as the page thinking about it rather
    // than the title being attached to the pointer.
    titleAnims.current = titles.map((el) =>
      createAnimatable(el, { x: MS.micro, ease: cubicBezier(...EASE_OUT_EXPO) }),
    );
    // The glyph is a canvas warming up rather than a pointer-tracked element,
    // so it gets the slower of the two micro durations.
    energyAnim.current = createAnimatable(energy.current, {
      speed: MS.swap,
      gain: MS.swap,
      ease: cubicBezier(...EASE_OUT_EXPO),
    });
    return () => {
      titleAnims.current.forEach((a) => a.revert());
      titleAnims.current = [];
      energyAnim.current?.revert();
      energyAnim.current = null;
    };
  }, []);

  // A nudge, not a lift: a belief row is prose, not a link, and a block that
  // rises under the pointer is a promise that something will happen if you
  // click it. TRAVEL.nudge is the smallest acknowledgement the token set has.
  const rowEnter = (i: number) => {
    titleAnims.current[i]?.x(TRAVEL.nudge);
    energyAnim.current?.speed(2.4);
    energyAnim.current?.gain(0.35);
  };

  const rowLeave = (i: number) => {
    titleAnims.current[i]?.x(0);
    energyAnim.current?.speed(1);
    energyAnim.current?.gain(0);
  };

  return (
    <div className="relative">
      <SEO
        title="Our Mission: We Don't Sell AI. We Sell Results."
        description="Ziiro is a Business Intelligence and AI consultancy that starts with understanding your operations, then builds systems that deliver measurable returns."
        canonical="/mission"
      />

      {/* ── Page hero ── */}
      <header ref={heroRef} className="pt-36 pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( ZIIRO / MISSION )
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
            We don't sell AI.
            <br />
            <span className="text-[var(--text-secondary)]">We sell results.</span>
          </h1>
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            Ziiro is a Business Intelligence and AI consultancy that starts with
            understanding your operations, then builds systems that deliver
            measurable returns.
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {/* ── 01 · Our mission ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="01"
            label="Our Mission"
            meta="Make AI useful"
            titleA="Make AI useful."
            titleB="Nothing else."
          />
          {/* Two columns that are always in view together, so they reveal from
              one trigger with STAGGER.card between them. Two independent
              triggers on a single row fire at whatever moment each column
              happens to cross the threshold, which reads as a stutter. */}
          <MotionReveal
            stagger={STAGGER.card}
            className="mt-10 grid gap-10 md:grid-cols-2"
          >
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                Not flashy. Not theoretical. Not "transformative" in a pitch
                deck. Every business has processes bleeding money and time.
                Most don't know which ones. Most AI consultants don't ask.
              </p>
            </MotionRevealItem>
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                We start where others skip: the business intelligence layer. We
                map how a company actually operates: where the hours go, where
                the money leaks, where the bottlenecks compound. Only then do we
                build. And we only build what the numbers prove is worth
                building.
              </p>
            </MotionRevealItem>
          </MotionReveal>
          <MotionReveal delay={STAGGER.card}>
            <p className="mt-12 max-w-3xl font-display text-xl font-semibold leading-relaxed text-[var(--text-primary)] md:text-2xl">
              Help businesses leverage AI anywhere it creates real, measurable
              value, and nowhere it doesn't.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── 02 · Why we exist ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="02"
            label="Why We Exist"
            meta="The problem"
            titleA="The AI industry"
            titleB="has a problem."
          />
          <MotionReveal
            stagger={STAGGER.card}
            className="mt-10 grid gap-10 md:grid-cols-2"
          >
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                Everyone's selling "AI transformation." Nobody's asking the
                basic question: does this actually make you money?
              </p>
            </MotionRevealItem>
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                We watched businesses spend lakhs on chatbots they didn't need,
                dashboards nobody opened, and automations that moved the
                bottleneck instead of removing it. The technology wasn't the
                problem. The understanding was.
              </p>
            </MotionRevealItem>
          </MotionReveal>

          {/* The page's statement: scroll-scrubbed word-by-word reveal */}
          <TextReveal
            text="AI without business intelligence is expensive guessing."
            as="h2"
            className="mt-16 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2rem, 4.4vw, 3.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
            }}
          />
        </div>
      </section>

      {/* ── 03 · What we believe ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="03"
            label="What We Believe"
            meta="05 principles"
            titleA="Five principles."
            titleB="No exceptions."
          />

          <div ref={beliefsRef} className="mt-16 border-t border-[var(--border)]">
            {/* No index delay here, unlike the four-across grids below. These
                rows are tall enough that each one crosses the viewport on its
                own, so a growing delay would not read as a cascade — it would
                just make the fifth row take a quarter of a second to notice it
                had been scrolled to. */}
            {beliefs.map((p, i) => (
              <MotionReveal key={p.num}>
                <div
                  className="group grid grid-cols-12 items-center gap-4 border-b border-[var(--border)] py-10 md:py-12"
                  onMouseEnter={() => rowEnter(i)}
                  onMouseLeave={() => rowLeave(i)}
                >
                  <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                    {p.num}
                  </span>
                  <div className="col-span-10 md:col-span-6">
                    <h3
                      data-belief-title
                      className="mb-3 font-display font-semibold text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]"
                      style={{
                        fontSize: "clamp(1.35rem, 2.6vw, 2.1rem)",
                        letterSpacing: "-0.03em",
                        // Inline rather than a duration- class: this is a hover
                        // response and belongs at DURATION.micro, and Tailwind's
                        // transition-colors would otherwise supply both its own
                        // duration and its own curve.
                        transitionDuration: `${DURATION.micro}s`,
                        transitionTimingFunction: CSS_EASE.outExpo,
                      }}
                    >
                      {p.name}
                    </h3>
                    <p className="max-w-md leading-relaxed text-[var(--text-secondary)]">
                      {p.desc}
                    </p>
                  </div>
                  <div className="hidden md:col-span-4 md:col-start-9 md:flex md:flex-col md:items-center md:justify-center">
                    <div
                      className="opacity-60 transition-opacity group-hover:opacity-90"
                      style={{
                        transform: "scale(0.6)",
                        transformOrigin: "center",
                        transitionDuration: `${DURATION.micro}s`,
                        transitionTimingFunction: CSS_EASE.outExpo,
                      }}
                    >
                      <DotGlyph variant={p.glyph} energy={energy} />
                    </div>
                    <p className="-mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      Fig. {p.num} / {p.figCaption}
                    </p>
                  </div>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 · What we do ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="04"
            label="What We Do"
            meta="04 steps"
            titleA="Understand. Identify."
            titleB="Build. Measure."
          />
          {/* One viewport trigger for the whole row, not four. Four cards that
              sit side by side each firing on their own arrive at slightly
              different times depending on where the row happens to stop, which
              reads as jitter; a parent stagger makes it one deliberate sweep. */}
          <MotionReveal
            stagger={STAGGER.card}
            className="mt-16 grid grid-cols-1 border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((s) => (
              <MotionRevealItem key={s.num}>
                <div className="h-full border-b border-[var(--border)] px-0 py-10 sm:pr-8 lg:border-b-0 lg:py-12">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {s.num}
                  </p>
                  <h3
                    className="mt-4 font-display font-semibold text-[var(--text-primary)]"
                    style={{ fontSize: "1.35rem", letterSpacing: "-0.02em" }}
                  >
                    {s.name}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {s.desc}
                  </p>
                </div>
              </MotionRevealItem>
            ))}
          </MotionReveal>
        </div>
      </section>

      {/* ── 05 · Who we serve ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="05"
            label="Who We Serve"
            meta="5–500 people"
            titleA="Industries don't limit us."
            titleB="Processes do."
          />
          <MotionReveal
            stagger={STAGGER.card}
            className="mt-10 grid gap-10 md:grid-cols-2"
          >
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                Businesses with 5 to 500 people who know they should be using
                AI but don't know where to start, or tried and got burned.
              </p>
            </MotionRevealItem>
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                We start with SMBs (₹50L–5Cr revenue) where the impact is
                immediate and measurable. As we grow, we scale to mid-market
                companies ready for full operational transformation. If your
                business runs on repeatable operations, there's something we
                can improve.
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>

      {/* ── 06 · The approach: the tagline, word by word ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="06"
            label="Our Approach"
            meta="03 words"
            titleA="Leverage AI Anywhere,"
            titleB="word by word."
          />

          <div ref={wordsRef} className="mt-16">
            {words.map((w) => (
              <div
                key={w.num}
                data-word-row
                className="grid grid-cols-12 items-baseline gap-4 border-t border-[var(--border)] py-10 md:py-14"
                style={{ opacity: 0 }}
              >
                <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                  {w.num}
                </span>
                <span
                  className="col-span-10 font-display font-semibold text-[var(--text-primary)] md:col-span-5"
                  style={{
                    fontSize: "clamp(2.4rem, 5.5vw, 4.4rem)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.04,
                  }}
                >
                  {w.word}
                </span>
                <p className="col-span-10 col-start-3 max-w-md leading-relaxed text-[var(--text-secondary)] md:col-span-5 md:col-start-8">
                  {w.meaning}
                </p>
              </div>
            ))}
            <div className="border-t border-[var(--border)]" />
          </div>

          <MotionReveal>
            <p className="mt-12 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
              The tagline isn't marketing. It's how we operate. We look at
              every function of a business (marketing, sales, operations,
              legal, accounts, HR, management) and find where AI creates
              leverage. Then we build it.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── 07 · The Ziiro standard ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  Sec. 07 / The Ziiro Standard
                </p>
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                  [ The bar ]
                </p>
              </div>
            </div>
          </MotionReveal>

          <TextReveal
            text="Could a random AI consultant have done this?"
            as="h2"
            className="mt-10 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2rem, 4.4vw, 3.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
            }}
          />

          <MotionReveal>
            <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              We ask it before we publish anything, recommend anything, or
              build anything. If the answer is yes, we haven't gone deep
              enough. Our work should show its depth: process maps, real
              numbers, specific frameworks.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-20 text-center">
              <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( Your biggest leak )
              </p>
              <h2
                className="font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                Let's find your
                <br />
                <span className="text-[var(--text-secondary)]">biggest leak.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-sm text-[var(--text-secondary)]">
                Fifteen minutes. Real numbers. We'll show you where the hours
                and money are going.
              </p>
              <div className="mt-12">
                {/* The site's house curve, applied inline because Tailwind's
                    `transition-opacity` ships its own timing function and,
                    being a class, outranks the zero-specificity :where() rule
                    in index.css that puts everything else on expo-out. */}
                <Link
                  to="/contact"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
                  style={{
                    transitionDuration: `${DURATION.micro}s`,
                    transitionTimingFunction: CSS_EASE.outExpo,
                  }}
                >
                  Book a 15-minute call
                </Link>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
