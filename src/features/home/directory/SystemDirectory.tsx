import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import SectionHeader from "@/shared/ui/section-header";
import ScrollScene from "@/shared/motion/ScrollScene";
import EcosystemMap from "./EcosystemMap";
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
} from "@/shared/motion/tokens";

/**
 * The system directory — the page's proof section.
 *
 * The hero makes a claim; this is where a visitor goes and looks at what the
 * claim is made of. Two views of one dataset: the map answers "what has been
 * built and how does it connect", the workflow answers "how does this one
 * actually run". Neither is a summary of the other.
 *
 * Selection lives here, and there are two parts to it — which system, and
 * which agent inside it. Both are passed down to every view, which is what
 * makes the map and the panel one interface rather than two: clicking an agent
 * node opens its row, opening its row lights its node, and the workflow dims
 * the steps that agent doesn't own.
 *
 * Desktop and mobile render different trees on purpose. A radial graph at
 * 360px wide is unreadable, so the phone gets the intelligence mark, then the
 * system, then its workflow, then its agents — the same information in the
 * order a small screen can actually read it.
 */

type View = "radial" | "flow";

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
  const [selectedId, setSelectedId] = useState(PIPELINES[0].id);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [view, setView] = useState<View>("radial");
  const isWide = useIsWide();

  const pipeline = findPipeline(selectedId);

  // A different system is a different set of agents, so a selection can't
  // survive the switch — it would open an unrelated agent in the same slot.
  const selectPipeline = (id: string) => {
    setSelectedId(id);
    setActiveAgentId(null);
  };

  return (
    <section
      id="systems"
      data-dir-dark
      data-nav-dark
      className="relative isolate overflow-hidden"
    >
      <Atmosphere />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-32">
        <SectionHeader
          index="01"
          label="The Ziiro System"
          meta={`${DIRECTORY_STATS.departments} departments`}
          titleA="Systems,"
          titleB="not demos."
        />

        {/* Every number here is counted off the pipeline data, not typed into
            a sentence — so it cannot drift as systems are added, and the
            "run today" figure drops anything still in build on its own. */}
        <ScrollScene exitTo={1}>
          <p
            className="mt-8 max-w-[46ch] text-[17px] leading-relaxed md:text-[19px]"
            style={{ color: "var(--dir-dim)" }}
          >
            <Figure>{DIRECTORY_STATS.jobs}</Figure> jobs of work, mapped across{" "}
            <Figure>{DIRECTORY_STATS.agents}</Figure> agents in{" "}
            <Figure>{DIRECTORY_STATS.departments}</Figure> departments.{" "}
            <Figure>{DIRECTORY_STATS.liveJobs}</Figure> of them run today.
          </p>
        </ScrollScene>

        {/* ── Controls ── */}
        <ScrollScene exitTo={1}>
          <div className="mt-14 flex flex-col gap-6 border-t border-[var(--dir-line)] pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Choose a system"
              className="flex flex-wrap gap-x-7 gap-y-3"
            >
              {PIPELINES.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectPipeline(p.id)}
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
                        // Named properties rather than `all`, which would also
                        // ease the hairline outline below and leave a grey
                        // frame around the marker for the length of the swap.
                        transition: `background-color ${MS.micro}ms ${CSS_EASE.out}, box-shadow ${MS.quick}ms ${CSS_EASE.out}`,
                        // A system still in build gets a hollow marker even
                        // when it's the one selected, so the selector never
                        // implies something ships that doesn't.
                        background:
                          active && p.status === "active"
                            ? "var(--dir-live)"
                            : "transparent",
                        border:
                          p.status === "active"
                            ? "none"
                            : "1px solid var(--dir-line-strong)",
                        boxShadow:
                          active && p.status === "active"
                            ? "0 0 10px var(--dir-live)"
                            : "none",
                        outline:
                          active || p.status !== "active"
                            ? "none"
                            : "1px solid var(--dir-line-strong)",
                        outlineOffset: "-1px",
                      }}
                    />
                    <span
                      className="group-hover:text-[var(--dir-ink)]"
                      style={{ transition: `color ${MS.micro}ms ${CSS_EASE.out}` }}
                    >
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View toggle. Hidden where there is only one view to pick. */}
            <div
              role="group"
              aria-label="Choose a view"
              className="hidden shrink-0 items-center gap-5 lg:flex"
            >
              {(["radial", "flow"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className="relative rounded-sm font-mono text-[10px] font-bold uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dir-ink)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--dir-bg)]"
                  style={{
                    letterSpacing: "0.24em",
                    color:
                      view === v ? "var(--dir-ink)" : "var(--dir-faint)",
                    transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                  }}
                >
                  {v}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-0 block h-px w-full"
                    style={{
                      background: "var(--dir-ink)",
                      opacity: view === v ? 1 : 0,
                      transition: `opacity ${MS.micro}ms ${CSS_EASE.out}`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </ScrollScene>

        {isWide ? (
          <div className="mt-14 grid grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-16">
            <div className="min-w-0">
              <Crossfade id={view}>
                {view === "radial" ? (
                  <>
                    <EcosystemMap
                      pipelines={PIPELINES}
                      selectedId={selectedId}
                      onSelect={selectPipeline}
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
                      Select a system · click an agent to inspect it
                    </p>
                  </>
                ) : (
                  <FlowView pipeline={pipeline} activeAgentId={activeAgentId} />
                )}
              </Crossfade>
            </div>

            {/* Keyed on the system, not on the agent: opening an agent row
                must not re-fade the panel that row lives in. */}
            <div className="min-w-0">
              <Crossfade id={selectedId}>
                <PipelinePanel
                  pipeline={pipeline}
                  activeAgentId={activeAgentId}
                  onAgentSelect={setActiveAgentId}
                />
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
              <PipelineIdentity pipeline={pipeline} />
              <FlowView pipeline={pipeline} activeAgentId={activeAgentId} />
              <PipelineDetail
                pipeline={pipeline}
                activeAgentId={activeAgentId}
                onAgentSelect={setActiveAgentId}
              />
            </Crossfade>
          </div>
        )}
      </div>
    </section>
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

/** The same field as the hero, quieter. The two sections sit against each
 *  other, so the page opens as one dark block rather than two panels. */
function Atmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="hero-drift-b absolute left-1/2 top-1/4 h-[min(900px,80vw)] w-[min(900px,80vw)] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,138,61,0.13) 0%, rgba(232,89,140,0.04) 40%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "var(--hero-noise)",
          backgroundSize: "160px 160px",
        }}
      />
    </div>
  );
}
