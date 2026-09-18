import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal, { MotionRevealItem } from "@/shared/motion/MotionReveal";
import ScrollScene from "@/shared/motion/ScrollScene";
import EcosystemMap, { ALL, type Selection } from "./EcosystemMap";
import FlowView from "./FlowView";
import MobileCore from "./MobileCore";
import PipelinePanel, {
  PipelineIdentity,
  PipelineDetail,
} from "./PipelinePanel";
import { DIRECTORY_STATS, PIPELINES, findPipeline } from "./pipelines";
import {
  CSS_EASE,
  DURATION,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
} from "@/shared/motion/tokens";

/**
 * The system directory — the page's proof section.
 *
 * The hero makes a claim; this is where a visitor goes and looks at what the
 * claim is made of.
 *
 * The map is the section's fixed point. It is always mounted, it is never
 * swapped for anything else, and it is sticky, so it holds its place on the
 * left while the right column scrolls past it. Everything else answers to it:
 * the right column says what the current selection is made of, and the toggle
 * chooses how — "detail" for what a system is, "flow" for how it runs.
 *
 * Selection lives here and has three parts: which system (or "all"), which
 * agent inside it, and what the right column shows. Passing all three down is
 * what makes the map and the panel one interface rather than two: clicking a
 * hub selects that system, clicking the core selects them all, clicking an
 * agent node opens its row, and opening a row lights its node.
 *
 * The section opens on "all" — every system at equal weight, with the right
 * column listing all seven — because that is the honest first answer to "what
 * has been built". A visitor narrows from there.
 *
 * Desktop and mobile render different trees on purpose. A radial graph at
 * 360px wide is unreadable, so the phone gets the intelligence mark, then the
 * system, then its workflow, then its agents — the same information in the
 * order a small screen can actually read it.
 */

/** What the right column shows. The left column never changes. */
type RightView = "detail" | "flow";

const RIGHT_VIEWS: { id: RightView; label: string }[] = [
  { id: "detail", label: "Detail" },
  { id: "flow", label: "Flow" },
];

/** Matches the lg breakpoint the layout switches at. Starts false so the
 *  server render is the mobile one, which is the safe default. */
function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return wide;
}

