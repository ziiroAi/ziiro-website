import { useEffect, useRef, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { createTimeline, cubicBezier, stagger } from "animejs";
import SEO from "@/shared/components/SEO";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { EASE_IN_OUT, EASE_OUT_EXPO, MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import TextReveal from "@/shared/motion/TextReveal";
import { easeInOutCubic, headerOffset, scrollTo } from "@/shared/motion/SmoothScroll";
import VslPlayer from "@/shared/ui/vsl-player";
import { videos, watchPath } from "@/features/watch/videos";
// Testimonials are switched off on this page for now: restore this import
// together with the commented-out mount near the end of the file.
// import TestimonialsSection from "@/features/testimonials/TestimonialsSection";
import AtAGlance from "@/features/who-we-are/sections/AtAGlance";
import BookConsultation from "@/features/who-we-are/sections/BookConsultation";
import OurProcess, { PROCESS_ID } from "@/features/who-we-are/sections/OurProcess";
import WhatPowersZiiro from "@/features/who-we-are/sections/WhatPowersZiiro";
import WhatWeHelpWith from "@/features/who-we-are/sections/WhatWeHelpWith";
import WhyWorkWithUs from "@/features/who-we-are/sections/WhyWorkWithUs";

/**
 * ── THE VIDEO ─────────────────────────────────────────────────────────
 * Edit videos in `src/features/watch/videos.ts`. Each entry gets its own
 * watch page at /watch/<slug>, which is the page that carries the
 * VideoObject schema and the crawlable player.
 *
 * This page embeds the same video as a click-to-play facade: fast, no
 * third-party payload until someone presses play, and deliberately without
 * schema. Two pages claiming the same video splits the signal, and this one
 * would fail Google's watch-page test anyway, since the video is supporting
 * content here rather than the subject.
 *
 * The thumbnail is pulled from the video itself, so there is nothing to export
 * or upload: change the ID (or re-cut the video) and the frame follows.
 */
const FEATURED = videos[0];
const VSL = FEATURED?.vsl ?? null;

/**
 * ── TEAM ──────────────────────────────────────────────────────────────
 * Deliberately empty: the team block in Who We Are only renders once there
 * are real people in it. Add entries as `{ name, role, bio, photo? }`. Photos
 * go in public/team/ and should be square (600×600 is plenty).
 */
const team: { name: string; role: string; bio: string; photo?: string }[] = [];

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

export default function WhoWeAre() {
  const heroRef = useRef<HTMLElement>(null);

  // Hero entrance: label → headline → sub → hairline, one sequenced
  // timeline. Elements start hidden inline so nothing flashes on load.
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const label = root.querySelector<HTMLElement>("[data-hero-label]");
    const title = root.querySelector<HTMLElement>("[data-hero-title]");
    // Plural: the hero carries more than one paragraph, and a singular
    // querySelector would leave every one after the first stuck at opacity 0.
    const subs = [...root.querySelectorAll<HTMLElement>("[data-hero-sub]")];
    const rule = root.querySelector<HTMLElement>("[data-hero-rule]");
    if (!label || !title || !subs.length || !rule) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const el of [label, title, ...subs]) el.style.opacity = "1";
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
      .add(
        subs,
        { opacity: [0, 1], y: [TRAVEL.reveal, 0], delay: stagger(step) },
        step * 2,
      )
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

  // Through the smooth scroller and clear of the fixed navbar: a native anchor
  // jump fights Lenis and lands the section's heading under the bar.
  const jumpToProcess = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollTo(`#${PROCESS_ID}`, { offset: headerOffset(), easing: easeInOutCubic });
  };

  return (
    <div className="relative">
      <SEO
        title="Who We Are: Who You Hire and How We Work"
        description="No agency bench, no handover: the people who map your operations are the ones who build the systems. See how the three stages run, then watch the walkthrough."
        canonical="/who-we-are"
      />

      {/* ── Page hero ── */}
      <header ref={heroRef} className="pt-36">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( ZIIRO / WHO WE ARE )
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
            A small team you call
            <br />
            <span className="text-[var(--text-secondary)]">
              when AI has to pay for itself.
            </span>
          </h1>
          {/* Who you are actually hiring. This opened with "We're Ziiro, a
              business-intelligence-first AI consultancy", which is the same
              claim / and /mission were each making in their own words. The
              reader arriving here has already been told what Ziiro does; what
              they cannot get anywhere else is who does it. */}
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            A small team, not an agency bench. The people who map your
            operations are the same people who build the systems, and the same
            people you reach when something breaks at nine on a Friday.
          </p>

          {/* The second paragraph used to argue "most consultancies start with
              tools, we start with the numbers", which is a belief and now
              belongs to /mission alone. This one answers the other half of this
              page's job: the shape of an engagement. */}
          <p
            data-hero-sub
            className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--text-primary)]"
            style={{ opacity: 0 }}
          >
            An engagement runs in three stages, Diagnose, Build and Optimize.
            You keep the process maps and the roadmap whatever you decide to
            build at the end of it.
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {/* ── The VSL, dropped straight into the gap under the hero ── */}
      <section className="pb-16 md:pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <VslPlayer vsl={VSL} label="Watch First" flush />
            {FEATURED && (
              // A real link to the watch page, so crawlers reach it and people
              // who want the video on its own have somewhere to go.
              <p className="mt-5 text-sm text-[var(--text-secondary)]">
                <Link
                  to={watchPath(FEATURED.slug)}
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Open the full walkthrough
                </Link>{" "}
                ({FEATURED.vsl.runtime}), with what it covers written out.
              </p>
            )}
          </MotionReveal>
        </div>
      </section>

      {/* ── 01 · Who we are: the story, the positioning, the facts ──
          The page runs in six sections, in this order: Who We Are, What We
          Help With, Our Process (#process), Why Work With Us, What Powers
          Ziiro, and the closing CTA. Testimonials (#testimonials) belong
          between What Powers Ziiro and the CTA, but are commented out for now;
          they carry no index, so the numbering stays 01-05 either way. The hero
          and the video above open the first section. */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Was "The origin / We got tired of watching money burn", which
              told the same founding story as /mission section 02, down to the
              same three examples (a chatbot nobody needed, a dashboard nobody
              opened, an automation that moved the bottleneck). That story is
              why the company exists, so /mission keeps it and this section
              answers who is on the other end of the engagement instead. */}
          {/* This said "The people who scope it / are the people who build it."
              Section 04 (WhyWorkWithUs) has carried that exact pair all along,
              so the page was running the same H2 twice, and its sub said the
              same thing a third time. No-handoffs is 04's point; 01 takes the
              part nobody else on the page covers, which is what staying this
              small costs the reader as well as what it buys them. */}
          <SectionHeader
            index="01"
            label="Who We Are"
            meta="The trade-off"
            titleA="We take on less"
            titleB="than we could sell."
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
                Staying this small caps how many engagements can run at once, so
                we say no more often than a larger shop would. Sometimes the
                honest answer is that the timing is wrong, or that the problem
                you have does not need us.
              </p>
            </MotionRevealItem>
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                What the limit buys is that the estimate and the invoice belong
                to the same person. Nobody here can win an argument about scope
                by pointing at a colleague who has already rolled off the
                project.
              </p>
            </MotionRevealItem>
          </MotionReveal>

          <TextReveal
            text="Being small is the constraint that keeps the estimate honest."
            as="h2"
            className="mt-16 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2rem, 4.4vw, 3.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
            }}
          />

          <MotionReveal delay={STAGGER.card}>
            <p className="mt-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              The principles behind that, and what we refuse to do, live on{" "}
              <Link
                to="/mission"
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                our mission page
              </Link>
              . The step-by-step version is in{" "}
              <a
                href={`#${PROCESS_ID}`}
                onClick={jumpToProcess}
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                our process
              </a>
              , further down. Or skip the reading and{" "}
              <Link
                to="/contact"
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                book a consultation
              </Link>
              .
            </p>
          </MotionReveal>

          <AtAGlance />

          {/* The team, once `team` has real people in it. A block of Who We
              Are rather than a section of its own, so the page keeps its six
              sections in order whether or not it renders. */}
          {team.length > 0 && (
            <div className="mt-20">
              <h3 className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                ( The team )
              </h3>
              <MotionReveal
                stagger={STAGGER.card}
                className="mt-10 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3"
              >
                {team.map((m) => (
                  <MotionRevealItem key={m.name}>
                    <div className="border-t border-[var(--border)] pt-8">
                      {m.photo && (
                        <img
                          src={m.photo}
                          alt={m.name}
                          width={600}
                          height={600}
                          loading="lazy"
                          decoding="async"
                          className="mb-6 aspect-square w-full rounded-lg object-cover grayscale"
                        />
                      )}
                      <h4
                        className="font-display font-semibold text-[var(--text-primary)]"
                        style={{ fontSize: "1.35rem", letterSpacing: "-0.02em" }}
                      >
                        {m.name}
                      </h4>
                      <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                        {m.role}
                      </p>
                      <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {m.bio}
                      </p>
                    </div>
                  </MotionRevealItem>
                ))}
              </MotionReveal>
            </div>
          )}
        </div>
      </section>

      {/* ── 02 · What we help with ── */}
      <WhatWeHelpWith index="02" />

      {/* ── 03 · Our process, phase by phase (#process) ── */}
      <OurProcess index="03" />

      {/* ── 04 · Why work with us ── */}
      <WhyWorkWithUs index="04" />

      {/* ── 05 · What powers Ziiro, the stack ──
          Moved here from the home page. It lands directly after Why Work With
          Us because that section closes on "Model-agnostic", and this is the
          diagram that earns the claim. */}
      <WhatPowersZiiro index="05" />

      {/* ── Testimonials: switched off for now, nothing renders here ──
          Kept so it can come back: restore the TestimonialsSection import at
          the top of this file and uncomment the block below. Data lives in
          src/features/testimonials/entities/testimonials.ts, and the section
          renders nothing until a real entry exists (samples show in dev). The
          wrapper carries the #testimonials anchor so /who-we-are#testimonials
          lands even when the section renders null; when re-enabling, also drop
          the section's own id="testimonials" in TestimonialsSection.tsx, or the
          page carries that id twice. No CTA on the section: the closing ask
          follows straight after.

      <div id="testimonials">
        <TestimonialsSection />
      </div>
      */}

      {/* ── Book a consultation, or write to the team ── */}
      <BookConsultation />
    </div>
  );
}
