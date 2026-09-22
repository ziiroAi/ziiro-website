import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createTimeline, cubicBezier } from "animejs";
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
import { CONTACT_EMAIL } from "@/shared/lib/contact";

/**
 * Careers, with nothing to apply for.
 *
 * THE TONE IS THE BRIEF. The angle is that a company which automates work does
 * not currently need to hire, and the whole risk of the page is that it lands
 * as a firm being pleased with itself. Three rules held it in check:
 *
 *   1. The joke is made ONCE, in the h1, and the first paragraph underneath it
 *      immediately takes it apart. A page that keeps winking has stopped being
 *      dry and started being cute.
 *   2. It never claims agents replace people. /mission says AI is the mechanism
 *      and not the value, and that simple beats clever; a careers page boasting
 *      that robots cover the work would contradict the company's own beliefs
 *      two clicks away. Section 01 says out loud what agents do NOT do here.
 *   3. The reason for not hiring is cost discipline applied to ourselves, which
 *      is the same test /products applies to a client's automation. That makes
 *      the page consistent rather than clever.
 *
 * Every figure below is checkable from the site itself: zero openings and
 * three stages. Nothing here invents a headcount, a funding position, a salary
 * band or a client.
 *
 * There is no form because there is no form endpoint anywhere on this site any
 * more, and a fake one that silently dropped a real application would be worse
 * than a mailto.
 */

/** Big figures, small labels, the site's existing device. Both are facts a
 *  reader can verify on the site rather than claims about the company.
 *
 *  There were three. The third read "02 / Inboxes that reach a person", which
 *  stopped being true when the site collapsed to the single published address:
 *  a page whose whole argument is that every number on it is checkable cannot
 *  carry one that the footer disproves. Counting to one is not a figure worth
 *  setting in 5rem type either, so it is removed rather than rewritten as 01;
 *  the closing section already says "One inbox." in words, which is the right
 *  register for it. */
const FIGURES = [
  { figure: "00", label: "Open roles" },
  { figure: "03", label: "Stages we sell" },
];

/** A guess at where the pressure lands first, labelled as a guess in the
 *  section header and again in the copy. Deliberately not written as a job
 *  posting: there is no posting, and formatting a guess like one would be the
 *  same dishonesty as a fake application form. */
const FIRST_ROLES = [
  {
    num: "01",
    title: "Operations analyst",
    line: "Someone who can sit inside a business for a week and leave with a map that is actually true. An agent will happily draft one from the documents it is given. It cannot tell you which of those documents is fiction, and in most operations at least one of them is.",
  },
  {
    num: "02",
    title: "Systems engineer",
    line: "Someone who has put agents into a business that did not particularly want them, and kept them running six months later. Building the thing is the easy half. The half we would be hiring for is everything after it goes live.",
  },
];

/** What actually earns a reply. Written as instructions rather than as
 *  qualities, because "we value curiosity" tells a reader nothing they can
 *  act on and this page is supposed to be useful. */
const EARNS_A_REPLY = [
  {
    num: "01",
    line: "Something you built, that someone other than you used. A link is worth more than a paragraph about the link.",
  },
  {
    num: "02",
    line: "A number you can defend. What it cost, what it returned, and how you know that rather than assume it.",
  },
  {
    num: "03",
    line: "A time you told someone not to build the thing they asked for. This is the rarest one, and it is the one we would read twice.",
  },
  {
    num: "04",
    line: "Evidence you have read this page. A note addressed to the hiring team tells us you have not, since there is no hiring team.",
  },
];

const EMAILS = [CONTACT_EMAIL];

/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
const ms = (seconds: number) => Math.round(seconds * 1000);

