import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createAnimatable, createTimeline, cubicBezier } from "animejs";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
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
import TextFill from "@/shared/motion/TextFill";
import GridLift from "@/shared/motion/GridLift";
import DotGlyph, { type GlyphVariant, type GlyphEnergy } from "@/shared/ui/dot-glyph";

/**
 * Mission answers one question: why the numbers come first.
 *
 * It is also the only full explanation of the brand line anywhere on the site.
 * Everything else this page used to carry had a better home and has gone to it:
 * the four-step method and the three stages to /products, the process detail to
 * /docs, who we work with to /who-we-are. What is left is belief and the line,
 * because no other page is allowed to explain either.
 *
 * The brand line reads "Leverage AI Anywhere. Anywhere AI creates measurable
 * leverage. Not AI everywhere." That is a claim about discipline, not reach.
 * The older reading, "any industry, any function, any process", said only that
 * we are not niche-locked, which is not a differentiator and is not true to how
 * the work is actually scoped. Do not restore it.
 */

const beliefs: {
  num: string;
  name: string;
  desc: string;
  glyph: GlyphVariant;
  figCaption: string;
}[] = [
  {
    num: "01",
    name: "Start with numbers.",
    desc: "Understand the operation before recommending technology.",
    glyph: "bars",
    figCaption: "Numbers first",
  },
  {
    num: "02",
    name: "AI is the mechanism, not the value.",
    desc: "The value is time recovered, money saved or growth unlocked.",
    glyph: "loops",
    figCaption: "The mechanism, not the value",
  },
  {
    num: "03",
    name: "Simple beats clever.",
    desc: "If the right solution does not need AI, do not use AI.",
    glyph: "clusters",
    figCaption: "The simpler fix",
  },
];

/** Where we look, as the six words the section closes on. */
const CAPABILITIES = [
  "Sales",
  "Operations",
  "Finance",
  "Marketing",
  "Customer",
  "Management",
];

type Animatable = ReturnType<typeof createAnimatable>;

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

export default function Mission() {
  const heroRef = useRef<HTMLElement>(null);
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
        title="Our Mission: Why the Numbers Come First"
        description="Ziiro exists to make AI economically useful. The three principles we work by, and what Leverage AI Anywhere actually means."
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
            <SplitHeadline lead="We don't sell AI." tail="We sell results." />
          </h1>
          {/* Belief, not capability. This page used to open by naming the
              category Ziiro belongs to, which is the same sentence /, /who-we-are
              and /products were each opening with. What only this page can say
              is why the company exists and what it will not take money for. */}
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            The AI industry sells transformation and almost never goes back to
            check whether it paid. We exist to run that check first, and to turn
            the work down when the answer is no.
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
          <MotionReveal>
            <p className="mt-10 max-w-3xl font-display text-xl font-semibold leading-relaxed text-[var(--text-primary)] md:text-2xl">
              Ziiro exists to make AI economically useful. We understand how a
              business operates, identify where AI can create measurable
              leverage, and build only when the numbers justify it.
            </p>
          </MotionReveal>

          {/* The page's thesis, and the one line the rest of the site defers to
              on why measurement comes before building. */}
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

      {/* ── 02 · What we believe ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="02"
            label="What We Believe"
            meta="03 principles"
            titleA="Three principles."
            titleB="No exceptions."
          />

          <div ref={beliefsRef} className="mt-16 border-t border-[var(--border)]">
            {/* No index delay: these rows are tall enough that each one crosses
                the viewport on its own, so a growing delay would not read as a
                cascade, only as the last row being slow to notice it had been
                scrolled to. */}
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

      {/* ── 03 · Leverage AI Anywhere ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="03"
            label="Leverage AI Anywhere"
            meta="The line"
            titleA="Leverage AI Anywhere."
            titleB="Not AI everywhere."
          />
          <MotionReveal className="mt-10">
            <p className="max-w-3xl font-display text-xl font-semibold leading-relaxed text-[var(--text-primary)] md:text-2xl">
              Anywhere AI creates measurable leverage.
            </p>
          </MotionReveal>

          {/* The page's one Text Fill, and the line the human picked for it.
              It reads as grey and fills to ink as you scroll, which is the
              motion system's "this is an important principle". The sentence
              that used to sit here carried the same idea plus a list of the
              six functions, and that list is the row at the bottom of this
              section, so it was being said twice. */}
          <TextFill
            text="Anywhere doesn't mean everywhere. We use AI wherever the numbers justify it."
            as="p"
            className="mt-8 max-w-2xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(1.35rem, 2.4vw, 1.9rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          />

          {/* Grid Lift, immediately under the line, because it IS the line:
              an even field of information that only becomes structure where
              attention falls on it. No caption and no cards around it, since
              explaining an interaction that demonstrates itself would be the
              one thing that breaks it. Decorative, so the section's meaning
              survives without it for a crawler or a reader who never hovers. */}
          <GridLift className="mt-14" />

          {/* The section closes on where we look, as six words rather than six
              paragraphs. Wraps on a phone rather than scrolling sideways. */}
          <MotionReveal delay={STAGGER.card}>
            <ul className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-[var(--border)] pt-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {CAPABILITIES.map((c, i) => (
                <li key={c} className="flex items-center gap-5">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--text-muted)]"
                    />
                  )}
                  {c}
                </li>
              ))}
            </ul>
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
                <SplitHeadline lead="Let's find your" tail="biggest leak." />
              </h2>
              <div className="mt-12">
                {/* The site's house curve, applied inline because Tailwind's
                    `transition-opacity` ships its own timing function and,
                    being a class, outranks the zero-specificity :where() rule
                    in index.css that puts everything else on expo-out. */}
                <Link
                  to="/book-a-call"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
                  style={{
                    transitionDuration: `${DURATION.micro}s`,
                    transitionTimingFunction: CSS_EASE.outExpo,
                  }}
                >
                  Book a consultation
                </Link>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
