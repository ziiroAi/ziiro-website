import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { animate, createAnimatable, createTimeline, stagger } from "animejs";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import TextReveal from "@/shared/motion/TextReveal";
import { MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import SEO from "@/shared/components/SEO";

const tiers = [
  {
    name: "Strategy Sprint",
    desc: "Understand where AI creates leverage",
    includes: [
      "Full AI Transformation Audit",
      "Process mapping & KPI baselines",
      "Opportunity identification & ROI models",
      "Priority matrix & architecture blueprint",
      "Implementation roadmap",
    ],
    cta: "Talk to us",
  },
  {
    name: "Full Build",
    desc: "Ship systems that compound",
    includes: [
      "Everything in Strategy Sprint",
      "Agentic system design & deployment",
      "Self-optimizing loop configuration",
      "Integration with your existing stack",
      "Dashboard & control panel setup",
      "Ongoing measurement & tuning",
    ],
    cta: "Talk to us",
  },
];

const faqs = [
  { q: "How do you scope a project?", a: "We start with a free 30-minute call to understand your business, then propose a focused scope based on where agents create the most leverage. No generic packages." },
  { q: "Can I start small?", a: "Absolutely. Most clients start with a Strategy Sprint to identify the highest-leverage system, then move to a Full Build once they see the roadmap." },
  { q: "What's the typical timeline?", a: "Strategy Sprints take 1-3 weeks. Full Builds range from 4-12 weeks depending on complexity. We work in focused sprints, not endless retainers." },
  { q: "Do you offer ongoing support?", a: "Yes. After the build, we offer measurement and optimization cycles to ensure your systems keep improving over time." },
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
  const tiersRef = useRef<HTMLDivElement>(null);
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

  // Engagement rows: staggered rise when scrolled into view + hover-follow titles
  useEffect(() => {
    const list = tiersRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>("[data-tier-row]");
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

    const titles = [...list.querySelectorAll<HTMLElement>("[data-tier-title]")];
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

  const tierEnter = (i: number) => titleAnims.current[i]?.x(TRAVEL.nudge);
  const tierLeave = (i: number) => titleAnims.current[i]?.x(0);

  return (
    <div className="relative">
      <SEO
        title="Investment: Ziiro AI Systems"
        description="No fixed pricing. Ziiro scopes each project to your needs: a Strategy Sprint (1-3 weeks) or a Full Build (4-12 weeks). Book a free call to start."
        canonical="/pricing"
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
            ( Ziiro / Investment )
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
            Scoped to you.
            <br />
            <span className="text-[var(--text-secondary)]">No menu prices.</span>
          </h1>

          <p
            data-hero-el
            style={{ opacity: 0 }}
            className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]"
          >
            Every project is different. We scope systems to your exact needs, with
            custom pricing based on scope, complexity, and timeline.
          </p>

          <div
            data-hero-el
            style={{ opacity: 0 }}
            className="mt-14 flex items-center justify-between border-t border-[var(--border)] pt-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              [ 02 Engagements ]
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              [ Free 30-min call ]
            </p>
          </div>
        </div>
      </header>

      {/* ── Engagements: numbered editorial rows ── */}
      <section className="pb-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div ref={tiersRef}>
            {tiers.map((tier, i) => (
              <article
                key={tier.name}
                data-tier-row
                style={{ opacity: 0 }}
                className="grid grid-cols-12 gap-x-4 gap-y-8 border-b border-[var(--border)] py-14 md:py-20"
                onMouseEnter={() => tierEnter(i)}
                onMouseLeave={() => tierLeave(i)}
              >
                <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="col-span-10 md:col-span-5">
                  <h2
                    data-tier-title
                    className="font-display font-semibold text-[var(--text-primary)]"
                    style={{
                      fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.04,
                    }}
                  >
                    {tier.name}
                  </h2>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {tier.desc}
                  </p>
                  <Link
                    to="/contact"
                    className="mt-10 hidden rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-transform duration-150 ease-out hover:-translate-y-1 md:inline-block"
                  >
                    {tier.cta}
                  </Link>
                </div>

                <div className="col-span-12 md:col-span-5 md:col-start-8">
                  <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    [ Includes ]
                  </p>
                  <ul>
                    {tier.includes.map((item, j) => (
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
                  <Link
                    to="/contact"
                    className="mt-8 inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] md:hidden"
                  >
                    {tier.cta}
                  </Link>
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
              text="We price the system, not the hours. Every engagement is scoped to what it ships and what it saves."
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
                Sec. 01 / Questions
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
                Not sure which path fits?
                <br />
                <span className="text-[var(--text-secondary)]">
                  Start with a free call.
                </span>
              </h2>
            </MotionRevealItem>

            <MotionRevealItem>
              <div className="mt-12">
                <Link
                  to="/contact"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-transform duration-150 ease-out hover:-translate-y-1"
                >
                  Book a Free Call
                </Link>
              </div>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                [ No pitch / just a clear read ]
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
