import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createTimeline, stagger } from "animejs";
import SEO from "@/shared/components/SEO";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal from "@/shared/motion/MotionReveal";
import TextReveal from "@/shared/motion/TextReveal";
import VslPlayer from "@/shared/ui/vsl-player";
import { videos, watchPath } from "@/features/watch/videos";

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
 * Deliberately empty: the section below only renders once there are real
 * people in it. Add entries as `{ name, role, bio, photo? }`. Photos go
 * in public/team/ and should be square (600×600 is plenty).
 */
const team: { name: string; role: string; bio: string; photo?: string }[] = [];

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

    const tl = createTimeline({ defaults: { duration: 700, ease: "out(3)" } });
    tl.add(label, { opacity: [0, 1], y: [14, 0] })
      .add(title, { opacity: [0, 1], y: [26, 0] }, "-=520")
      .add(subs, { opacity: [0, 1], y: [18, 0], delay: stagger(90) }, "-=540")
      .add(rule, { scaleX: [0, 1], duration: 800, ease: "inOut(3)" }, "-=460");

    return () => {
      tl.cancel();
    };
  }, []);

  return (
    <div className="relative">
      <SEO
        title="Who We Are: The Team Behind Ziiro"
        description="Ziiro is a small, operator-led AI and business intelligence consultancy. Watch the short video, then see how we work and who we build for."
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
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            We're Ziiro, a business-intelligence-first AI consultancy. Every
            engagement begins by understanding where your business spends time,
            money, and operational effort. Only once we've quantified those
            opportunities do we recommend technology.
          </p>

          {/* The homepage sells the value; this is the line that carries the
              story, so it gets its own weight rather than a bullet. */}
          <p
            data-hero-sub
            className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--text-primary)]"
            style={{ opacity: 0 }}
          >
            Most AI consultancies start with tools. We start with the numbers.
            That difference determines everything we build.
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
                — {FEATURED.vsl.runtime}, with what it covers written out.
              </p>
            )}
          </MotionReveal>
        </div>
      </section>

      {/* ── The ask, straight off the back of the video ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-16 text-center">
              <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( That's the whole pitch )
              </p>
              <h2
                className="font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                Let's look at
                <br />
                <span className="text-[var(--text-secondary)]">
                  your numbers.
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-sm text-[var(--text-secondary)]">
                Fifteen minutes. Real numbers. We'll show you where the hours
                and money are going.
              </p>
              <div className="mt-10">
                <Link
                  to="/contact"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
                >
                  Book a 15-minute call
                </Link>
              </div>

              {/* Handing over your numbers is the scary part; answer it here. */}
              <p className="mx-auto mt-7 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
                Your numbers stay yours. Nothing you share gets sold or passed
                on, and you can have it deleted whenever you ask.{" "}
                <Link
                  to="/privacy"
                  className="underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  How we handle your data
                </Link>
                .
              </p>
            </div>
          </MotionReveal>
        </div>
      </section>

      {/* ── 01 · Why we exist ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="01"
            label="Why We Started"
            meta="The origin"
            titleA="We got tired of"
            titleB="watching money burn."
          />
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <MotionReveal>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                Ziiro started from a pattern we kept seeing: companies buying
                AI the way you'd buy a lottery ticket. A chatbot nobody needed.
                A dashboard nobody opened. An automation that moved the
                bottleneck instead of removing it.
              </p>
            </MotionReveal>
            <MotionReveal delay={0.1}>
              <p className="max-w-lg leading-relaxed text-[var(--text-secondary)]">
                The technology was never the problem. Nobody had done the
                boring part first: mapping how the business actually runs,
                where the hours go, what a saved hour is worth. So we built a
                consultancy that refuses to skip it.
              </p>
            </MotionReveal>
          </div>

          <TextReveal
            text="We're the people who ask what it's worth before we ask what to build."
            as="h2"
            className="mt-16 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2rem, 4.4vw, 3.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
            }}
          />

          <MotionReveal delay={0.1}>
            <p className="mt-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              The principles behind that, and what we refuse to do, live on{" "}
              <Link
                to="/mission"
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                our mission page
              </Link>
              . The step-by-step version is on{" "}
              <Link
                to="/process"
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                the process page
              </Link>
              . Or skip the reading and{" "}
              <Link
                to="/contact"
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                book the call
              </Link>
              .
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── 02 · The team (renders only once `team` has real people in it) ── */}
      {team.length > 0 && (
        <section className="pb-24 md:pb-32">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <SectionHeader
              index="02"
              label="The Team"
              meta={`0${team.length} people`}
              titleA="The people who"
              titleB="do the work."
            />
            <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((m, i) => (
                <MotionReveal key={m.name} delay={i * 0.08}>
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
                    <h3
                      className="font-display font-semibold text-[var(--text-primary)]"
                      style={{ fontSize: "1.35rem", letterSpacing: "-0.02em" }}
                    >
                      {m.name}
                    </h3>
                    <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      {m.role}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {m.bio}
                    </p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
