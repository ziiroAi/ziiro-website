import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import SEO from "@/shared/components/SEO";
import { faqPageSchema } from "@/shared/components/seo-schema";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, STAGGER } from "@/shared/motion/tokens";
import { PRICING_FAQS } from "@/features/pricing/entities/faqs";
import { MIN_SESSION_MINUTES } from "@/features/pricing/entities/rates";
import { PHASES, PROCESS_TERMS } from "@/features/who-we-are/entities/phases";
import { videos, watchPath } from "@/features/watch/videos";

/**
 * Docs: the site's reference page.
 *
 * Every sentence here already exists somewhere on the site, or on the retired
 * Process page, and each copied block names its source so edits stay in step.
 * Where the business hasn't confirmed anything yet, a section says so with a
 * "Documentation in progress" note instead of filling the gap. Don't invent
 * content to make a section look complete.
 */

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "services", title: "Service documentation" },
  { id: "audit-methodology", title: "AI audit methodology" },
  { id: "process", title: "Process" },
  { id: "faqs", title: "FAQs" },
  { id: "guides", title: "Guides" },
  { id: "use-cases", title: "Use cases" },
  { id: "implementation", title: "Implementation" },
  { id: "technical", title: "Technical documentation" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** Copied from src/pages/Products.tsx (products). */
const SERVICES = [
  {
    name: "Agentic Systems",
    sub: "Custom AI operators",
    desc: "We build agents that handle real business workflows: research, routing, follow-ups, reporting, and the repetitive decisions that shouldn't live in a founder's head.",
    build: "Typical build: 2-6 weeks",
  },
  {
    name: "Self-Optimizing Systems",
    sub: "Feedback loops that learn",
    desc: "Marketing, outreach, website, and workflow loops that track their own outcomes and improve automatically, instead of guessing forever.",
    build: "Typical build: 2-4 weeks",
  },
  {
    name: "Business Intelligence",
    sub: "Data that drives decisions",
    desc: "KPI baselines, analytics dashboards, ROI calculations, and priority matrices that show exactly where to invest next.",
    build: "Typical build: 1-3 weeks",
  },
  {
    name: "AI Strategy Sprint",
    sub: "Know what to build",
    desc: "We map your team, stack, and constraints into a focused roadmap. No random tools, just the highest-leverage system to ship first.",
    build: "Typical build: 1-2 weeks",
  },
  {
    name: "Role Analyzer",
    sub: "People in the right seats",
    desc: "A people-fit diagnostic for founder-led teams: understand what each person should own and how to redesign roles for throughput.",
    build: "Typical build: 1 week",
  },
];

/** Copied from src/features/home/sections/HowItWorks.tsx (step titles). */
const ENGAGEMENT_STEPS = [
  "Discover the business",
  "Find the bottlenecks",
  "Measure the ROI",
  "Build the systems",
  "Optimize continuously",
];

/** Copied from src/pages/Pricing.tsx (the Full Build tier's includes). */
const FULL_BUILD = [
  "Everything in Strategy Sprint",
  "Agentic system design & deployment",
  "Self-optimizing loop configuration",
  "Integration with your existing stack",
  "Dashboard & control panel setup",
  "Ongoing measurement & tuning",
];

/** Copied from src/features/who-we-are/sections/WhatPowersZiiro.tsx (layers). */
const STACK = [
  { name: "Business data", body: "Your systems connected at the source: CRM, billing, ops, support, spreadsheets." },
  { name: "Business intelligence layer", body: "Where the hours and money go, mapped and quantified before anything is built." },
  { name: "Research agents", body: "Agents that gather, enrich, and verify context from inside and outside your business." },
  { name: "Reasoning models", body: "GPT, Claude, Gemini. Interchangeable by design, and never the differentiator.", swappable: true },
  { name: "Automation engine", body: "The layer that actually executes: routing, follow-ups, reporting, and the repetitive decisions." },
  { name: "Internal knowledge", body: "Your rules, your tone, your edge cases, held so every agent applies them the same way." },
  { name: "Continuous learning", body: "Outcomes fed back in, so each loop is tuned against what it produced last week." },
  { name: "Business outcomes", body: "Hours returned, costs reduced, decisions made faster, revenue found." },
];

/** Copied from src/pages/Contact.tsx (emails). */
const EMAILS = ["aniket@ziiro.work", "govind@ziiro.work"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Pointer feedback on the house micro timing, as in the footer. */
const micro = {
  transitionProperty: "color, border-color",
  transitionDuration: `${DURATION.micro}s`,
  transitionTimingFunction: CSS_EASE.out,
};

const inlineLink =
  "border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] hover:border-[var(--text-primary)]";

const monoMeta = "font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]";

/**
 * `standalone` is for a link that is the whole paragraph rather than a phrase
 * inside one. Those are navigation, not prose, so they need a thumb-sized
 * target — but the rule has to stay tight under the words, so the height goes
 * on the anchor and the border stays on a span inside it. A link set in a
 * sentence keeps the plain treatment: WCAG exempts inline links from the
 * target size, and padding one would space the line it sits in.
 */
function DocLink({
  to,
  children,
  standalone,
}: {
  to: string;
  children: ReactNode;
  standalone?: boolean;
}) {
  if (standalone) {
    return (
      <Link to={to} className="group inline-flex min-h-[44px] items-center" style={micro}>
        <span
          className="border-b border-[var(--border-strong)] pb-0.5 text-[var(--text-primary)] group-hover:border-[var(--text-primary)]"
          style={micro}
        >
          {children}
        </span>
      </Link>
    );
  }
  return (
    <Link to={to} className={inlineLink} style={micro}>
      {children}
    </Link>
  );
}

/** For a section, or part of one, the business hasn't confirmed yet. */
function InProgress({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="rounded-xl border border-dashed border-[var(--border-strong)] px-5 py-4">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
        [ Documentation in progress ]
      </p>
      <p className="mt-2">{children}</p>
    </div>
  );
}

/** A numbered document section: accent index, display title, hairline above. */
function DocSection({ id, children }: { id: SectionId; children: ReactNode }) {
  const i = SECTIONS.findIndex((s) => s.id === id);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-28 border-t border-[var(--border)] py-10 md:py-12"
    >
      {/* A low amount, because on a phone a long section can be several
          screens tall and would never reach the default fifth in view. */}
      <MotionReveal amount={0.05}>
        <div className="flex items-baseline gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">
            {pad(i + 1)}
          </p>
          <h2
            id={`${id}-title`}
            className="font-display text-xl font-semibold text-[var(--text-primary)] md:text-2xl"
            style={{ letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            {SECTIONS[i].title}
          </h2>
        </div>
        <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </MotionReveal>
    </section>
  );
}

export default function Docs() {
  const walkthrough = videos[0];

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Docs: Getting Started, Our Process & FAQs"
        description="Ziiro AI documentation: getting started, the five systems we build, the AI Transformation Audit methodology, pricing FAQs, and the stack behind it."
        canonical="/docs"
        // The FAQ section renders these same answers in full.
        schema={[faqPageSchema(PRICING_FAQS, "/docs")]}
      />
      <div className="min-h-screen pb-28">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          {/* ─── Page hero ─── */}
          <header className="pt-36 pb-16">
            <MotionReveal stagger={STAGGER.line}>
              <MotionRevealItem className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  ( Ziiro / Docs )
                </p>
                <p className={`hidden md:block ${monoMeta}`}>[ Docs / {pad(SECTIONS.length)} sections ]</p>
              </MotionRevealItem>

              <MotionRevealItem>
                <h1
                  className="mt-10 font-display font-semibold text-[var(--text-primary)]"
                  style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", letterSpacing: "-0.03em", lineHeight: 1.04 }}
                >
                  Documentation.
                  <br />
                  <span className="text-[var(--text-secondary)]">How Ziiro works.</span>
                </h1>
              </MotionRevealItem>

              {/* Copied from src/pages/Index.tsx (SEO description). */}
              <MotionRevealItem>
                <p className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                  Ziiro is a business-intelligence-first AI consultancy for founder-led teams. We find where
                  your hours and money go, quantify the ROI, then build only the systems the numbers justify.
                </p>
              </MotionRevealItem>
            </MotionReveal>
          </header>

          <div className="grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            {/* ─── Editorial index ─── */}
            <nav aria-label="Documentation contents" className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">
                ( Contents )
              </p>
              <ol className="mt-5 border-l border-[var(--border)]">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <Link
                      to={{ hash: `#${s.id}` }}
                      // py-3 below lg, where this index is a stacked list of
                      // thumb targets and 34px rows were too shallow to hit.
                      // From lg it is the sticky sidebar again, read with a
                      // pointer, and gets its compact rhythm back.
                      className="-ml-px flex items-baseline gap-3 border-l border-transparent py-3 pl-4 text-sm text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] lg:py-1.5"
                      style={micro}
                    >
                      <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]">{pad(i + 1)}</span>
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            {/* ─── Document body ─── */}
            <div className="min-w-0">
              <DocSection id="getting-started">
                {/* src/features/who-we-are/sections/OurProcess.tsx + src/pages/Contact.tsx (hero). */}
                <p>
                  It starts with a paid consultation, billed hourly, with a {MIN_SESSION_MINUTES}-minute minimum.
                  Bring the tasks that eat your week, and we&apos;ll work out which agents, automations and
                  workflows are worth building, and in what order.
                </p>
                <ul className="space-y-4">
                  <li>
                    <DocLink to="/contact">Book a strategy session</DocLink>. Leave with a plan you can act on.
                  </li>
                  <li>
                    <DocLink to={watchPath(walkthrough.slug)}>{walkthrough.seoTitle}</DocLink>.{" "}
                    {walkthrough.summary}
                  </li>
                  <li>
                    Questions before you book? Email us directly:{" "}
                    {EMAILS.map((email, i) => (
                      <span key={email}>
                        {i > 0 && " · "}
                        <a href={`mailto:${email}`} className={inlineLink} style={micro}>
                          {email}
                        </a>
                      </span>
                    ))}
                  </li>
                </ul>
              </DocSection>

              <DocSection id="services">
                <p>
                  Five systems. Full details are on <DocLink to="/products">Products</DocLink>.
                </p>
                <dl>
                  {SERVICES.map((s) => (
                    <div
                      key={s.name}
                      className="grid gap-2 border-t border-[var(--border)] py-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6"
                    >
                      <dt>
                        <span className="block font-semibold text-[var(--text-primary)]">{s.name}</span>
                        <span className={`mt-1 block ${monoMeta}`}>{s.sub}</span>
                      </dt>
                      <dd>
                        <p>{s.desc}</p>
                        <p className={`mt-2 ${monoMeta}`}>{s.build}</p>
                      </dd>
                    </div>
                  ))}
                </dl>
              </DocSection>

              <DocSection id="audit-methodology">
                {/* The retired Process page (hero and closing copy); phases and
                    terms come from Who We Are's entity. */}
                <p>
                  The AI Transformation Audit is a fixed-scope engagement that maps how your business actually
                  runs and proves where AI pays for itself, before anything gets built. It is part of the
                  Strategy Sprint on <DocLink to="/pricing">Pricing</DocLink>.
                </p>
                <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {PROCESS_TERMS.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
                <ol>
                  {PHASES.map((phase) => (
                    <li
                      key={phase.num}
                      className="grid gap-2 border-t border-[var(--border)] py-5 md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-6"
                    >
                      <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[var(--accent)]">
                        {phase.num}
                      </span>
                      <div>
                        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="font-semibold text-[var(--text-primary)]">{phase.name}</span>
                          <span className={monoMeta}>{phase.days}</span>
                        </p>
                        <p className="mt-1">{phase.desc}</p>
                        <p className="mt-2 font-mono text-[11px] tracking-[0.05em] text-[var(--text-secondary)]">
                          → {phase.output}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p>
                  Even if the audit ends with us telling you not to build anything, you keep the process maps, the
                  baselines, and the ROI math.
                </p>
              </DocSection>

              <DocSection id="process">
                {/* src/features/home/sections/HowItWorks.tsx + OurProcess.tsx. */}
                <p>
                  Most AI projects start by picking a tool. Ours start by finding out what a saved hour is actually
                  worth to you.
                </p>
                <ol className="space-y-2">
                  {ENGAGEMENT_STEPS.map((step, i) => (
                    <li key={step} className="flex items-baseline gap-4">
                      <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--accent)]">{pad(i + 1)}</span>
                      <span className="text-[var(--text-primary)]">{step}</span>
                    </li>
                  ))}
                </ol>
                <p>
                  If there&apos;s work worth doing after the consultation, the phases follow, and each one ends in
                  something concrete you keep, whether or not we build anything together.
                </p>
                <p>
                  <DocLink to="/who-we-are#process" standalone>See the process, phase by phase, on Who We Are →</DocLink>
                </p>
              </DocSection>

              <DocSection id="faqs">
                <dl>
                  {PRICING_FAQS.map((faq) => (
                    <div key={faq.q} className="border-t border-[var(--border)] py-5">
                      <dt className="font-semibold text-[var(--text-primary)]">{faq.q}</dt>
                      <dd className="mt-2">{faq.a}</dd>
                    </div>
                  ))}
                </dl>
                <p>
                  More on scope and pricing is on <DocLink to="/pricing">Pricing</DocLink>.
                </p>
              </DocSection>

              <DocSection id="guides">
                {/* src/features/watch/videos.ts. */}
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">
                    <DocLink to={watchPath(walkthrough.slug)} standalone>{walkthrough.seoTitle}</DocLink>
                  </p>
                  <p className="mt-2">{walkthrough.summary}</p>
                  <ul className="mt-4 space-y-2">
                    {walkthrough.covers.map((item) => (
                      <li key={item} className="flex items-baseline gap-3">
                        <span aria-hidden className="h-1 w-1 shrink-0 translate-y-[-0.2em] rounded-full bg-[var(--accent)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <InProgress>Written guides.</InProgress>
              </DocSection>

              <DocSection id="use-cases">
                <InProgress>Use cases.</InProgress>
                <p>
                  The work each system takes on is described on <DocLink to="/products">Products</DocLink>.
                </p>
              </DocSection>

              <DocSection id="implementation">
                {/* src/features/home/sections/HowItWorks.tsx (steps 04-05) + src/pages/Pricing.tsx. */}
                <p>Agents, loops, and dashboards shipped into your stack. Working systems, not slide decks.</p>
                <p>A Full Build includes:</p>
                <ul className="space-y-2">
                  {FULL_BUILD.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <span aria-hidden className="h-1 w-1 shrink-0 translate-y-[-0.2em] rounded-full bg-[var(--accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p>
                  Each system tracks its own outcomes and gets tuned against them, so performance compounds after
                  launch.
                </p>
              </DocSection>

              <DocSection id="technical">
                {/* src/features/who-we-are/sections/WhatPowersZiiro.tsx. */}
                <p>
                  Anyone can call the same APIs we call. What compounds is the system built around them, and the
                  business context that feeds it.
                </p>
                <ol>
                  {STACK.map((layer, i) => (
                    <li
                      key={layer.name}
                      className="grid gap-2 border-t border-[var(--border)] py-4 md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-6"
                    >
                      <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--accent)]">{pad(i + 1)}</span>
                      <div>
                        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-semibold text-[var(--text-primary)]">{layer.name}</span>
                          {layer.swappable && <span className={monoMeta}>Swappable</span>}
                        </p>
                        <p className="mt-1">{layer.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <InProgress>Integration, data-handling and security documentation.</InProgress>
                <p>
                  How AI outputs and third-party services are treated is set out in the{" "}
                  <DocLink to="/terms">Terms</DocLink>, and how data is handled in the{" "}
                  <DocLink to="/privacy">Privacy Policy</DocLink>.
                </p>
              </DocSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
