import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createTimeline } from "animejs";
import SEO from "@/shared/components/SEO";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal from "@/shared/motion/MotionReveal";
import TextReveal from "@/shared/motion/TextReveal";
import VslPlayer, {
  videoObjectSchema,
  type VslConfig,
} from "@/shared/ui/vsl-player";

/**
 * ── DROP THE VSL IN HERE ──────────────────────────────────────────────
 * Set this to a VslConfig object once the video is up and the player
 * swaps from placeholder to a real click-to-play frame, and the page
 * starts emitting VideoObject schema. Leave it `null` until then.
 *
 *   const VSL: VslConfig | null = {
 *     source: { kind: "youtube", id: "dQw4w9WgXcQ" },
 *     // or { kind: "vimeo", id: "123456789" }
 *     // or { kind: "file", src: "/vsl.mp4" }  ← file goes in public/
 *     title: "Why we started Ziiro",
 *     description: "A three-minute look at how we find the money and hours leaking out of a business, before anyone says the word AI.",
 *     uploadDate: "2026-08-01",   // ISO date the video went live
 *     duration: "PT3M42S",        // ISO 8601 runtime
 *     poster: "/vsl-poster.jpg",  // 1920×1080, lives in public/
 *     runtime: "3 min",           // shown on the frame
 *   };
 */
const VSL: VslConfig | null = null;

/**
 * ── TEAM ──────────────────────────────────────────────────────────────
 * Deliberately empty: the section below only renders once there are real
 * people in it. Add entries as `{ name, role, bio, photo? }`. Photos go
 * in public/team/ and should be square (600×600 is plenty).
 */
const team: { name: string; role: string; bio: string; photo?: string }[] = [];

const facts = [
  {
    num: "01",
    k: "What we are",
    v: "A business-intelligence-first AI consultancy. We measure before we build.",
  },
  {
    num: "02",
    k: "Who we work with",
    v: "Startups and founder-led teams, roughly 5–500 people, that want outcomes over optics.",
  },
  {
    num: "03",
    k: "What we ship",
    v: "Working systems: agents, dashboards, self-optimizing loops. Never a slide deck.",
  },
  {
    num: "04",
    k: "How we charge",
    v: "Against what the system is worth. If the numbers don't clear the cost, we say so.",
  },
];

const traits = [
  {
    num: "01",
    name: "We're operators, not theorists.",
    desc: "We run our own company on the systems we sell. Every agent, dashboard, and loop we recommend is one we've already lived with.",
  },
  {
    num: "02",
    name: "We'd rather lose the deal than oversell it.",
    desc: "If a spreadsheet, a process change, or nothing at all beats what we'd build, that's what you'll hear. It costs us projects. It's still the right call.",
  },
  {
    num: "03",
    name: "We show our working.",
    desc: "Process maps, baselines, ROI math. You should be able to check every number we put in front of you, and we'd rather you did.",
  },
  {
    num: "04",
    name: "We stay small on purpose.",
    desc: "No account layers, no handoffs to a junior after the pitch. The people who scope your work are the people who build it.",
  },
];

export default function WhoWeAre() {
  const heroRef = useRef<HTMLElement>(null);

  // Hero entrance: label → headline → sub → hairline, one sequenced
  // timeline. Elements start hidden inline so nothing flashes on load.
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

    const tl = createTimeline({ defaults: { duration: 700, ease: "out(3)" } });
    tl.add(label, { opacity: [0, 1], y: [14, 0] })
      .add(title, { opacity: [0, 1], y: [26, 0] }, "-=520")
      .add(sub, { opacity: [0, 1], y: [18, 0] }, "-=540")
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
        schema={VSL ? videoObjectSchema(VSL) : undefined}
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
            We're Ziiro, a business-intelligence-first AI consultancy. We
            spend the first part of every engagement finding out where your
            hours and money actually go, and the rest building only what those
            numbers justify.
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </header>

      {/* ── 01 · The VSL ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="01"
            label="Watch First"
            meta={VSL?.runtime ?? "Short"}
            titleA="Everything we do,"
            titleB="in a few minutes."
            sub="The fastest way to understand how we work. No deck, no discovery call required. Just what we look at, in what order, and why."
          />
          <MotionReveal delay={0.1}>
            <div className="mt-12">
              <VslPlayer vsl={VSL} label="Sec. 01 / The Video" />
            </div>
          </MotionReveal>
          <MotionReveal delay={0.15}>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Still have questions after watching?{" "}
              <Link
                to="/contact"
                className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                Book fifteen minutes
              </Link>{" "}
              and ask them directly.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── 02 · Why we exist ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="02"
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
        </div>
      </section>

      {/* ── 03 · The short version ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="03"
            label="The Short Version"
            meta="04 facts"
            titleA="If you only read"
            titleB="four lines."
          />
          <div className="mt-16 grid grid-cols-1 border-t border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f, i) => (
              <MotionReveal key={f.num} delay={i * 0.08}>
                <div className="h-full border-b border-[var(--border)] py-10 sm:pr-8 lg:border-b-0 lg:py-12">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {f.num}
                  </p>
                  <h3
                    className="mt-4 font-display font-semibold text-[var(--text-primary)]"
                    style={{ fontSize: "1.35rem", letterSpacing: "-0.02em" }}
                  >
                    {f.k}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {f.v}
                  </p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 · How we're different ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeader
            index="04"
            label="How We Work"
            meta="04 traits"
            titleA="Four things that"
            titleB="make us awkward."
          />
          <div className="mt-16 border-t border-[var(--border)]">
            {traits.map((t, i) => (
              <MotionReveal key={t.num} delay={i * 0.06}>
                <div className="group grid grid-cols-12 items-baseline gap-4 border-b border-[var(--border)] py-10 md:py-12">
                  <span className="col-span-2 font-mono text-sm text-[var(--text-secondary)] md:col-span-1">
                    {t.num}
                  </span>
                  <h3
                    className="col-span-10 font-display font-semibold text-[var(--text-primary)]/80 transition-colors duration-300 group-hover:text-[var(--text-primary)] md:col-span-6"
                    style={{
                      fontSize: "clamp(1.35rem, 2.6vw, 2.1rem)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {t.name}
                  </h3>
                  <p className="col-span-10 col-start-3 max-w-md leading-relaxed text-[var(--text-secondary)] md:col-span-4 md:col-start-9">
                    {t.desc}
                  </p>
                </div>
              </MotionReveal>
            ))}
          </div>
          <MotionReveal delay={0.1}>
            <p className="mt-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              The full set of principles, and what we refuse to do, lives on{" "}
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
              .
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* ── 05 · The team (renders only once `team` has real people in it) ── */}
      {team.length > 0 && (
        <section className="pb-24 md:pb-32">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <SectionHeader
              index="05"
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

      {/* ── Final CTA ── */}
      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-20 text-center">
              <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( Now you know us )
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
              <div className="mt-12">
                <Link
                  to="/contact"
                  className="inline-block rounded-full bg-[var(--text-primary)] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--background)] transition-opacity hover:opacity-85"
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
