import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createTimeline, cubicBezier, stagger } from "animejs";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { EASE_IN_OUT, EASE_OUT_EXPO, MS, STAGGER, TRAVEL } from "@/shared/motion/tokens";
import AtAGlance from "@/features/who-we-are/sections/AtAGlance";
import BookConsultation from "@/features/who-we-are/sections/BookConsultation";
import WhyWorkWithUs from "@/features/who-we-are/sections/WhyWorkWithUs";

/**
 * ── WHO WE ARE ────────────────────────────────────────────────────────
 * One question: who you are actually hiring.
 *
 * Shape: hero, at a glance, origin, three differentiators, CTA.
 *
 * THE ORDER IS THE POINT, and it used to be the other way round. The review
 * said this page reads as a wall: not too long, but concentrated, with no way
 * in. Two things were true. The only scannable content, the four facts, sat
 * third, behind two paragraphs of prose; and scanning the large type returned
 * four display headlines that carry voice but not one fact about the company.
 * So the facts moved above the narrative and the narrative grew two headings.
 * Nothing was shortened. The page is deliberately quieter than /products and
 * /mission, which is its job: it is the human page.
 *
 * The content brief also called for a TEAM section here, and one was built and
 * then removed at the human's request. There is deliberately nothing about
 * individual people on this page now: the site holds no names, roles,
 * expertise lines, photographs or profile URLs, and inventing them was never
 * an option. If that changes, the section goes back between the origin and
 * "why work with us", and the indices below shift accordingly.
 *
 * Roughly half the site used to be duplicated inside this one page; what
 * left, and where it went:
 *
 *   - "What we help with", the three stages one line each -> /products owns
 *     the offer taxonomy outright.
 *   - "Our process", the seven phases -> /docs, which already renders the
 *     same PHASES data at #diagnose. Note the id: this page's anchor was
 *     #process, and nothing on the site answers to that name any more.
 *   - "What powers Ziiro", the stack -> /docs as technical architecture.
 *   - The embedded walkthrough player -> /watch owns the video. A sentence
 *     and a link is what the brief allows a page that is not its home.
 *
 */

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

/** The house micro-heading: mono, uppercase, wide tracking, accent dot. Same
 *  treatment the differentiator cards use, so the two labelled paragraphs in
 *  the origin section read as part of the same system rather than as a new
 *  voice introduced halfway down the page. */
const kicker =
  "flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]";

export default function WhoWeAre() {
  const heroRef = useRef<HTMLElement>(null);

  // Hero entrance: label -> headline -> sub -> hairline, one sequenced
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

  return (
    <div className="relative">
      <SEO
        // Was "The Team Behind Ziiro", written when this page carried a team
        // section. It no longer does, and a title promising people the page
        // does not name is the kind of thing that reads as a bounce.
        title="Who We Are: Who You Are Actually Hiring"
        description="A small, business-intelligence-first AI consultancy for founder-led businesses. Why the numbers come before the system, and what you keep either way."
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
            <SplitHeadline lead="A small team you call" tail="when AI has to pay for itself." />
          </h1>
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            A business-intelligence-first AI consultancy. The people who map
            your operation are the same people who build the systems.
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {/* ── The four facts, before the story that explains them ── */}
      <AtAGlance />

      {/* ── 01 · The origin ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="01"
            label="Origin"
            meta="Why we exist"
            titleA="Built to reverse"
            titleB="the usual order."
          />

          {/* Two named ideas, not one slab. The prose is unchanged to the
              word; what changed is that each paragraph now has a heading above
              it, so the block has somewhere to enter. At 390 these two
              paragraphs used to stack into a single fourteen-line run of grey
              with no break in it anywhere, which is the "wall" the review is
              actually describing. */}
          <MotionReveal stagger={STAGGER.card} className="mt-12 grid gap-12 md:grid-cols-2 md:gap-x-16">
            <MotionRevealItem>
              <h3 className={kicker}>
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                The pattern we kept seeing
              </h3>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                We kept seeing businesses buy AI before understanding the
                problem. Systems were being built before anyone had measured
                whether the problem was worth solving. Ziiro was built to
                reverse that order.
              </p>
            </MotionRevealItem>
            <MotionRevealItem>
              <h3 className={kicker}>
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                How we work instead
              </h3>
              <p className="mt-5 max-w-lg leading-relaxed text-[var(--text-secondary)]">
                So an engagement starts with the operation, not the tooling, and
                you keep the process maps and the roadmap whatever you decide to
                build at the end of it. The principles behind that live on{" "}
                <Link
                  to="/mission"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  our mission page
                </Link>
                .
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>

      {/* ── 02 · Why work with us, three differentiators ── */}
      <WhyWorkWithUs index="02" />

      {/* ── Book a consultation, or write to the team ── */}
      <BookConsultation />
    </div>
  );
}
