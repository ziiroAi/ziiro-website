import { useEffect, useRef, useState, type ReactNode } from "react";
import SectionHeader from "@/shared/ui/section-header";
import MotionReveal from "@/shared/motion/MotionReveal";
import { copy } from "@/features/funnel/data/light";
import EcosystemMap, { ALL, type Selection } from "./EcosystemMap";
import MobileCore from "./MobileCore";
import PipelinePanel, {
  PipelineIdentity,
  PipelineDetail,
} from "./PipelinePanel";
import {
  DIRECTORY_STATS,
  MARKS,
  PIPELINES,
  findPipeline,
  jobsIn,
} from "./pipelines";
import { useReducedMotion } from "./motion";
import { CSS_EASE, MS } from "@/shared/motion/tokens";
import "./directory.css";

/**
 * The system directory: the first section of /products, under its hero.
 *
 * The page sells the work; this is where a visitor looks at what the work is
 * made of: seven departments, the agents in each, and every job those agents
 * carry, read straight off the funnel's catalog (see pipelines.ts).
 *
 * The map is the section's fixed point. It is always mounted, it is never
 * swapped for anything else, and it is sticky, so it holds its place on the
 * left while the right column scrolls past it. Everything else answers to it:
 * the right column says what the current selection is made of.
 *
 * Selection lives here and has two parts: which system (or "all") and which
 * agent inside it. Passing both down is
 * what makes the map and the panel one interface rather than two: clicking a
 * hub selects that system, clicking the core selects them all, clicking an
 * agent node opens its row, and opening a row lights its node.
 *
 * ── ONE CONCEPT, ONE INTERACTION ──────────────────────────────────────────
 *
 * This section used to offer the same conceptual selection in three separate
 * places. All three are gone, and the map is the single way to choose:
 *
 *   1. A chip bar above the map, "All systems" plus one chip per system. Every
 *      one of those chips duplicated a hub node sitting a few hundred pixels
 *      below it. Removed.
 *   2. An index of all seven systems filling the right column whenever nothing
 *      was selected, each row selecting the same system its hub node does.
 *      Removed on desktop. It SURVIVES on mobile, where there is no graph to
 *      drive and it is the only way to reach a system at all.
 *
 *      WHAT REPLACED IT, and this is a correction to the first attempt. That
 *      removal left the column carrying a single line of instruction, which
 *      threw away something the list had been doing incidentally: answering
 *      "what is all of this" before you pick a part of it. The column now
 *      shows DirectorySummary, the whole directory in totals. The distinction
 *      that matters is selection, not content: the index was seven buttons
 *      duplicating seven hub nodes, and the summary names no system and offers
 *      no selection. It informs. The instruction line is still there, as a
 *      footnote beneath it rather than as the whole column.
 *   3. The "All systems" reset. Removed. Clicking the focused system's own node
 *      again returns to the overview, so deselection happens where selection
 *      happened. The phone keeps a scoped Back control, because it has no node
 *      to click twice.
 *
 * The section opens on "all", every system at equal weight. A visitor narrows
 * from there by clicking the map.
 *
 * On main this section also had a Detail/Flow toggle and a flow view of each
 * system's workflow steps. The catalog holds no steps, so both were left out
 * of the port rather than fed invented ones.
 *
 * Desktop and mobile render different trees on purpose. A radial graph at
 * 360px wide is unreadable, so the phone gets the intelligence mark, then the
 * system, then its agents and their jobs — the same information in the
 * order a small screen can actually read it.
 */

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
  const isWide = useIsWide();

  // findPipeline answers an unknown id with the first system, so "all" has to
  // be answered here rather than asked of it. null is the whole directory.
  const pipeline = selectedId === ALL ? null : findPipeline(selectedId);

  // A different system is a different set of agents, so a selection can't
  // survive the switch: it would open an unrelated agent in the same slot.
  //
  // CLICKING THE SELECTED SYSTEM AGAIN RETURNS TO THE OVERVIEW, which is what
  // replaced the "All systems" reset control. The node that focused a system is
  // the node that unfocuses it, so deselection is where selection was rather
  // than at an unrelated chip somewhere else on the page. The agent nodes in
  // EcosystemMap already worked exactly this way, so this makes the section
  // consistent with itself rather than introducing a new idea.
  //
  // ALL stays a direct set, never a toggle: the core node means "show me
  // everything", and a core that deselected back to itself would do nothing.
  const select = (id: Selection) => {
    setSelectedId((prev) => (id !== ALL && prev === id ? ALL : id));
    setActiveAgentId(null);
  };

  return (
    <section
      id="systems"
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
            voice saying the same thing.

            The section still needs a heading in the document, though: the
            panels below are h3s, so with nothing between them and the page's
            h1 the outline jumps two levels the moment a system is selected.
            An sr-only h2 names the section for crawlers and screen readers
            without putting the third voice back on the page — the same trick
            the hero uses to keep its full sentence. */}
        <h2 className="sr-only">The Ziiro System</h2>
        <SectionHeader
          index="01"
          label="The Ziiro System"
          meta={`${DIRECTORY_STATS.departments} departments`}
        />

        {/* Every number here is counted off the catalog, not typed into a
            sentence, so it cannot drift as the catalog changes. */}
        <MotionReveal>
          <p
            className="mt-8 max-w-[46ch] text-[17px] leading-relaxed md:text-[19px]"
            style={{ color: "var(--dir-dim)" }}
          >
            <Figure>{DIRECTORY_STATS.jobs}</Figure> jobs of work, mapped across{" "}
            <Figure>{DIRECTORY_STATS.agents}</Figure> agents in{" "}
            <Figure>{DIRECTORY_STATS.departments}</Figure> departments.
          </p>
        </MotionReveal>

        {/* The control row that used to sit here is gone, both halves of it.
            See the note at the top of this file for what each one was and why
            neither survived. */}

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
                Click a system · click it again to return
              </p>
            </div>

            {/* Keyed on the system, so changing it arrives. The agent is
                deliberately not in the key: opening an agent row must not
                re-fade the panel that row lives in. */}
            <div className="min-w-0">
              {pipeline ? (
                <Crossfade id={selectedId}>
                  <PipelinePanel
                    pipeline={pipeline}
                    activeAgentId={activeAgentId}
                    onAgentSelect={setActiveAgentId}
                    onSelect={select}
                  />
                </Crossfade>
              ) : (
                <DirectorySummary />
              )}
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
                  {/* THE ONE CONTROL THAT SURVIVED, and only here. There is no
                      graph at this width, so the phone has no node to click a
                      second time: without this there is no way back to the
                      list at all. The brief allows a Back action at 390 for
                      exactly this reason. It is scoped to the selection rather
                      than standing as a permanent reset, so it does not
                      reintroduce the control that was removed. */}
                  <BackToSystems onClick={() => select(ALL)} />
                  <PipelineIdentity pipeline={pipeline} />
                  <PipelineDetail
                    pipeline={pipeline}
                    activeAgentId={activeAgentId}
                    onAgentSelect={setActiveAgentId}
                  />
                </>
              ) : (
                /* The list SURVIVES on mobile, and only on mobile. Item 7
                   removes it because the visualisation already offers the same
                   selection, but at this width there is no visualisation: the
                   radial graph is desktop-only and MobileCore above is a mark,
                   not a control. Remove this and a phone cannot reach a system
                   at all. It gives a capability that is not available
                   immediately adjacent, which is the test. */
                <PipelinePanel pipeline={null} onSelect={select} />
              )}
            </Crossfade>
          </div>
        )}
      </div>
    </section>
  );
}

