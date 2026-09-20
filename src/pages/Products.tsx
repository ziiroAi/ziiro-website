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
import SplitHeadline from "@/shared/components/SplitHeadline";
import { serviceCatalogSchema } from "@/shared/components/seo-schema";
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

/** One line of the catalogue: a thing that gets built, not a thing that gets
 *  chosen. Capabilities are only ever read inside the stage that owns them. */
interface Capability {
  name: string;
  line: string;
}

interface Stage {
  name: string;
  sub: string;
  desc: string;
  capabilities: Capability[];
  glyph: GlyphVariant;
  figCaption: string;
  handover: string;
}

/** The whole offer. Three stages, and nothing a reader is asked to choose
 *  between sits outside them: the five separately-branded services this page
 *  used to list are now capabilities inside the stage that produces them.
 *  Pricing.tsx names the same three and must stay in step. */
const stages: Stage[] = [
  {
    name: "Diagnose",
    sub: "Before anything gets built",
    desc: "We map how the business actually runs: where the hours go, which decisions repeat, and what a system would have to be worth to justify building it. Nothing is proposed until the numbers say what to propose.",
    capabilities: [
      {
        name: "Operations map",
        line: "How work moves through the business today, written down, including the parts nobody ever documented.",
      },
      {
        name: "KPI baselines",
        line: "The numbers as they stand before anything changes, so a later claim of improvement has something to be measured against.",
      },
      {
        name: "ROI models",
        line: "What each candidate system would have to save or earn, set against what it costs to build.",
      },
      {
        name: "Role diagnostics",
        line: "What each person should own, and which parts of their week a system should be taking off them.",
      },
      {
        name: "Build roadmap",
        line: "The order to build in, with the first system specified in enough detail to start on it.",
      },
    ],
    glyph: "path",
    figCaption: "The shortest route",
    handover: "You leave with a roadmap and a spec, whether or not we build it.",
  },
  {
    name: "Build",
    sub: "The system goes into the operation",
    desc: "Agents that do real work inside the tools you already run: research, routing, follow-up, reporting. Not a prototype in a sandbox, and not a license to something we host and you rent.",
    capabilities: [
      {
        name: "Workflow agents",
        line: "The repetitive decisions that currently live in a founder's head, handed to something that makes them the same way every time.",
      },
      {
        name: "Research and enrichment",
        line: "Agents that go and find what a person would otherwise be clicking through tabs to assemble by hand.",
      },
      {
        name: "Routing and follow-up",
        line: "Inbound work sorted and sent where it belongs, and the follow-ups that get forgotten sent anyway.",
      },
      {
        name: "Stack integration",
        line: "Wired into the systems you already pay for, rather than asking you to move off them.",
      },
      {
        name: "Dashboards and controls",
        line: "A panel showing what the agents did, and the switches to change what they do next.",
      },
    ],
    glyph: "agents",
    figCaption: "Operators in motion",
    handover: "You leave with a running system, the access to it, and the documentation for it.",
  },
  {
    name: "Optimize",
    sub: "After launch, it keeps moving",
    desc: "A system that ships and then sits still starts decaying the day the business changes. These loops watch their own outcomes and tune against them, then report what moved, so an improvement is something you can read rather than something we assert.",
    capabilities: [
      {
        name: "Outcome tracking",
        line: "Every run recorded against the baselines taken during Diagnose, so drift shows up while it is still small.",
      },
      {
        name: "Test loops",
        line: "Variants run against each other and the weaker one retired, instead of a preference argued in a meeting.",
      },
      {
        name: "Auto-tuned campaigns",
        line: "Outreach and marketing that adjust to what is working without waiting for someone to notice.",
      },
      {
        name: "Learning reports",
        line: "What the system changed, what it cost and what came back, in a form you can read in one sitting.",
      },
    ],
    glyph: "loops",
    figCaption: "A loop, learning",
    handover: "You leave with a measurement cycle, running on a cadence you agreed to.",
  },
];