export default function SystemDirectory() {
  const [selectedId, setSelectedId] = useState<Selection>(ALL);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [view, setView] = useState<RightView>("detail");
  const isWide = useIsWide();

  // findPipeline answers an unknown id with the first system, so "all" has to
  // be answered here rather than asked of it. null is the whole directory.
  const pipeline = selectedId === ALL ? null : findPipeline(selectedId);

  // A different system is a different set of agents, so a selection can't
  // survive the switch — it would open an unrelated agent in the same slot.
  const select = (id: Selection) => {
    setSelectedId(id);
    setActiveAgentId(null);
  };

  return (
    <section
      id="systems"
      // `data-dir-dark` stays: the palette re-asserts the light values through
      // it now, so it flips nothing and the attribute costs nothing.
      //
      // `data-nav-dark` is gone. It is not inert the way that one is: the
      // navbar paints an explicit rgba(0,0,0,0.72) bar while it is over a
      // section carrying it, hardcoded inline rather than through a token, so
      // it survived the palette going white. This was the last section in the
      // app still declaring itself dark, and it is white, so the bar spent
      // every scroll through the directory as a black strip across the top of
      // a white page. The hero dropped the same attribute for the same reason.
      data-dir-dark
      // `overflow-x-clip`, not `overflow-hidden`: hidden makes this a scroll
      // container, which silently kills the sticky map inside it. Clip keeps
      // anything the section overhangs with off the horizontal scrollbar
      // without that.
      className="relative isolate overflow-x-clip"
    >
      <Atmosphere />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        {/* No headline. The eyebrow names the section and the counted sentence
            below says what it is; a display title on top of both was a third
            voice saying the same thing. */}
        <SectionHeader
          index="01"
          label="The Ziiro System"
          meta={`${DIRECTORY_STATS.departments} departments`}
        />

        {/* Every number here is counted off the pipeline data, not typed into
            a sentence, so it cannot drift as systems are added. */}
        <ScrollScene exitTo={1}>
          <p
            className="mt-8 max-w-[46ch] text-[17px] leading-relaxed md:text-[19px]"
            style={{ color: "var(--dir-dim)" }}
          >
            <Figure>{DIRECTORY_STATS.jobs}</Figure> jobs of work, mapped across{" "}
            <Figure>{DIRECTORY_STATS.agents}</Figure> agents in{" "}
            <Figure>{DIRECTORY_STATS.departments}</Figure> departments.
          </p>
        </ScrollScene>

        {/* ── Controls ── */}
        <ScrollScene exitTo={1}>
          <div className="mt-14 flex flex-col gap-6 border-t border-[var(--dir-line)] pt-6 lg:flex-row lg:items-center lg:justify-between">
            {/* The chips arrive one after another rather than as a block, on
                the tight step, so the row reads as a list resolving. */}
            <div role="group" aria-label="Choose a system">
              <MotionReveal
                stagger={STAGGER.tight}
                className="flex flex-wrap gap-x-7 gap-y-3"
              >
                <MotionRevealItem as="span">
                  <SystemChip
                    label="All systems"
                    marker="all"
                    active={selectedId === ALL}
                    onClick={() => select(ALL)}
                  />
                </MotionRevealItem>
                {PIPELINES.map((p) => (
                  <MotionRevealItem as="span" key={p.id}>
                    <SystemChip
                      label={p.name}
                      marker={p.status === "active" ? "live" : "build"}
                      active={p.id === selectedId}
                      onClick={() => select(p.id)}
                    />
                  </MotionRevealItem>
                ))}
              </MotionReveal>
            </div>

            {/* Chooses what the right column shows. The map is not one of the
                options: it is always there. Hidden on a phone, where the
                stacked layout shows both. */}
            <div
              role="group"
              aria-label="Choose what the right column shows"
              className="hidden shrink-0 items-center gap-5 lg:flex"
            >
              {RIGHT_VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  className="relative rounded-sm font-mono text-[10px] font-bold uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dir-ink)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--dir-bg)]"
                  style={{
                    letterSpacing: "0.24em",
                    color: view === v.id ? "var(--dir-ink)" : "var(--dir-faint)",
                    transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                  }}
                >
                  {v.label}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-0 block h-px w-full"
                    style={{
                      background: "var(--dir-ink)",
                      opacity: view === v.id ? 1 : 0,
                      transition: `opacity ${MS.micro}ms ${CSS_EASE.out}`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </ScrollScene>

        {isWide ? (
          <div className="mt-14 grid grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-start gap-16">
            {/* `self-start` keeps this column its own height rather than the
                row's, which is what lets it stick instead of stretching. */}
            <div className="sticky top-24 min-w-0 self-start">
              <EcosystemMap
                pipelines={PIPELINES}
                selectedId={selectedId}
                onSelect={select}
                activeAgentId={activeAgentId}
                onAgentSelect={setActiveAgentId}
              />
              <p
                className="mt-4 text-center font-mono text-[9px] uppercase"
                style={{
                  letterSpacing: "0.24em",
                  color: "var(--dir-faint)",
                }}
              >
                Click a system · the core selects all
              </p>
            </div>

            {/* Keyed on the view and the system together, so changing either
                arrives. The agent is deliberately not in the key: opening an
                agent row must not re-fade the panel that row lives in. */}
            <div className="min-w-0">
              <Crossfade id={`${view}:${selectedId}`}>
                {view === "detail" ? (
                  <PipelinePanel
                    pipeline={pipeline}
                    activeAgentId={activeAgentId}
                    onAgentSelect={setActiveAgentId}
                    onSelect={select}
                  />
                ) : (
                  <FlowView
                    pipeline={pipeline}
                    activeAgentId={activeAgentId}
                    onSelect={select}
                  />
                )}
              </Crossfade>
            </div>
          </div>
        ) : (
          <div className="mt-12 space-y-12">
            {/* MobileCore sits outside the swap so its orbit ring keeps its
                place in a 24-second rotation rather than snapping back to zero
                every time the reader changes system. It fades its own
                identity block instead. */}
            <MobileCore pipeline={pipeline} />
            <Crossfade id={selectedId} className="space-y-12">
              {pipeline ? (
                <>
                  <PipelineIdentity pipeline={pipeline} />
                  <FlowView
                    pipeline={pipeline}
                    activeAgentId={activeAgentId}
                    onSelect={select}
                  />
                  <PipelineDetail
                    pipeline={pipeline}
                    activeAgentId={activeAgentId}
                    onAgentSelect={setActiveAgentId}
                  />
                </>
              ) : (
                <PipelinePanel pipeline={null} onSelect={select} />
              )}
            </Crossfade>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * One selector chip: a status marker and a label.
 *
 * The marker never implies a system ships when it doesn't — an in-build system
 * stays hollow even while it is the one selected. "All systems" carries the
 * ink marker rather than the live one, because it is a scope, not a status.
 */
function SystemChip({
  label,
  marker,
  active,
  onClick,
}: {
  label: string;
  marker: "all" | "live" | "build";
  active: boolean;
  onClick: () => void;
}) {
  const filled = active && marker !== "build";

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-sm font-mono text-[10px] font-bold uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dir-ink)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--dir-bg)]"
      style={{
        letterSpacing: "0.2em",
        color: active ? "var(--dir-ink)" : "var(--dir-faint)",
        transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
      }}
    >
      <span
        aria-hidden="true"
        className="block h-[5px] w-[5px] rounded-full"
        style={{
          // Named property rather than `all`, which would also ease the
          // hairline outline below and leave a grey frame around the marker
          // for the length of the swap.
          transition: `background-color ${MS.micro}ms ${CSS_EASE.out}`,
          background: filled
            ? marker === "live"
              ? "var(--dir-live)"
              : "var(--dir-ink)"
            : "transparent",
          border: marker === "build" ? "1px solid var(--dir-line-strong)" : "none",
          // The live marker used to carry a 10px bloom of its own colour. A
          // bloom is light spilling past an edge, which needs a dark ground to
          // spill onto; on paper it is a 5px dot inside a smudge. The dot is
          // the accent, and that is enough to say live on white.
          outline:
            filled || marker === "build"
              ? "none"
              : "1px solid var(--dir-line-strong)",
          outlineOffset: "-1px",
        }}
      />
      <span
        className="group-hover:text-[var(--dir-ink)]"
        style={{ transition: `color ${MS.micro}ms ${CSS_EASE.out}` }}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Swaps one block of content for another over DURATION.swap.
 *
 * Deliberately not <AnimatePresence>: making the outgoing content leave before
 * the incoming arrives collapses the column to nothing for a beat, and in a
 * two-column layout that reads as the page breaking rather than as a
 * transition. Keying a fresh element instead lets the new content take the box
 * immediately and animates only its opacity, which is the part a reader
 * actually notices.
 *
 * The very first render carries no `initial`, because framer writes `initial`
 * into the prerendered markup — and a panel that ships as opacity:0 is a panel
 * nobody whose JS failed will ever read.
 */
function Crossfade({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const shouldReduce = useReducedMotion();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  if (shouldReduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      key={id}
      className={className}
      initial={mounted.current ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.swap, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/** A counted number, set to read as a figure rather than as prose. */
function Figure({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-display font-semibold tabular-nums"
      style={{ color: "var(--dir-ink)", letterSpacing: "-0.02em" }}
    >
      {children}
    </span>
  );
}

/** The section's field.
 *
 *  It was the hero's field repeated a little quieter: a wide warm blob and a
 *  plate of grain, there so that the hero and the map read as one dark block
 *  rather than two panels. Both halves of that only worked on black. The blob
 *  is a 13% warm radial, which on paper is a bruise in the middle of the page
 *  and sits directly behind the map's own hairlines; the grain is black noise,
 *  which on paper is dirt rather than depth.
 *
 *  What makes the section continuous now is that it has no ground of its own
 *  at all: it is the same sheet as the sections above and below it, which is
 *  the whole point of one white page. The component stays as the single place
 *  that would own a field if the section is ever given one. */
function Atmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