/** Two digits, so 07 and 48 line up in a column. Matches the panel's own. */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The whole system in totals, counted off the catalog.
 *
 * Deliberately the SAME figures, in the same order and the same grid, that
 * PipelineDetail shows for one system: agents, jobs, then the three marks. One
 * system and all seven are then the same shape at two scales, and selecting a
 * department reads as zooming rather than as swapping to an unrelated panel.
 *
 * Nothing here is typed. A new department, agent or job in the catalog moves
 * every one of these numbers on its own.
 */
const SYSTEM_TOTALS = (() => {
  const jobs = PIPELINES.flatMap(jobsIn);
  return [
    { label: "Agents", value: DIRECTORY_STATS.agents },
    { label: "Jobs", value: DIRECTORY_STATS.jobs },
    ...MARKS.map((m) => ({
      label: m.label,
      value: jobs.filter((j) => j.status === m.status).length,
    })),
  ];
})();

/**
 * What the right column shows before anything is selected: the whole system,
 * summarised.
 *
 * THIS IS NOT THE LIST THAT WAS REMOVED, and the difference is the point. The
 * removed index was seven clickable rows, one per system, which duplicated the
 * hub nodes sitting beside it: a second way to do the same selection. This
 * names no system and offers no selection at all. It says what the directory
 * is made of in aggregate and how the parts relate, which is the one thing the
 * graph cannot express: how many of the jobs carry which mark.
 *
 * The hint survives, but as a footnote under the overview rather than as the
 * entire content of the column.
 */