/** The same three names again, answering the only question this page leaves
 *  open: which one is mine. Deliberately not a fourth vocabulary. */
const entryPoints = [
  {
    stage: "Diagnose",
    line: "Something is slow and expensive, but you cannot yet say which part is worth fixing first.",
  },
  {
    stage: "Build",
    line: "You already know what to build and want it running, not specified a second time.",
  },
  {
    stage: "Optimize",
    line: "Something is live, and nobody can tell you whether it is getting better.",
  },
];

type Animatable = ReturnType<typeof createAnimatable>;

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

export default function Products() {
  const heroRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleAnims = useRef<Animatable[]>([]);
  const energyAnims = useRef<Animatable[]>([]);
  const energies = useRef<{ current: GlyphEnergy }[]>(
    stages.map(() => ({ current: { speed: 1, gain: 0 } })),
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
          y: [TRAVEL.reveal, 0],
          delay: stagger(ms(STAGGER.card)),
          duration: reduced ? 0 : MS.reveal,
          ease: cubicBezier(...EASE_OUT_EXPO),
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
    // DURATION.micro, not the 450ms this used to run at: a hover that takes
    // nearly half a second to start reads as the page thinking about it rather
    // than the title being attached to the pointer.
    titleAnims.current = titles.map((el) =>
      createAnimatable(el, { x: MS.micro, ease: cubicBezier(...EASE_OUT_EXPO) }),
    );
    // The glyph is a canvas warming up rather than a pointer-tracked element,
    // so it gets the slower of the two micro durations.
    energyAnims.current = energies.current.map((e) =>
      createAnimatable(e.current, {
        speed: MS.swap,
        gain: MS.swap,
        ease: cubicBezier(...EASE_OUT_EXPO),
      }),
    );
    return () => {
      titleAnims.current.forEach((a) => a.revert());
      energyAnims.current.forEach((a) => a.revert());
      titleAnims.current = [];
      energyAnims.current = [];
    };
  }, []);

  // A nudge, not a lift: these rows are <article>s, not links, and a card that
  // rises under the pointer is a promise that something will happen if you
  // click it. TRAVEL.nudge is the smallest acknowledgement the token set has.
  const rowEnter = (i: number) => {
    titleAnims.current[i]?.x(TRAVEL.nudge);
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
        title="Products: What Gets Built at Each Stage"
        description="What actually ships: operations maps and ROI models, agents that route and follow up inside your stack, and loops that retune on their own outcomes."
        canonical="/products"
        // The catalog is the stage list itself, so the markup cannot drift
        // from the rows below it. Three offers, because there are three
        // things to engage on.
        schema={[
          serviceCatalogSchema({
            path: "/products",
            name: "Ziiro engagement stages",
            description:
              "The three stages Ziiro works in: Diagnose, which maps the operation and prices the opportunity; Build, which ships agents into it; and Optimize, which keeps them measured and tuned.",
            catalogName: "Stages",
            offerings: stages.map((stage) => ({
              name: stage.name,
              description: stage.desc,
            })),
          }),
        ]}
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
            ( Ziiro / Products )
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
            <SplitHeadline
              lead="Diagnose. Build. Optimize."
              tail="Everything we make sits in one of these three."
            />
          </h1>
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            What follows is the catalogue: what each stage produces, and what
            you are actually handed at the end of it. No stage ships a slide
            deck. What it costs to engage is set out on{" "}
            <Link
              to="/pricing"
              className="text-[var(--text-primary)] underline underline-offset-4"
            >
              Pricing
            </Link>
            .
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </section>

      {/* ---- The catalogue, in three stages ---- */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div ref={listRef}>
            {stages.map((stage, i) => (
              <article
                key={stage.name}
                data-prod-row
                className="grid grid-cols-12 gap-x-6 gap-y-10 border-b border-[var(--border)] py-16 md:py-24"
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
                        {stage.name}
                      </h2>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                        {stage.sub}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 md:pl-[calc(2ch+2.5rem)]">
                    <p className="max-w-xl leading-relaxed text-[var(--text-secondary)]">
                      {stage.desc}
                    </p>

                    {/* The catalogue proper. A definition list, not a pill
                        row: pills fit four words, and the point of this page
                        is that a reader can see what the thing actually is. */}
                    <dl className="mt-10 max-w-xl border-t border-[var(--border)]">
                      {stage.capabilities.map((c) => (
                        <div
                          key={c.name}
                          className="border-b border-[var(--border)] py-4"
                        >
                          <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
                            {c.name}
                          </dt>
                          <dd className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                            {c.line}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {/* Label and sentence split across two lines rather than
                        set as one bracketed mono string: at 10px with 0.25em
                        tracking these sentences overrun max-w-xl and the
                        closing bracket wraps onto a line of its own. Same
                        treatment as [ Scoped by ] on Pricing. */}
                    <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      [ Handover ]
                    </p>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                      {stage.handover}
                    </p>
                  </div>
                </div>

                <div className="hidden md:col-span-4 md:col-start-9 md:flex md:flex-col md:items-center md:justify-start md:pt-2">
                  {/* The glyph's canvas is a fixed 320px. This column is four
                      of twelve, which at exactly 768px is ~307px, so at the md
                      breakpoint the canvas hung 13px past the viewport and put
                      a horizontal scrollbar on the whole page. max-w-full caps
                      it to the column and scales the drawing down instead. */}
                  <DotGlyph
                    variant={stage.glyph}
                    energy={energies.current[i]}
                    className="max-w-full text-[var(--text-primary)]"
                  />
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">
                    Fig. {String(i + 1).padStart(2, "0")} / {stage.figCaption}
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
                  Sec. 02 / Where to start
                </p>
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                  [ 03 entry points ]
                </p>
              </div>
            </div>
          </MotionReveal>

          {/* The page's statement: scroll-scrubbed word-by-word reveal */}
          <TextReveal
            text="Most teams run these in order. You do not have to."
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
              Which stage you enter at depends on what you already know about
              your own operation. One of these three will sound like you.
            </p>
          </MotionReveal>

          {/* One viewport trigger for the whole row, not three. Cards that sit
              side by side each firing on their own arrive at slightly
              different times depending on where the row happens to stop, which
              reads as jitter; a parent stagger makes it one deliberate sweep. */}
          <MotionReveal
            stagger={STAGGER.card}
            className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3"
          >
            {entryPoints.map((e, i) => (
              <MotionRevealItem key={e.stage}>
                <div className="border-t border-[var(--border)] pt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    {String(i + 1).padStart(2, "0")} / 03
                  </p>
                  <p className="mt-5 font-mono text-sm font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
                    Start at {e.stage}
                  </p>
                  <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                    {e.line}
                  </p>
                </div>
              </MotionRevealItem>
            ))}
          </MotionReveal>
        </div>
      </section>

      {/* ---- Final CTA band ---- */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-20 text-center">
              <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( Next )
              </p>
              <h2
                className="font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                <SplitHeadline
                  lead="That is what gets built."
                  tail="Scoping it is one page over."
                />
              </h2>
              <p className="mx-auto mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                Pricing covers what a stage costs to engage and what sets its
                size.
              </p>
              {/* The site's house curve, applied inline because Tailwind's
                  `transition-opacity` ships its own timing function and, being
                  a class, outranks the zero-specificity :where() rule in
                  index.css that puts everything else on expo-out. */}
              <Link
                to="/pricing"
                className="mt-10 inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
                style={{
                  transitionDuration: `${DURATION.micro}s`,
                  transitionTimingFunction: CSS_EASE.outExpo,
                }}
              >
                See pricing
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
