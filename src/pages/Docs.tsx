import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import DottedGrid from "@/shared/ui/dotted-grid";
import StatefulOrb, { type OrbState } from "@/shared/ui/StatefulOrb";
import LifecycleFlow from "@/features/docs/diagrams/LifecycleFlow";
import PhaseTimeline from "@/features/docs/diagrams/PhaseTimeline";
import PriorityMatrix from "@/features/docs/diagrams/PriorityMatrix";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import { CSS_EASE, DURATION, STAGGER } from "@/shared/motion/tokens";
import { DOCS_FAQS } from "@/features/faq/entities/questions";
import { MIN_SESSION_MINUTES } from "@/features/pricing/entities/rates";
import {
  PHASES,
  PROCESS_TERMS,
  type MethodBlock,
} from "@/features/who-we-are/entities/phases";
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
/**
 * The five operational questions Docs shows, selected from the one bank in
 * src/features/faq/entities/questions.ts. Docs used to keep three of its own
 * here and merge them with Pricing's five, which meant the same question could
 * be answered differently on two routes. /faq owns the bank now and this page
 * renders a subset of it.
 */
const ALL_FAQS = DOCS_FAQS;

/**
 * Which of the seven states each diagnosis phase IS.
 *
 * This is a property of the phase, not a claim about right now. Opening
 * "Calculate" does not mean Ziiro is calculating for you at that moment; it
 * means that phase is the evaluating one, said in the vocabulary the rest of
 * the site uses. That is why the orb is driven by the accordion's own toggle
 * event and never by a timer: a timer would be animating a state nobody asked
 * for, which is the failure the state language exists to avoid.
 *
 * Read off each phase's own description in phases.ts rather than distributed
 * evenly for variety:
 *   Understand  discovery sessions, taking in the business   -> listening
 *   Map         processes documented and joined up           -> connecting
 *   Measure     baselines read off the operation             -> searching
 *   Identify    each problem tested against a list           -> searching
 *   Calculate   savings, investment, break-even, ROI         -> reasoning
 *   Prioritize  ranked value against difficulty              -> reasoning
 *   Roadmap     the finished plan, the last artefact         -> complete
 *
 * `working` never appears here, deliberately: no part of Diagnose executes
 * anything. That is the Build stage, and it is on Products.
 */
const PHASE_STATE: Record<string, OrbState> = {
  "01": "listening",
  "02": "connecting",
  "03": "searching",
  "04": "searching",
  "05": "reasoning",
  "06": "reasoning",
  "07": "complete",
};

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
  preview,
  defaultOpen,
  children,
  onToggle,
}: {
  lead?: string;
  title: string;
  meta?: string;
  /**
   * Content that stays visible while the row is CLOSED, because it lives in
   * the summary. This is the fix for a page that measured full and looked
   * empty: a row whose collapsed state is only a label proves nothing, so
   * every phase now shows what it does and what it produces without being
   * clicked, and only the frameworks underneath are folded away.
   *
   * The trade-off, stated because it is real: a summary is the accessible
   * name of the toggle, so a screen reader reads the preview when it reaches
   * the control. That is more words, but they are the same words a sighted
   * reader sees, which is the better of the two failure modes.
   */
  preview?: ReactNode;
  /** Opens on first render. Used sparingly; see the methodology section. */
  defaultOpen?: boolean;
  children: ReactNode;
  /** Native <details> `toggle`, forwarded with the resulting open state. This
   *  is the real event the orb runs on; nothing here is on a timer. */
  onToggle?: (open: boolean) => void;
}) {
  const indent = lead ? "pl-[2.1rem]" : "";
  return (
    <details
      className="group border-b border-[var(--border)]"
      open={defaultOpen}
      onToggle={
        onToggle
          ? (e) => onToggle((e.currentTarget as HTMLDetailsElement).open)
          : undefined
      }
    >
      <summary
        className="cursor-pointer list-none py-4 text-[var(--text-primary)] [&::-webkit-details-marker]:hidden"
        style={micro}
      >
        <div className="flex items-baseline gap-4 group-hover:text-[var(--text-secondary)]">
          {lead && (
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[var(--accent)]">
              {lead}
            </span>
          )}
          {/* A real heading, not a bold span. Seven phases and five questions
              inside a 1,600 word reference page had no sub-structure at all,
              so the outline a screen reader builds went h1, h2, and then
              nothing for the entire body of the page. */}
          <h3 className="flex-1 font-semibold">{title}</h3>
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
        </div>
        {preview && <div className={`mt-3 ${indent}`}>{preview}</div>}
      </summary>
      <div className={`pb-5 pr-2 ${indent}`}>{children}</div>
    </details>
  );
}