function DirectorySummary() {
  return (
    <div className="border-t pt-6" style={{ borderColor: "var(--dir-line)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3
          className="font-mono text-[10px] font-bold uppercase"
          style={{ letterSpacing: "0.24em", color: "var(--dir-ink)" }}
        >
          The whole system
        </h3>
        <p
          className="font-mono text-[10px] uppercase tabular-nums"
          style={{ letterSpacing: "0.18em", color: "var(--dir-faint)" }}
        >
          {pad(DIRECTORY_STATS.departments)} departments
        </p>
      </div>

      {/* No figure is spelled into this paragraph; the honest line is the
          plan's own copy line, so the graph and the plan say it the same way. */}
      <p
        className="mt-5 max-w-[46ch] text-[15px] leading-relaxed"
        style={{ color: "var(--dir-dim)" }}
      >
        Each department is a set of agents, and each agent carries its jobs,
        the outermost dots on the map, so the picture and these totals
        describe the same structure. {copy("sp.hero.honest")}
      </p>

      <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
        {SYSTEM_TOTALS.map((c) => (
          <div
            key={c.label}
            className="border-t pt-4"
            style={{ borderColor: "var(--dir-line)" }}
          >
            <dt
              className="font-mono text-[9px] uppercase"
              style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
            >
              {c.label}
            </dt>
            <dd
              className="mt-2.5 font-display font-semibold tabular-nums"
              style={{
                fontSize: "34px",
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "var(--dir-ink)",
              }}
            >
              {pad(c.value)}
            </dd>
          </div>
        ))}
      </dl>

      {/* The rule sits on the wrapper and the measure on the text. Both on one
          element and the hairline stops where the paragraph does, which reads
          as a broken border rather than as a divider. */}
      <div
        className="mt-10 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <p
          className="max-w-[42ch] text-[13px] leading-relaxed"
          style={{ color: "var(--dir-faint)" }}
        >
          Click a system on the map to see its agents and their jobs. Click it
          again to come back here.
        </p>
      </div>
    </div>
  );
}

/** The phone's way back to the list, because a phone has no node to re-click. */
function BackToSystems({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-3 flex items-center gap-2.5 rounded-sm py-3 font-mono text-[10px] font-bold uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dir-ink)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--dir-bg)]"
      style={{
        letterSpacing: "0.2em",
        color: "var(--dir-faint)",
        transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
      }}
    >
      <span aria-hidden="true">&larr;</span>
      All systems
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
 * The very first render carries no fade, because it would be written into the
 * prerendered markup — and a panel that ships as opacity:0 is a panel nobody
 * whose JS failed will ever read. The fade is a CSS animation (index.css), so
 * the swap costs no animation library.
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
    <div
      key={id}
      className={className}
      style={
        mounted.current
          ? { animation: `directory-fade ${MS.swap}ms ${CSS_EASE.outExpo} both` }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/** A counted number, set to read as a figure rather than as prose. */
function Figure({ children }: { children: ReactNode }) {
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