export default function Careers() {
  const heroRef = useRef<HTMLElement>(null);

  // Hero entrance: label -> headline -> sub -> hairline, one sequenced
  // timeline. Elements start hidden via inline style so nothing flashes, and
  // every one of them carries data-reveal, which is what shows the copy when
  // JavaScript never runs. See the rule in index.css.
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

  return (
    <div className="relative">
      <SEO
        title="Careers: No Openings, and Why"
        description="We are not hiring today. What we would hire for when that changes, what earns a reply in the meantime, and the address that reaches a person."
        canonical="/careers"
      />

      {/* ── Page hero: the joke, once ── */}
      <header ref={heroRef} className="clears-nav-page pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            data-reveal
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( ZIIRO / CAREERS )
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
            <SplitHeadline lead="No openings." tail="The agents are keeping up." />
          </h1>
          {/* The joke is undercut in the very next sentence, on purpose. Left
              standing on its own it reads as a firm pleased with itself, which
              is the one thing this page cannot be. */}
          <p
            data-hero-sub
            data-reveal
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            That is the joke. It is also, for the moment, true: we stay small
            deliberately, and the systems we build for other people run enough
            of our own operation that nothing is currently hitting the floor.
            When something starts to, this page will say so.
          </p>
          <div
            data-hero-rule
            data-reveal
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {/* ── 01 · Why this page is empty ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="01"
            label="Why this page is empty"
            meta="Small on purpose"
            titleA="We are small"
            titleB="on purpose."
          />

          <MotionReveal
            stagger={STAGGER.card}
            className="mt-10 grid gap-10 md:grid-cols-2"
          >
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                A hire is a system like any other. It carries a cost to set up,
                a cost to run, and a return that somebody ought to be able to
                state before it starts. We put a client's automation through
                that test before we build it, and it would be a strange thing to
                exempt ourselves from. Right now the numbers do not clear.
              </p>
            </MotionRevealItem>
            <MotionRevealItem>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                The honest version is duller than the headline. Agents handle
                our scheduling, our first research passes and a fair amount of
                reporting. They do not do the part where somebody sits with an
                operations lead and works out what really happens on a Tuesday.
                There is not yet enough of that second thing to need another
                pair of hands, and it is the only part that was ever the job.
              </p>
            </MotionRevealItem>
          </MotionReveal>

          {/* Big figures, small labels. Two facts, both checkable on this
              site, which is the whole point of putting numbers on a page that
              could so easily have had none.

              sm:grid-cols-2, not the 3 this had: the column count is the data's
              count. Leaving it at 3 with two entries would have left a dead
              third cell and thrown the row off centre at every width above the
              phone breakpoint. */}
          <MotionReveal
            stagger={STAGGER.card}
            className="mt-16 grid grid-cols-1 gap-x-10 gap-y-10 border-t border-[var(--border)] pt-10 sm:grid-cols-2"
          >
            {FIGURES.map((f) => (
              <MotionRevealItem key={f.label}>
                <p
                  className="font-display font-semibold text-[var(--text-primary)]"
                  style={{
                    fontSize: "clamp(3rem, 7vw, 5rem)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {f.figure}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  {f.label}
                </p>
              </MotionRevealItem>
            ))}
          </MotionReveal>
        </div>
      </section>

      {/* ── 02 · The first hire, framed as a guess ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="02"
            label="The first hire"
            meta="A guess, not a posting"
            titleA="When it opens,"
            titleB="it will be a person."
          />

          <MotionReveal>
            <p className="mt-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              We have no posting and will not dress a guess up as one. If you
              want to know where we think the pressure lands first, here it is,
              and it is a guess.
            </p>
          </MotionReveal>

          <MotionReveal
            stagger={STAGGER.card}
            className="mt-14 border-t border-[var(--border)]"
          >
            {FIRST_ROLES.map((r) => (
              <MotionRevealItem key={r.num}>
                <div className="grid grid-cols-12 gap-x-4 gap-y-4 border-b border-[var(--border)] py-10 md:py-12">
                  <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                    {r.num}
                  </span>
                  <h3
                    className="col-span-10 font-display font-semibold text-[var(--text-primary)] md:col-span-4"
                    style={{
                      fontSize: "clamp(1.35rem, 2.4vw, 1.9rem)",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                    }}
                  >
                    {r.title}
                  </h3>
                  <p className="col-span-12 max-w-xl leading-relaxed text-[var(--text-secondary)] md:col-span-7 md:col-start-6">
                    {r.line}
                  </p>
                </div>
              </MotionRevealItem>
            ))}
          </MotionReveal>
        </div>
      </section>

      {/* ── 03 · What earns a reply ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="03"
            label="What earns a reply"
            meta="No CV required"
            titleA="Write anyway."
            titleB="This is what we read for."
          />

          <MotionReveal
            stagger={STAGGER.card}
            className="mt-14 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2"
          >
            {EARNS_A_REPLY.map((e) => (
              <MotionRevealItem key={e.num}>
                <div className="flex items-baseline gap-5 border-t border-[var(--border)] pt-6">
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    {e.num}
                  </span>
                  <p className="max-w-md leading-relaxed text-[var(--text-secondary)]">
                    {e.line}
                  </p>
                </div>
              </MotionRevealItem>
            ))}
          </MotionReveal>
        </div>
      </section>

      {/* ── Closing: one real inbox, no form ── */}
      <section className="pb-36">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal stagger={STAGGER.line}>
            <MotionRevealItem>
              <div className="border-t border-[var(--border)] pt-20 text-center">
                <p className="flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  ( Say hello )
                </p>
              </div>
            </MotionRevealItem>

            <MotionRevealItem>
              <h2
                className="mt-8 text-center font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                <SplitHeadline
                  lead="There is no form."
                  tail="A person reads it."
                />
              </h2>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mx-auto mt-6 max-w-xl text-center leading-relaxed text-[var(--text-secondary)]">
                Write to us. Tell us what you have built and what it
                was worth, and say what you would want to do here. If there is
                nothing open we will say that too, and we will keep the note.
              </p>
            </MotionRevealItem>

            <MotionRevealItem>
              <ul className="mt-12 flex flex-col items-center justify-center gap-x-10 gap-y-3 sm:flex-row">
                {EMAILS.map((email) => (
                  <li key={email}>
                    <a
                      href={`mailto:${email}?subject=Careers`}
                      // An address on its own line is an action, not a link
                      // inside a sentence, so the anchor owns a 44px target.
                      className="inline-flex min-h-[44px] items-center font-mono text-sm tracking-wide text-[var(--text-primary)] underline decoration-[color:var(--border-strong)] underline-offset-4 transition-opacity hover:opacity-70"
                      style={{
                        transitionDuration: `${DURATION.micro}s`,
                        transitionTimingFunction: CSS_EASE.outExpo,
                      }}
                    >
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                [ No form. No applicant tracker. One inbox. ]
              </p>
            </MotionRevealItem>

            <MotionRevealItem>
              <p className="mx-auto mt-10 max-w-md text-center text-sm leading-relaxed text-[var(--text-secondary)]">
                Looking for the paid consultation rather than a job?{" "}
                <Link
                  to="/book-a-call"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                  style={{
                    transitionDuration: `${DURATION.micro}s`,
                    transitionTimingFunction: CSS_EASE.outExpo,
                  }}
                >
                  Book a session
                </Link>
                .
              </p>
            </MotionRevealItem>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