/**
 * One reusable framework inside a phase: a mono micro-label, then either bare
 * items or term-and-explanation pairs, then an optional line of guidance.
 *
 * This is the depth the methodology section exists to hold, and it lives
 * inside the <details> body on purpose: present in the HTML for a crawler and
 * a screen reader, absent from the page a reader scans. That is the only
 * reason Docs can carry this much reference material without growing back
 * into the page it was cut down from.
 */
function MethodBlockView({ block }: { block: MethodBlock }) {
  return (
    <div className="mt-5">
      {/* h4, because it sits under the phase's h3, which sits under the
          section's h2. The levels nest without a skip, which is the whole
          point of adding them. */}
      <h4 className={monoMeta}>{block.label}</h4>
      <ul className="mt-2.5 space-y-1.5">
        {block.rows.map((row) =>
          typeof row === "string" ? (
            <li key={row} className="text-[var(--text-secondary)]">
              {row}
            </li>
          ) : (
            <li key={row.term}>
              <span className="text-[var(--text-primary)]">{row.term}</span>
              <span className="text-[var(--text-secondary)]">
                {". "}
                {row.detail}
              </span>
            </li>
          ),
        )}
      </ul>
      {block.note && (
        <p className="mt-2.5 text-[var(--text-muted)]">{block.note}</p>
      )}
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
  /** Which diagnosis phase the reader currently has open, or null. Drives the
   *  one state orb in that section. Set from the native <details> toggle
   *  event, never from a timer. */
  // Seeded with the phase that renders open, so the orb agrees with the DOM on
  // first paint rather than claiming Ready beside an already-open row.
  const [openPhase, setOpenPhase] = useState<string | null>(PHASES[0]?.num ?? null);

  const walkthrough = videos[0];

  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <SEO
        title="Docs: Methodology, Architecture and Data"
        description="The reference page: how the diagnosis runs phase by phase, the architecture underneath the systems, what happens to your data, and the long-form answers."
        canonical="/docs"
        // The FAQ section renders these same answers in full.
      />
      <div className="min-h-screen pb-28">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          {/* ─── Page hero ─── */}
          {/* Tighter than the marketing pages on purpose. This is a reference
              page, and a full-height display hero was pushing the first real
              section most of a screen down, which is a large part of why a
              1,600 word document looked like an empty one on arrival. */}
          <header className="pt-32 pb-10">
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
                  className="mt-8 font-display font-semibold text-[var(--text-primary)]"
                  // A step down from the marketing pages' 4.8rem. Documentation
                  // titles itself; it does not need to announce itself.
                  style={{ fontSize: "clamp(2.3rem, 4.6vw, 3.7rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
                >
                  <SplitHeadline lead="Documentation." tail="How Ziiro works." />
                </h1>
              </MotionRevealItem>

              {/* This page's one job, stated. It does not re-introduce the
                  company: four other pages already do that, and saying it a
                  fifth time is what made Docs read as a summary of a summary. */}
              <MotionRevealItem>
                <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
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
                    <DocLink to="/book-a-call">Book a call</DocLink>. Paid, billed hourly, with a{" "}
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
                {/* The four-up grid this replaces showed four boxes but not
                    that they are a SEQUENCE, and not that the first one is a
                    single hour while the other three are stages you decide on
                    one at a time. The flow carries the same names and the same
                    sentences, plus the thing the grid could not say.

                    Canvas behind the diagram, not behind the prose above or
                    the links below it. */}
                <div className="relative isolate">
                  <DottedGrid className="-inset-y-10 inset-x-0" />
                  <LifecycleFlow steps={LIFECYCLE} />
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
                {/* One orb for the accordion, not one per row.

                    Seven live regions would mean a screen reader hearing a
                    status every time a row moves, which is the announcement
                    spam the state language explicitly forbids. One indicator,
                    reporting the phase the reader just opened, is a single
                    meaningful change per action.

                    It is FUNCTIONAL because it is genuinely reporting
                    something: which phase is open, and what kind of work that
                    phase is. It goes back to Ready when the last row closes,
                    so it is never left asserting a state nobody is looking
                    at. */}
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                  <p className="max-w-lg">
                    Fixed in scope, seven phases. Each one shows what it does
                    and what it leaves behind; open a phase for the frameworks
                    and checklists it runs on.
                  </p>
                  <StatefulOrb
                    state={openPhase ? PHASE_STATE[openPhase] : "idle"}
                    size="sm"
                    mode="functional"
                    className="shrink-0"
                  />
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {PROCESS_TERMS.map((term) => (
                    <li key={term}>{term}</li>
                  ))}
                </ul>
                {/* The timeline is NOT a second copy of the accordion below.
                    The accordion answers what each phase does; this answers
                    what the three weeks look like, which is in every phase's
                    own `days` string and was previously readable only by
                    opening seven rows and holding them in your head. */}
                <PhaseTimeline />

                <div className="border-t border-[var(--border)]">
                  {PHASES.map((phase, i) => (
                    <Disclosure
                      key={phase.num}
                      lead={phase.num}
                      title={phase.name}
                      meta={phase.days}
                      // What the phase does and what it leaves behind are now
                      // in the summary, so all seven read as a methodology
                      // whether or not anybody clicks. Only the frameworks
                      // fold away, and the count below says how many are
                      // there, so the row advertises its own depth.
                      preview={
                        <>
                          <p className="max-w-2xl">{phase.desc}</p>
                          <p className="mt-2 font-mono text-[11px] tracking-[0.05em] text-[var(--text-secondary)]">
                            → {phase.output}
                          </p>
                          {phase.method && (
                            <p className={`mt-2 ${monoMeta}`}>
                              {phase.method.length === 1
                                ? "01 framework"
                                : `${String(phase.method.length).padStart(2, "0")} frameworks`}
                            </p>
                          )}
                        </>
                      }
                      // One row open on arrival, not none and not all. The
                      // brief for this page asked for an accordion rather than
                      // fifty lines of open text, so the page still folds; it
                      // just stops making the reader take it on trust that
                      // there is anything folded.
                      defaultOpen={i === 0}
                      // Rows are independent, so several can be open at once.
                      // The orb follows the one most recently opened, and only
                      // falls back to Ready when the row it is currently
                      // reporting is the one being closed.
                      onToggle={(open) =>
                        setOpenPhase((cur) =>
                          open ? phase.num : cur === phase.num ? null : cur,
                        )
                      }
                    >
                      {phase.method?.map((block) => (
                        <MethodBlockView key={block.label} block={block} />
                      ))}
                    </Disclosure>
                  ))}
                </div>

                {/* Phase 06 ends in a priority matrix and the page named it
                    without ever showing it. Generic methodology only: how to
                    place an opportunity, nothing about engagement models,
                    revenue or data access. */}
                <h3 className="pt-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  The priority matrix
                </h3>
                <p>
                  Phase 06 places every opportunity on one 2x2, so the first build is a decision
                  rather than a debate.
                </p>
                <PriorityMatrix />
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
