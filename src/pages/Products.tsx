import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createTimeline, cubicBezier } from "animejs";
import SEO from "@/shared/components/SEO";
import SplitHeadline from "@/shared/components/SplitHeadline";
import ArrowFillLink from "@/shared/ui/arrow-fill-link";
import { serviceCatalogSchema } from "@/shared/components/seo-schema";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import Beam from "@/shared/motion/Beam";
import ScrollStack from "@/shared/motion/ScrollStack";
import StatefulOrb, { type OrbState } from "@/shared/ui/StatefulOrb";
import {
  CSS_EASE,
  DURATION,
  EASE_IN_OUT,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";
import TextReveal from "@/shared/motion/TextReveal";
import DotGlyph, { type GlyphVariant, type GlyphEnergy } from "@/shared/ui/dot-glyph";

/** One deliverable, shown as a label with the detail behind a disclosure.
 *  Every one of these used to get its own always-visible paragraph, which is
 *  what made the page read as fifteen mini essays rather than three stages. */
interface Capability {
  name: string;
  line: string;
}

/** Which of the three visual treatments a stage uses for its body. The stages
 *  are not variations on one shape: Diagnose produces a set of artefacts, Build
 *  runs a pipeline, Optimize runs a cycle, and drawing all three as the same
 *  list was the reason none of them read as what they are. */
type StageVisual = "stack" | "flow" | "loop";

interface FlowBand {
  label: string;
  items: string[];
  /** True when the items are an ordered sequence rather than alternatives, so
   *  the band is separated by arrows instead of slashes. Research, decide,
   *  route and execute happen in that order; a CRM and an inbox do not. */
  sequence?: boolean;
}

interface Stage {
  name: string;
  sub: string;
  desc: string;
  /** The one line that says what the stage is for, above the visual. */
  lead: string;
  visual: StageVisual;
  /** "stack" only: labels with the detail behind a disclosure. */
  capabilities?: Capability[];
  /** "flow" only: the pipeline, band by band. */
  flow?: FlowBand[];
  /** "loop" only: the cycle, in order, ending where it began. */
  loop?: string[];
  /** Small labels under the visual. What ships, without a paragraph each. */
  deliverables?: string[];
  glyph: GlyphVariant;
  figCaption: string;
  handover: string;
}

/** The whole offer. Three stages, and nothing a reader is asked to choose
 *  between sits outside them: the five separately-branded services this page
 *  used to list are now capabilities inside the stage that produces them.
 *  Pricing.tsx names the same three and must stay in step. */
const stages: Stage[] = [
  {
    name: "Diagnose",
    sub: "Before anything gets built",
    desc: "We map how the business actually runs: where the hours go, which decisions repeat, and what a system would have to be worth to justify building it.",
    lead: "Find out what is worth fixing before deciding what to build.",
    visual: "stack",
    capabilities: [
      {
        name: "Operations map",
        line: "How work moves through the business today, written down, including the parts nobody ever documented.",
      },
      {
        name: "KPI baseline",
        line: "The numbers as they stand before anything changes, so a later claim of improvement has something to be measured against.",
      },
      {
        name: "ROI model",
        line: "What each candidate system would have to save or earn, set against what it costs to build.",
      },
      {
        name: "Role map",
        line: "What each person should own, and which parts of their week a system should be taking off them.",
      },
      {
        name: "Build roadmap",
        line: "The order to build in, with the first system specified in enough detail to start on it.",
      },
    ],
    glyph: "path",
    figCaption: "The shortest route",
    handover: "Roadmap plus first-system specification.",
  },
  {
    name: "Build",
    sub: "The system goes into the operation",
    desc: "Agents that do real work inside the tools you already run. Not a prototype in a sandbox, and not a licence to something we host and you rent.",
    lead: "Put the first system off that roadmap into the operation.",
    visual: "flow",
    flow: [
      { label: "Input", items: ["CRM", "Email", "Data", "Documents"] },
      { label: "Agents", items: ["Research", "Decide", "Route", "Execute"], sequence: true },
      { label: "Control", items: ["Dashboard", "Human approval"] },
      { label: "Output", items: ["Work completed inside existing tools"] },
    ],
    deliverables: [
      "Workflow agents",
      "Research and enrichment",
      "Routing and follow-up",
      "Stack integration",
      "Dashboards and controls",
    ],
    glyph: "agents",
    figCaption: "Operators in motion",
    handover: "A running system, the access to it, and the documentation for it.",
  },
  {
    name: "Optimize",
    sub: "After launch, it keeps moving",
    desc: "A system that ships and then sits still starts decaying the day the business changes. These loops watch their own outcomes and tune against them.",
    lead: "Keep it earning, and be able to prove that it is.",
    visual: "loop",
    loop: ["Baseline", "Run", "Measure", "Test", "Improve", "Run again"],
    deliverables: [
      "Outcome tracking",
      "Test loops",
      "Auto-tuned campaigns",
      "Learning reports",
    ],
    glyph: "loops",
    figCaption: "A loop, learning",
    handover: "A measurement cycle, running on a cadence you agreed to.",
  },
];

/** A stage's id, used for the tab, the card and the aria wiring between them. */
const stageId = (name: string) => name.toLowerCase();

/** Self-qualification, not a summary. The reader picks the sentence that is
 *  true of them and the page answers with a stage, which is the only question
 *  this page leaves open once the three stages are described. Deliberately not
 *  a fourth vocabulary: the answers are the same three names. */
const entryPoints = [
  {
    said: "I don't know what to build.",
    stage: "Diagnose",
    line: "Something is slow and expensive, but you cannot yet say which part is worth fixing first.",
  },
  {
    said: "I already know what to build.",
    stage: "Build",
    line: "You have the spec already and you want it running, not specified a second time.",
  },
  {
    said: "I already have something running.",
    stage: "Optimize",
    line: "Something is live, and nobody can tell you whether it is getting better.",
  },
];

/**
 * One stage, as a card in the scroll stack.
 *
 * The brief for this page is a card that carries only what a reader needs to
 * tell the three stages apart: one sentence of purpose, the four or five things
 * that come out of it as bare labels, and the one line that says what they are
 * left holding. Everything else is behind the disclosure.
 *
 * What expands is the stage's own diagram, and the three are deliberately not
 * the same shape: Diagnose produces a set of artefacts, Build runs a pipeline,
 * Optimize runs a cycle. Drawing all three as one list of paragraphs is what
 * made this page read as fifteen mini essays. Keeping them behind a disclosure
 * is what lets the page be short without throwing the distinction away.
 */
function StageCard({
  stage,
  index,
  expanded,
  onToggle,
  reduced,
  energy,
}: {
  stage: Stage;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  reduced: boolean;
  energy: { current: GlyphEnergy };
}) {
  const id = stageId(stage.name);
  const labels = stage.capabilities?.map((c) => c.name) ?? stage.deliverables ?? [];
  return (
    <article
      id={`stage-panel-${id}`}
      // Was role="tabpanel" with aria-labelledby pointing at a magnet tab.
      // The tabs are gone (review item 17), and a tabpanel with no tablist
      // tells a screen reader it is inside a widget that does not exist.
      data-stage-card
      aria-labelledby={`stage-title-${id}`}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-10"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-baseline gap-5">
          <span className="font-mono text-sm text-[var(--text-secondary)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h2
              id={`stage-title-${id}`}
              className="font-display font-semibold text-[var(--text-primary)]"
              style={{
                fontSize: "clamp(1.7rem, 3.4vw, 2.7rem)",
                // Large display text is tightened; the body below stays near 0.
                letterSpacing: "-0.02em",
                lineHeight: 1.04,
              }}
            >
              {stage.name}
            </h2>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {stage.sub}
            </p>
          </div>
        </div>
        {/* The width cap lives on this wrapper, not on the glyph's own class.
            dot-glyph sets `maxWidth: 320` as an INLINE style, and an inline
            style beats a class, so the `max-w-[150px]` that used to sit on the
            glyph was silently doing nothing: it rendered 320px wide and 220px
            tall. That height set the whole header row, which pushed the
            purpose line down and left roughly 200px of white inside the card.
            Constraining the parent works because the canvas is width: 100%. */}
        <div className="hidden w-[150px] shrink-0 lg:block">
          <DotGlyph
            variant={stage.glyph}
            energy={energy}
            className="text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* The purpose, in one sentence. */}
      <p className="mt-8 max-w-xl font-display text-lg font-medium leading-snug text-[var(--text-primary)] md:text-xl">
        {stage.lead}
      </p>

      {/* What comes out, as labels rather than as a paragraph each. */}
      <ul className="mt-8 flex flex-wrap gap-x-3 gap-y-2">
        {labels.map((label) => (
          <li
            key={label}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]"
          >
            {label}
          </li>
        ))}
      </ul>

      {/* The result line. */}
      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
        [ You leave with ]
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
        {stage.handover}
      </p>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`stage-detail-${id}`}
        className="mt-8 inline-flex min-h-[44px] items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]"
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)]"
        />
        {expanded ? "Hide how it runs" : "How it runs"}
      </button>

      {/* Grid-rows rather than height: it animates to the content's real size
          without measuring it, and it collapses to nothing without display
          toggling, so the text stays in the DOM for a crawler either way. */}
      <div
        id={`stage-detail-${id}`}
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transitionProperty: "grid-template-rows",
          transitionDuration: reduced ? "0s" : `${DURATION.swap}s`,
          transitionTimingFunction: CSS_EASE.outExpo,
        }}
      >
        <div className="overflow-hidden">
          <div className="pt-8">
            <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {stage.desc}
            </p>
            <div className="mt-8 max-w-xl">
              {stage.visual === "stack" && stage.capabilities && (
                <CapabilityStack
                  items={stage.capabilities}
                  idBase={id}
                  reduced={reduced}
                />
              )}
              {stage.visual === "flow" && stage.flow && <FlowDiagram bands={stage.flow} />}
              {stage.visual === "loop" && stage.loop && <LoopDiagram steps={stage.loop} />}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Diagnose's body: the five artefacts as a stack of labels, one detail open at
 *  a time. Hover, focus and click all open a row, so it works with a pointer, a
 *  keyboard and a thumb. Every line stays in the DOM whether or not it is
 *  showing, which is deliberate: the text is still prerendered and still
 *  reachable by a crawler, and only the rendering is collapsed. */
