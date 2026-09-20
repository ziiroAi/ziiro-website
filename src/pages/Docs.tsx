import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import { faqPageSchema } from "@/shared/components/seo-schema";
import DottedGrid from "@/shared/ui/dotted-grid";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, STAGGER } from "@/shared/motion/tokens";
import { PRICING_FAQS, type Faq } from "@/features/pricing/entities/faqs";
import { MIN_SESSION_MINUTES } from "@/features/pricing/entities/rates";
import { PHASES, PROCESS_TERMS } from "@/features/who-we-are/entities/phases";
import { videos, watchPath } from "@/features/watch/videos";

/**
 * Docs: the reference page, for someone who already knows what Ziiro is.
 *
 * WHAT THIS PAGE IS NOT. It used to re-introduce the company, restate the
 * three stages in full, and repeat the engagement steps that Products and
 * Pricing already own. That is why it read as a third copy of the site. Each
 * idea now has one home, and Docs' homes are: the diagnosis methodology, the
 * technical architecture, data and ownership, and the long FAQ. Everything
 * else here is a pointer, deliberately one sentence and a link.
 *
 * The lifecycle row names the four stages so a reader can place themselves,
 * and then LINKS OUT for what each contains (Products) and what each costs
 * (Pricing). If you find yourself explaining a stage here, it belongs there.
 *
 * The diagnosis phases are a native <details> accordion rather than fifty
 * lines of open text. <details> keeps its content in the HTML whether or not
 * it is open, so a crawler and a screen reader still get every phase; what
 * collapsing buys is a landing page a reader can actually scan.
 *
 * A section ships only once it has confirmed content. There is no placeholder
 * state, and the rail and each section number both derive from SECTIONS, so
 * adding or removing an entry renumbers everything together.
 */

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "lifecycle", title: "Engagement lifecycle" },
  { id: "diagnose", title: "Diagnose methodology" },
  { id: "implementation", title: "Implementation" },
  { id: "architecture", title: "Technical architecture" },
  { id: "data", title: "Data and ownership" },
  { id: "faqs", title: "FAQs" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/** The whole engagement in four words, one sentence each. This row exists so a
 *  reader can place themselves; what a stage CONTAINS is Products' and what it
 *  COSTS is Pricing's, and neither is restated here. */
const LIFECYCLE = [
  { name: "Consult", line: "One paid hour. We work out which stage you need." },
  { name: "Diagnose", line: "Map the operation and price the opportunity." },
  { name: "Build", line: "Ship the agents into the tools you already run." },
  { name: "Optimize", line: "Keep them measured and tuned after launch." },
];

/** Copied from src/pages/Pricing.tsx (the Build stage's covers). */
const BUILD_COVERS = [
  "Agent design and deployment",
  "Integration with the stack you already run",
  "Dashboard and control panel",
  "Access, handover and documentation",
  "An agreed acceptance check before it is called done",
];

/** The architecture, bottom of the stack to top. Who We Are used to carry this
 *  as "What Powers Ziiro"; that section was removed from it, so Docs is now
 *  this diagram's only home. */
const STACK = [
  { name: "Business data", body: "CRM, billing, ops, support, spreadsheets." },
  { name: "Business intelligence layer", body: "Where the hours and the money go." },
  { name: "Research agents", body: "Context gathered, enriched, verified." },
  { name: "Reasoning models", body: "GPT, Claude, Gemini.", swappable: true },
  { name: "Automation engine", body: "Routing, follow-ups, reporting." },
  { name: "Internal knowledge", body: "Your rules, your tone, your edge cases." },
  { name: "Continuous learning", body: "Outcomes fed back into the next run." },
  { name: "Business outcomes", body: "Hours returned, costs reduced." },
];

/** Data and ownership. Every row here restates something the site already
 *  commits to elsewhere and points at the document that binds it; nothing on
 *  this page is the authority for any of it. Do not add a row whose claim
 *  cannot be traced to the Privacy Policy, the Terms, or copy already shipped. */
const DATA_ROWS = [
  {
    term: "What we connect to",
    detail: "Only the systems the processes under review touch: CRM, billing, operations, support, spreadsheets.",
  },
  {
    term: "Where AI providers enter",
    detail: "Reasoning models are third-party APIs, interchangeable by design. The Terms govern how their outputs are treated.",
  },
  {
    term: "What you own",
    detail: "The process maps, the baselines and the ROI math, built or not. A shipped system comes with its access, handover and documentation.",
  },
  {
    term: "What is never done with it",
    detail: "Not sold. Not shared with third parties for their own purposes.",
  },
  {
    term: "Deletion",
    detail: "Request it at any time. The Privacy Policy sets out how, and what we must keep.",
  },
];

/** Docs owns the long FAQ; Pricing keeps only the few a buyer asks before
 *  booking. These are the questions that need more room than that page has.
 *  Composed with the shared list rather than duplicating it, and de-duplicated
 *  by question, so Pricing can trim its own array without stranding Docs or
 *  double-printing a question that moves into the shared file. */
const DOCS_ONLY_FAQS: Faq[] = [
  {
    q: "What if the diagnosis says don't build?",
    a: "Then that is the recommendation, and you still keep the process maps, the baselines and the ROI math. A stage that ends in evidence against building has done its job.",
  },
  {
    q: "Which model do you use?",
    a: "Whichever one suits the job. GPT, Claude and Gemini sit in one interchangeable layer of the architecture and none of them is the advantage: the system built around them and the business context feeding it are.",
  },
  {
    q: "What do you need access to?",
    a: "Only the systems the processes under review actually touch, and only from the point they are needed. What that means in practice is agreed during scoping, before any of it is connected.",
  },
];

const ALL_FAQS: Faq[] = [
  ...PRICING_FAQS,
  ...DOCS_ONLY_FAQS.filter((d) => !PRICING_FAQS.some((p) => p.q === d.q)),
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
 * target, but the rule has to stay tight under the words, so the height goes
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

/**
 * One row of a native accordion.
 *
 * <details> rather than a JS disclosure: the body stays in the HTML whether or
 * not the row is open, so a crawler, a screen reader and a reader with no
 * JavaScript all get every word. What collapsing buys is a landing page that
 * can be scanned, which is the whole reason this page shrank. `lead` is the
 * accent index or number, `meta` the right-aligned micro-label.
 */
function Disclosure({
  lead,
  title,
  meta,
  children,
}: {
  lead?: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-[var(--border)]">
      <summary
        className="flex cursor-pointer list-none items-baseline gap-4 py-4 text-[var(--text-primary)] hover:text-[var(--text-secondary)] [&::-webkit-details-marker]:hidden"
        style={micro}
      >
        {lead && (
          <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[var(--accent)]">
            {lead}
          </span>
        )}
        <span className="flex-1 font-semibold">{title}</span>
        {meta && <span className={`hidden sm:block ${monoMeta}`}>{meta}</span>}
        <span
          aria-hidden="true"
          className="font-mono text-[13px] leading-none text-[var(--text-muted)] group-open:rotate-45"
          style={{
            transitionProperty: "transform",
            transitionDuration: `${DURATION.micro}s`,
            transitionTimingFunction: CSS_EASE.out,
          }}
        >
          +
        </span>
      </summary>
      <div className={`pb-5 pr-2 ${lead ? "pl-[2.1rem]" : ""}`}>{children}</div>
    </details>
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
        title="Docs: Methodology, Architecture and Data"
        description="The reference page: how the diagnosis runs phase by phase, the architecture underneath the systems, what happens to your data, and the long-form answers."
        canonical="/docs"
        // The FAQ section renders these same answers in full.
        schema={[faqPageSchema(ALL_FAQS, "/docs")]}
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
                  <SplitHeadline lead="Documentation." tail="How Ziiro works." />
                </h1>
              </MotionRevealItem>

              {/* This page's one job, stated. It does not re-introduce the
                  company: four other pages already do that, and saying it a
                  fifth time is what made Docs read as a summary of a summary. */}
              <MotionRevealItem>
                <p className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                  The detail, for someone who already knows what we do: the diagnosis phase by phase,
                  the architecture underneath, and what happens to your data.
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
                <ul className="space-y-3">
                  <li>
                    <DocLink to="/contact">Book a strategy session</DocLink>. Paid, billed hourly, with a{" "}
                    {MIN_SESSION_MINUTES}-minute minimum.
                  </li>
                  <li>
                    <DocLink to={watchPath(walkthrough.slug)}>Watch the {walkthrough.vsl.runtime} walkthrough</DocLink>.{" "}
                    The whole business, end to end.
                  </li>
                  <li>
                    Email the team:{" "}
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

              <DocSection id="lifecycle">
                {/* Four names and one sentence each, then out. The contents of
                    a stage are Products', the price of one is Pricing's, and
                    restating either here is what this rewrite removed. */}
                {/* Canvas behind the process diagram, not behind the prose
                    above or the links below it. */}
                <div className="relative isolate">
                  <DottedGrid className="-inset-y-10 inset-x-0" />
                  <ol className="grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
                  {LIFECYCLE.map((step, i) => (
                    <li key={step.name} className="bg-[var(--background)] p-5">
                      <p className="flex items-baseline gap-2.5">
                        <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--accent)]">
                          {pad(i + 1)}
                        </span>
                        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">
                          {step.name}
                        </span>
                      </p>
                      <p className="mt-3 text-sm leading-relaxed">{step.line}</p>
                    </li>
                  ))}
                  </ol>
                </div>
                <ul className="space-y-1">
                  <li>
                    <DocLink to="/products" standalone>What each stage includes → Products</DocLink>
                  </li>
                  <li>
                    <DocLink to="/pricing" standalone>How each stage is priced → Pricing</DocLink>
                  </li>
                </ul>
              </DocSection>

              <DocSection id="diagnose">
                <p>Fixed in scope, seven phases. Open one for what it does and what it leaves behind.</p>
                <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {PROCESS_TERMS.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
                <div className="border-t border-[var(--border)]">
                  {PHASES.map((phase) => (
                    <Disclosure key={phase.num} lead={phase.num} title={phase.name} meta={phase.days}>
                      <p>{phase.desc}</p>
                      <p className="mt-2 font-mono text-[11px] tracking-[0.05em] text-[var(--text-secondary)]">
                        → {phase.output}
                      </p>
                    </Disclosure>
                  ))}
                </div>
              </DocSection>

              <DocSection id="implementation">
                <p>What the Build stage puts into your stack.</p>
                <ul className="space-y-2">
                  {BUILD_COVERS.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <span aria-hidden className="h-1 w-1 shrink-0 translate-y-[-0.2em] rounded-full bg-[var(--accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p>
                  Handover ends Build. Anything after it is scoped under Optimize on{" "}
                  <DocLink to="/pricing">Pricing</DocLink>.
                </p>
              </DocSection>

              <DocSection id="architecture">
                <p>
                  Anyone can call the same APIs we call. What compounds is the system built around them,
                  and the business context that feeds it.
                </p>
                {/* One stack, read bottom to top, drawn as stacked plates
                    rather than a numbered list: the point of the diagram is
                    that the model is one replaceable layer among eight. */}
                {/* Canvas behind the architecture stack. The paragraph above
                    it is body copy and deliberately keeps a clean ground. */}
                <div className="relative isolate">
                  <DottedGrid />
                  <ol className="overflow-hidden rounded-lg border border-[var(--border)]">
                  {STACK.map((layer, i) => (
                    <li
                      key={layer.name}
                      className="flex flex-col gap-1 border-b border-[var(--border)] px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-5"
                    >
                      <span className="flex shrink-0 items-baseline gap-2.5 sm:w-[13rem]">
                        <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
                          {pad(STACK.length - i)}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">{layer.name}</span>
                      </span>
                      <span className="flex-1 text-sm">{layer.body}</span>
                      {layer.swappable && <span className={`shrink-0 ${monoMeta}`}>Swappable</span>}
                    </li>
                  ))}
                  </ol>
                </div>
              </DocSection>

              <DocSection id="data">
                <dl>
                  {DATA_ROWS.map((row) => (
                    <div
                      key={row.term}
                      className="grid gap-1 border-t border-[var(--border)] py-4 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6"
                    >
                      <dt className="font-semibold text-[var(--text-primary)]">{row.term}</dt>
                      <dd>{row.detail}</dd>
                    </div>
                  ))}
                </dl>
                <p>
                  The binding versions are the <DocLink to="/privacy">Privacy Policy</DocLink> and the{" "}
                  <DocLink to="/terms">Terms</DocLink>. Where this page and those disagree, they win.
                </p>
              </DocSection>

              <DocSection id="faqs">
                {/* Every detailed question lives here rather than on Pricing,
                    which keeps only the few a buyer asks before booking. Same
                    accordion as the phases above, for the same reason: eight
                    full answers open at once is a wall, and collapsed they are
                    still every word of the FAQPage schema this page emits. */}
                <div className="border-t border-[var(--border)]">
                  {ALL_FAQS.map((faq) => (
                    <Disclosure key={faq.q} title={faq.q}>
                      <p>{faq.a}</p>
                    </Disclosure>
                  ))}
                </div>
              </DocSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
