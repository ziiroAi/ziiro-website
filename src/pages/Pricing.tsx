import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { animate, createAnimatable, createTimeline, stagger } from "animejs";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import TextReveal from "@/shared/motion/TextReveal";
import { MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import SEO from "@/shared/components/SEO";
import {
  faqPageSchema,
  serviceCatalogSchema,
} from "@/shared/components/seo-schema";
import { PRICING_FAQS as faqs } from "@/features/pricing/entities/faqs";

/** How you engage, in order. The two-part model this page exists to explain:
 *  one published rate for the hour, then a scope. Without these three steps
 *  the hourly rate and the absence of project prices read as two unrelated
 *  pricing models rather than one sequence. */
const howItRuns = [
  {
    step: "The hour",
    line: "A paid consultation with a one hour minimum, at the rate shown on Contact. You bring the work that eats your week. You leave with a direction whether or not you go further.",
  },
  {
    step: "The scope",
    line: "We write down which stage you need and what it has to cover, and set the price for that stage. You see the number before any of it starts.",
  },
  {
    step: "The stage",
    line: "Work runs against that scope. If the scope has to change, it is re-quoted before the work happens rather than invoiced after it.",
  },
];

/** The same three stages Products.tsx sets out, read here as units of scope
 *  rather than as a catalogue of what gets built. Nothing else on this page is
 *  presented as a separate thing to buy. Spans are the ranges the site has
 *  always published, re-mapped onto the stage that absorbed them. */
const stages = [
  {
    name: "Diagnose",
    desc: "Find out what is worth building",
    covers: [
      "Process and role mapping",
      "KPI baselines taken before anything changes",
      "ROI models for each candidate system",
      "Priority matrix and build roadmap",
      "A written spec for the first system",
    ],
    scopedBy:
      "How many processes are in scope, and how much of the operation is already written down.",
    span: "Typical span: 1 to 3 weeks",
  },
  {
    name: "Build",
    desc: "Ship it into the operation",
    covers: [
      "Agent design and deployment",
      "Integration with the stack you already run",
      "Dashboard and control panel",
      "Access, handover and documentation",
      "An agreed acceptance check before it is called done",
    ],
    scopedBy:
      "How many workflows the system touches, and how reachable your existing tools are.",
    span: "Typical span: 4 to 12 weeks",
  },
  {
    name: "Optimize",
    desc: "Keep it earning after launch",
    covers: [
      "Outcome tracking against the Diagnose baselines",
      "Test loops and auto-tuning",
      "Learning reports on an agreed cadence",
      "Adjustments as the operation changes",
    ],
    scopedBy:
      "The cadence you want, and how many live systems are under measurement.",
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
  const [openFaq, setOpenFaq] = useState<number>(-1);

  const heroRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);
  const faqListRef = useRef<HTMLDivElement>(null);
  const faqPanelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const faqPanelAnims = useRef<(PanelAnimation | null)[]>([]);
  const titleAnims = useRef<Animatable[]>([]);
  const plusAnims = useRef<Animatable[]>([]);
  const openRef = useRef(-1);
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
    const prev = openRef.current;
    const next = prev === i ? -1 : i;
    openRef.current = next;
    setOpenFaq(next);

    faqPanelRefs.current.forEach((el, j) => {
      if (!el) return;
      const isOpening = j === next;
      const isClosing = j === prev && prev !== next;
      if (!isOpening && !isClosing) return;

      // Interruption-safe: cancel any in-flight animation, pin current height
      // before measuring. Height is the one property this page animates
      // outside transform and opacity, because an accordion has no fixed
      // target box to scale toward; the badge below runs on the same
      // DURATION.swap so panel and badge read as one event.
      faqPanelAnims.current[j]?.cancel();
      const from = el.getBoundingClientRect().height;
      el.style.height = `${from}px`;
      faqPanelAnims.current[j] = animate(el, {
        height: `${isOpening ? el.scrollHeight : 0}px`,
        duration: reduced.current ? 0 : MS.swap,
        ease: "out(4)",
        onComplete: () => {
          if (isOpening) el.style.height = "auto";
        },
      });
      plusAnims.current[j]?.rotate(isOpening ? 45 : 0);
    });
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
          faqPageSchema(faqs, "/pricing"),
        ]}
      />

      {/* ── Page hero ── */}
      <header ref={heroRef} className="pt-36 pb-16">
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
            One rate is published.
            <br />
            <span className="text-[var(--text-secondary)]">
              The rest is scoped.
            </span>
          </h1>

          <p
            data-hero-el
            style={{ opacity: 0 }}
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
          >
            The consultation is billed by the hour with a one hour minimum, at
            the rate on{" "}
            <Link
              to="/contact"
              className="text-[var(--text-primary)] underline underline-offset-4"
            >
              Contact
            </Link>
            . Project work is quoted after that hour, one stage at a time, once
            we know what the stage has to cover. That is the entire model: a
            published rate, then a scope. There is no price list, because there
            is no standard project.
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
              [ 01 Hour minimum ]
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
                Sec. 02 / What a stage covers
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

                <div className="col-span-10 md:col-span-5">
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
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
                    {stage.scopedBy}
                  </p>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    [ {stage.span} ]
                  </p>
                </div>

                <div className="col-span-12 md:col-span-5 md:col-start-8">
                  <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    [ Covers ]
                  </p>
                  <ul>
                    {stage.covers.map((item, j) => (
                      <li
                        key={item}
                        className="flex items-baseline gap-5 border-b border-[var(--border)] py-3.5 text-sm text-[var(--text-secondary)] last:border-b-0"
                      >
                        <span className="shrink-0 font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
                          {String(i + 1).padStart(2, "0")}.{j + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Framing statement: scroll-scrubbed word reveal ── */}
      <section className="pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="border-t border-[var(--border)] pt-6">
            <MotionReveal>
              <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ( Framing )
              </p>
            </MotionReveal>
            <TextReveal
              text="One published rate for the hour. One agreed scope for the stage. No packages in between."
              as="h2"
              className="mt-10 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(1.9rem, 4vw, 3.4rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            />
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
              const isOpen = openFaq === i;
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
                Still not sure which stage?
                <br />
                <span className="text-[var(--text-secondary)]">
                  That is what the hour is for.
                </span>
              </h2>
            </MotionRevealItem>

            <MotionRevealItem>
              <div className="mt-12">
                <Link
                  to="/contact"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-transform duration-150 ease-out hover:-translate-y-1"
                >
                  Book a consultation
                </Link>
              </div>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                [ Paid / one hour minimum ]
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