function CapabilityStack({
  items,
  idBase,
  reduced,
}: {
  items: Capability[];
  idBase: string;
  reduced: boolean;
}) {
  // Zero, not null: one row is always open, so the block never renders as an
  // empty frame and the prerendered HTML always shows a real sentence.
  const [open, setOpen] = useState(0);

  return (
    <ul className="border-t border-[var(--border)]">
      {items.map((c, i) => {
        const isOpen = open === i;
        return (
          <li key={c.name} className="border-b border-[var(--border)]">
            <button
              type="button"
              onMouseEnter={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              onClick={() => setOpen(i)}
              aria-expanded={isOpen}
              aria-controls={`${idBase}-cap-${i}`}
              className="flex w-full items-center gap-4 py-3.5 text-left"
            >
              <span className="w-6 shrink-0 font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`flex-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] ${
                  isOpen
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {c.name}
              </span>
            </button>
            {/* 0fr to 1fr, the same collapse the navbar pill uses. It animates
                a real height without anyone having to measure one. */}
            <div
              id={`${idBase}-cap-${i}`}
              className="grid"
              style={{
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transitionProperty: "grid-template-rows",
                transitionDuration: reduced ? "0s" : `${DURATION.micro}s`,
                transitionTimingFunction: CSS_EASE.outExpo,
              }}
            >
              <div className="overflow-hidden">
                <p className="pb-4 pl-10 pr-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {c.line}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Build's body: the pipeline, band by band. This replaced five paragraphs that
 *  each described one agent; what a reader actually needs is the shape of the
 *  thing, which is four bands and not five essays. */
function FlowDiagram({ bands }: { bands: FlowBand[] }) {
  return (
    <ol className="border-t border-[var(--border)]">
      {bands.map((b) => (
        <li
          key={b.label}
          className="flex flex-col gap-2 border-b border-[var(--border)] py-4 sm:flex-row sm:items-baseline sm:gap-6"
        >
          <p className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
            {b.label}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {b.items.map((item, j) => (
              <span key={item} className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">
                  {item}
                </span>
                {j < b.items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="font-mono text-[10px] text-[var(--text-muted)]"
                  >
                    {b.sequence ? "\u2192" : "/"}
                  </span>
                )}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Optimize's body: the cycle, ending on the step it started from, which is
 *  the entire argument for the stage existing. */
function LoopDiagram({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-3 border-y border-[var(--border)] py-5">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">
            {s}
          </span>
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="text-[var(--text-muted)]">
              {"\u2192"}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** What ships, as labels rather than as a paragraph each. */
function DeliverableLabels({ items }: { items: string[] }) {
  return (
    <div className="mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
        [ Ships with ]
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {items.map((d) => (
          <li
            key={d}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]"
          >
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}


/** The motion tokens are in seconds, because framer-motion is. anime.js counts
 *  in milliseconds, so every token that reaches it goes through this. */
/**
 * What each stage DOES, said in the orb's state language.
 *
 * READ THIS BEFORE CHANGING IT. Nothing is being computed on this page. These
 * sequences describe the shape of a stage of an engagement, which is a claim
 * the company can stand behind, and they must never be read as live processing.
 * That is why each one PLAYS ONCE and settles rather than looping: a permanent
 * cycle is a machine pretending to work, and this site has refused to fabricate
 * results everywhere else.
 *
 * The settle states are the honest part. Diagnose and Build each end in
 * something handed over, an artefact and a running system, so they settle on
 * `complete`. Optimize is the only stage that repeats, so it settles on `idle`,
 * meaning ready for the next cycle rather than finished with the job.
 */
const STAGE_SEQUENCE: Record<string, OrbState[]> = {
  Diagnose: ["searching", "connecting", "reasoning", "complete"],
  Build: ["connecting", "working", "complete"],
  Optimize: ["working", "reasoning", "idle"],
};

/** How long each step of a sequence holds, in ms. Long enough that the WORD is
 *  readable, since the word is the canonical carrier and the animation only
 *  reinforces it. At 1200 a four-step Diagnose resolves in 3.6s and never asks
 *  to be watched. */
const ORB_STEP_MS = 1200;

/** Where a stage rests once its sequence has run. */
const settledState = (stageName: string): OrbState => {
  const seq = STAGE_SEQUENCE[stageName];
  return seq ? seq[seq.length - 1] : "idle";
};

const ms = (seconds: number) => Math.round(seconds * 1000);

export default function Products() {
  const heroRef = useRef<HTMLElement>(null);
  const energies = useRef<{ current: GlyphEnergy }[]>(
    stages.map(() => ({ current: { speed: 1, gain: 0 } })),
  );
  // The disclosures are CSS transitions rather than anime.js timelines, so they
  // need the preference as state rather than as a read inside an effect.
  const [reduced, setReduced] = useState(false);
  // Which self-qualifying statement the reader has picked. One is always open,
  // so the section answers something the moment it is scrolled to.
  //
  // THIS IS THE PAGE'S ONE "CURRENT STAGE". Three things read it and two write
  // it: the magnet tabs and the self-qualification list both set it, and the
  /** Which stage card has its detail open. Null is all closed, which is the
   *  resting state: the point of the card is that the detail is optional. */
  const [openDetail, setOpenDetail] = useState<number | null>(null);

  /**
   * ── WHERE THE SELECTION COMES FROM NOW (review item 17) ──
   *
   * There used to be a Diagnose / Build / Optimize segmented control above the
   * stack. It looked like a tab interface and was not one: every tab scrolled
   * the page to a section that was already on its way past. The review's test
   * is whether a control offers a capability not already available immediately
   * adjacent, and scrolling on a scroll-led page is not one, so it is gone
   * rather than rebuilt as a sticky navigator. A persistent navigator would be
   * MORE chrome on a page whose argument is that the three stages are one
   * progression you read through.
   *
   * Removing it would have stranded two things that read the selection: the
   * Beam that marks the current card, and the orb that reports what the stage
   * does. So the selection is now derived from the page itself: whichever card
   * is resting under the header is the active stage. Both indicators survive
   * and both got more honest in the process, because they now report where the
   * reader actually IS rather than what they last clicked.
   *
   * The old note here said scroll must not write this, because a tab that
   * scrolled the page and a page that reselected the tab would have been a
   * loop. With the tabs gone there is no loop left to avoid.
   */
  const [activeStage, setActiveStage] = useState(0);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stackRef.current;
    if (!root) return;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-stage-card]")];
    if (!cards.length) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      // WHY NOT "the last card whose top passed a line": in a sticky stack every
      // card that has arrived is pinned at the same top, so that test is true
      // for all of them at once and always answers "the last one". The page
      // reported Optimize while the reader was still on Build.
      //
      // The card on top of the deck is the one the NEXT card has not yet
      // covered, which is the same quantity ScrollStack uses to decide how far
      // a card has receded. Mirrored here rather than exported, because the two
      // are measuring the same geometry for different reasons and coupling them
      // would make one of them hard to tune.
      const span = Math.max(1, window.innerHeight - 116);
      let current = cards.length - 1;
      for (let i = 0; i < cards.length; i += 1) {
        const next = cards[i + 1];
        const behind = next
          ? Math.max(0, Math.min(1, (window.innerHeight - next.getBoundingClientRect().top) / span))
          : 0;
        // Half covered is where the incoming card takes over as the one being
        // read, and it is also where its opacity has overtaken the outgoing.
        if (behind < 0.5) {
          current = i;
          break;
        }
      }
      setActiveStage(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /** Which self-qualifying statement is open. Independent of the stage the
   *  reader is scrolled to: it used to drive that too, so opening a row at the
   *  bottom of the page silently re-beamed a card at the top. */
  const [openEntry, setOpenEntry] = useState(0);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  /* ── The orb's state, driven by the SAME selection everything else reads ──
     `activeStage` is derived from `openEntry`, which the tabs write and the
     beam and the self-qualification list read. The orb joins that rather than
     keeping a second selection of its own, so it can never disagree with the
     tab that is lit.

     It waits for the block to be looked at before it plays. Running the
     sequence at mount would spend it below the fold, where the reader is still
     in the hero; `seen` flips once and never flips back, so this is a first
     impression rather than a loop that fires every time the section scrolls
     past. After that, every stage selection replays it. */
  const orbBlock = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>(() =>
    settledState(stages[0].name),
  );

  useEffect(() => {
    const host = orbBlock.current;
    if (!host) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "-10% 0px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const seq = STAGE_SEQUENCE[stages[activeStage].name];
    if (!seq) return;
    const settled = seq[seq.length - 1];

    // Reduced motion gets the answer, not a slower version of the journey.
    // Stepping a word through four values is itself movement on the page, and
    // the settled state is the one that carries the meaning anyway.
    if (reduced || !seen) {
      setOrbState(settled);
      return;
    }

    let step = 0;
    setOrbState(seq[0]);
    const id = window.setInterval(() => {
      step += 1;
      if (step >= seq.length) {
        window.clearInterval(id);
        return;
      }
      setOrbState(seq[step]);
    }, ORB_STEP_MS);
    return () => window.clearInterval(id);
  }, [activeStage, reduced, seen]);

  // Hero entrance: label -> headline -> sub -> hairline, one sequenced
  // timeline. Elements start hidden via inline style so nothing flashes.
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

  // The stage rows used to have an entrance animation, a hover-follow on their
  // titles and a per-glyph energy ramp, all driven from `listRef` and the
  // `data-prod-row` / `data-prod-title` hooks. The scroll stack replaced those
  // rows with cards, so all three queried elements that no longer exist and
  // have been removed rather than left to run against nothing. The cards get
  // their motion from ScrollStack, and their glyphs sit at rest energy.
  return (
    <div className="relative">
      <SEO
        title="Products: What Gets Built at Each Stage"
        description="What actually ships: operations maps and ROI models, agents that route and follow up inside your stack, and loops that retune on their own outcomes."
        canonical="/products"
        // The catalog is the stage list itself, so the markup cannot drift
        // from the rows below it. Three offers, because there are three
        // things to engage on.
        schema={[
          serviceCatalogSchema({
            path: "/products",
            name: "Ziiro engagement stages",
            description:
              "The three stages Ziiro works in: Diagnose, which maps the operation and prices the opportunity; Build, which ships agents into it; and Optimize, which keeps them measured and tuned.",
            catalogName: "Stages",
            offerings: stages.map((stage) => ({
              name: stage.name,
              description: stage.desc,
            })),
          }),
        ]}
      />

      {/* ---- Page hero ---- */}
      <section ref={heroRef} className="pt-36 pb-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <p
            data-hero-label
            className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( Ziiro / Products )
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
            <SplitHeadline
              lead="Diagnose. Build. Optimize."
              tail="Everything we make sits in one of these three."
            />
          </h1>
          <p
            data-hero-sub
            className="mt-8 max-w-xl leading-relaxed text-[var(--text-secondary)]"
            style={{ opacity: 0 }}
          >
            What follows is the catalogue: what each stage produces, and what
            you are actually handed at the end of it. No stage ships a slide
            deck. What it costs to engage is set out on{" "}
            <Link
              to="/pricing"
              className="text-[var(--text-primary)] underline underline-offset-4"
            >
              Pricing
            </Link>
            .
          </p>
          <div
            data-hero-rule
            className="mt-16 border-t border-[var(--border)]"
            style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
          />
        </div>
      </section>

      {/* ---- The catalogue: three stages as one progression ---- */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* ── The orb, in FUNCTIONAL mode ──
              One orb for the whole progression rather than one per card. Three
              orbs visible at once would be decoration; this one reports what
              the stage currently under the header does.

              ITEM 16, THE BOUNCING. The orb sat in an auto-width column beside
              its copy, and the column's width was set by the state WORD below
              it. SEARCHING, CONNECTING, REASONING and COMPLETE are all
              different lengths, so every state change resized the column and
              shoved the orb and the paragraph sideways. The page looked like it
              was bouncing because it was. A fixed column width holds the layout
              still while the orb keeps breathing and morphing inside it, which
              is the part that was always meant to move. The width is sized for
              CONNECTING, the longest of the seven words.

              The line underneath is not hedging, it is the honest part. The
              site has refused to fabricate results everywhere else, and an orb
              that reads WORKING next to three service cards would imply a
              machine running on this page. It is not. The states describe the
              stage. */}
          <MotionReveal>
            <div
              ref={orbBlock}
              className="mb-14 flex max-w-2xl flex-col items-center gap-6 border-t border-[var(--border)] pt-8 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left"
            >
              <div className="flex w-32 shrink-0 justify-center">
                <StatefulOrb
                  state={orbState}
                  size="md"
                  mode="functional"
                />
              </div>
              <div className="max-w-md">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  [ Stage behaviour ]
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  What a Ziiro system does during{" "}
                  <span className="text-[var(--text-primary)]">
                    {stages[activeStage].name}
                  </span>
                  . Nothing is being computed on this page.
                </p>
              </div>
            </div>
          </MotionReveal>

          {/* The ref lives on a wrapper rather than on ScrollStack, which does
              not forward one. Changing a shared component's API for one page's
              measurement would be the wrong trade. */}
          <div ref={stackRef}>
          <ScrollStack className="mt-12" topOffset={116}>
            {stages.map((stage, i) => (
              <Beam
                key={stage.name}
                active={activeStage === i}
                size="md"
                radius={16}
                strength={0.4}
                duration={7}
              >
                <StageCard
                  stage={stage}
                  index={i}
                  expanded={openDetail === i}
                  onToggle={() => setOpenDetail(openDetail === i ? null : i)}
                  reduced={reduced}
                  energy={energies.current[i]}
                />
              </Beam>
            ))}
          </ScrollStack>
          </div>
        </div>
      </section>
      {/* ---- The order that works ---- */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                  Sec. 02 / Where to start
                </p>
                <p className="hidden font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)] md:block">
                  [ 03 entry points ]
                </p>
              </div>
            </div>
          </MotionReveal>

          {/* The page's statement: scroll-scrubbed word-by-word reveal */}
          <TextReveal
            text="Most teams run these in order. You do not have to."
            as="h2"
            className="mt-10 max-w-4xl font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.06,
            }}
          />

          <MotionReveal>
            <p className="mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
              Pick the one that is true of you. It answers with a stage.
            </p>
          </MotionReveal>

          {/* Self-qualification rather than three summary cards. The cards
              restated the three stages a fourth time; this asks the reader a
              question only they can answer and then names the stage, which is
              the one thing the page still owes them by this point. */}
          <MotionReveal stagger={STAGGER.card} className="mt-14 max-w-3xl">
            {entryPoints.map((e, i) => {
              const isOpen = openEntry === i;
              return (
                <MotionRevealItem key={e.stage}>
                  <div className="border-t border-[var(--border)] last:border-b last:border-[var(--border)]">
                    <button
                      type="button"
                      // No onMouseEnter. Opening on hover meant the panel
                      // grew and its neighbour collapsed as the pointer merely
                      // crossed a row, so the page moved under a reader who had
                      // not asked for anything. That is the layout shift item 19
                      // reports, and it is worse than the click-induced kind
                      // item 20 bans because it needs no click at all.
                      onFocus={() => setOpenEntry(i)}
                      onClick={() => setOpenEntry(i)}
                      aria-expanded={isOpen}
                      aria-controls={`entry-panel-${i}`}
                      className="flex w-full items-baseline gap-5 py-6 text-left"
                    >
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`flex-1 font-display font-medium tracking-tight ${
                          isOpen
                            ? "text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                        style={{ fontSize: "clamp(1.15rem, 2.2vw, 1.6rem)" }}
                      >
                        {e.said}
                      </span>
                    </button>

                    <div
                      id={`entry-panel-${i}`}
                      className="grid"
                      style={{
                        gridTemplateRows: isOpen ? "1fr" : "0fr",
                        transitionProperty: "grid-template-rows",
                        transitionDuration: reduced ? "0s" : `${DURATION.micro}s`,
                        transitionTimingFunction: CSS_EASE.outExpo,
                      }}
                    >
                      <div className="overflow-hidden">
                        <div className="pb-7 pl-9">
                          {/* ITEM 19. This read "-> START AT DIAGNOSE" in bold
                              tracked mono at full ink with the site's action
                              arrow in front of it, which is the exact costume
                              the real calls to action wear. It is not one. It
                              is the answer to the sentence above it, and
                              clicking it does nothing, so it is now set as a
                              label: a quiet mono caption and the stage name in
                              display type. Nothing here is styled as a control
                              unless it is one. */}
                          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                            [ Where you would start ]
                          </p>
                          <p className="mt-2 font-display text-lg font-medium text-[var(--text-primary)]">
                            {e.stage}
                          </p>
                          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-[var(--text-secondary)]">
                            {e.line}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </MotionRevealItem>
              );
            })}
          </MotionReveal>
        </div>
      </section>

      {/* ---- Final CTA band ---- */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <MotionReveal>
            <div className="border-t border-[var(--border)] pt-20 text-center">
              <p className="mb-8 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                ( Next )
              </p>
              <h2
                className="font-display font-semibold text-[var(--text-primary)]"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4.3rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.04,
                }}
              >
                <SplitHeadline
                  lead="That is what gets built."
                  tail="Scoping it is one page over."
                />
              </h2>
              <p className="mx-auto mt-6 max-w-xl leading-relaxed text-[var(--text-secondary)]">
                Pricing covers what a stage costs to engage and what sets its
                size.
              </p>
              {/* The site's house curve, applied inline because Tailwind's
                  `transition-opacity` ships its own timing function and, being
                  a class, outranks the zero-specificity :where() rule in
                  index.css that puts everything else on expo-out. */}
              <ArrowFillLink to="/pricing" className="mt-10">See pricing</ArrowFillLink>
            </div>
          </MotionReveal>
        </div>
      </section>
    </div>
  );
}
