import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createTimeline, cubicBezier } from "animejs";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import { faqPageSchema } from "@/shared/components/seo-schema";
import SectionHeader from "@/shared/ui/section-header";
import ArrowFillLink from "@/shared/ui/arrow-fill-link";
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
import { FAQS, FAQ_GROUPS, faqsInGroup } from "@/features/faq/entities/questions";

/**
 * FAQ: the home of the question bank.
 *
 * ARCHITECTURE, and this is the point of the page. Every answer on this site
 * now comes from one array in src/features/faq/entities/questions.ts. This page
 * renders all of it; /pricing renders three and /docs renders five, both
 * selected from the same source by question text. Before this page existed the
 * bank lived under features/pricing and Docs kept three more of its own, which
 * is how a question ends up with two answers on two routes.
 *
 * STRUCTURED DATA. Only this route emits FAQPage now. /docs and /pricing each
 * used to emit their own, so the same questions were being published from two
 * URLs, and adding a third would have made it three. Google retired FAQ rich
 * results for every site in May 2026, so none of this is chasing a SERP
 * feature; the markup is kept purely for AI citation, and for that one
 * canonical URL per question is what you want. Both other pages now link here
 * instead.
 *
 * WHAT IS NOT ANSWERED HERE is deliberate and is documented in the bank: no
 * rate, because the figures are placeholders; no guarantee, because no policy
 * has been agreed; no booking instructions, because the link still points at an
 * old free event; and nothing about who owns what gets built, because Terms
 * section 05 says the opposite and no client-deliverable clause exists.
 */

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

/**
 * One question. Open by click or keyboard, closed by default.
 *
 * `grid-template-rows` rather than height: it animates to the answer's real
 * size without measuring it, and it collapses to nothing without display
 * toggling, so every word stays in the DOM for a crawler whether or not the
 * question has been opened. That matters more here than anywhere else on the
 * site, because the answers are the entire point of the page.
 */
function Question({ q, a, reduced }: { q: string; a: string; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  const id = q
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`faq-${id}`}
        className="flex w-full items-baseline gap-5 py-6 text-left"
      >
        <span
          aria-hidden="true"
          className="mt-[0.15em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]"
          style={{
            opacity: open ? 1 : 0.35,
            transitionProperty: "opacity",
            transitionDuration: reduced ? "0s" : `${DURATION.micro}s`,
            transitionTimingFunction: CSS_EASE.outExpo,
          }}
        />
        <span className="flex-1 font-display font-medium tracking-tight text-[var(--text-primary)] md:text-lg">
          {q}
        </span>
      </button>
      <div
        id={`faq-${id}`}
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transitionProperty: "grid-template-rows",
          transitionDuration: reduced ? "0s" : `${DURATION.swap}s`,
          transitionTimingFunction: CSS_EASE.outExpo,
        }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-7 pl-[calc(0.375rem+1.25rem)] text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Faq() {
  const heroRef = useRef<HTMLElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  // Hero entrance: label -> headline -> sub -> hairline, one sequenced
  // timeline. Elements start hidden via inline opacity so nothing flashes, and
  // they carry data-reveal so a crawler with no JS still receives the content.
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

    const step = ms(STAGGER.line);
    const tl = createTimeline({
      defaults: { duration: MS.reveal, ease: cubicBezier(...EASE_OUT_EXPO) },
    });
    tl.add(label, { opacity: [0, 1], y: [TRAVEL.reveal, 0] })
      .add(title, { opacity: [0, 1], y: [TRAVEL.line, 0] }, step)
      .add(sub, { opacity: [0, 1], y: [TRAVEL.reveal, 0] }, step * 2)
      .add(
        rule,
        { scaleX: [0, 1], duration: MS.statement, ease: cubicBezier(...EASE_IN_OUT) },
        step * 3,
      );

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <div className="relative">
      <SEO
        // Not swappable with any other page: no other route is the question
        // bank, and no other route promises answers to buying questions.
        title="FAQ: What Founders Ask Before the First Consultation"
        description="Straight answers to what the paid hour covers, what you need to prepare, how an engagement is scoped and timed, which models we use, and what happens when the numbers say do not build."
        canonical="/faq"
        // The only FAQPage on the site. /docs and /pricing render subsets of
        // the same bank and deliberately emit none, so no question is published
        // as structured data from two URLs at once.
        schema={[faqPageSchema(FAQS, "/faq")]}
      />

      {/* ── Page hero ── */}
      <header ref={heroRef} className="clears-nav-page pb-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            data-reveal
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( ZIIRO / FAQ )
          </p>
          <h1
            data-hero-title
            data-reveal
            className="font-display font-semibold text-[var(--text-primary)]"
            style={{
              opacity: 0,
              fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.04,
            }}
          >
            <SplitHeadline lead="The questions" tail="that come before a yes." />
          </h1>
          <p
            data-hero-sub
            data-reveal
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            Every answer on this site lives here. If a question is missing it is
            usually because we cannot answer it honestly yet, and a plausible
            answer is worse than none.
          </p>
          <div
            data-hero-rule
            className="mt-14 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {FAQ_GROUPS.map((group, i) => (
        <section key={group.id} className="pb-20 md:pb-24">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <SectionHeader
              index={String(i + 1).padStart(2, "0")}
              label={group.title}
              meta={`${String(faqsInGroup(group.id).length).padStart(2, "0")} questions`}
              titleA={group.title}
            />
            <MotionReveal>
              <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                {group.blurb}
              </p>
            </MotionReveal>
            <MotionReveal className="mt-10 max-w-3xl border-t border-[var(--border)]">
              {faqsInGroup(group.id).map((faq) => (
                <MotionRevealItem key={faq.q}>
                  <Question q={faq.q} a={faq.a} reduced={reduced} />
                </MotionRevealItem>
              ))}
            </MotionReveal>
          </div>
        </section>
      ))}

      {/* ── Still unanswered ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="max-w-2xl border-t border-[var(--border)] pt-10">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( Not answered here )
              </p>
              <h2
                className="mt-6 font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.08,
                }}
              >
                Ask it directly.
              </h2>
              <p className="mt-5 leading-relaxed text-[var(--text-secondary)]">
                The detail behind these answers is in{" "}
                <Link
                  to="/docs"
                  className="border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                >
                  Docs
                </Link>
                , and what each stage costs is on{" "}
                <Link
                  to="/pricing"
                  className="border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                >
                  Pricing
                </Link>
                . Anything else is a better conversation than a paragraph.
              </p>
              <div className="mt-10">
                <ArrowFillLink to="/book-a-call">Book a call</ArrowFillLink>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
