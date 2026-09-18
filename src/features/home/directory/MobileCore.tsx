import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { Pipeline } from "./pipelines";
import { DIRECTORY_STATS, PIPELINES } from "./pipelines";
import { DURATION, EASE_OUT_EXPO } from "@/shared/motion/tokens";

/**
 * The intelligence layer, for a phone.
 *
 * A radial graph squeezed into 360px is unreadable, so the map isn't shrunk —
 * it's replaced with the one relationship the map exists to establish: this
 * system hangs off a shared intelligence layer, and it has this many agents
 * inside it. The selector above does the map's navigation job, and the
 * workflow below does its explanatory one.
 *
 * With nothing narrowed to — the "all" selection the section opens on — it
 * says what the whole directory holds instead, every system at equal weight,
 * which is the same thing the radial says on a wide screen. Both figures are
 * counted off the pipeline data.
 *
 * The seven per-system hues are gone from here for the same reason they are
 * gone from the radial: they were seven lights chosen for a black field, and
 * on paper the warm end of that ramp is 2.4:1, which is not a colour a system
 * name can be set in. The phone's version says the same thing in ink, and
 * spends the accent where the rest of the directory spends it, on the one
 * system you have narrowed to.
 */
export default function MobileCore({ pipeline }: { pipeline: Pipeline | null }) {
  const shouldReduce = useReducedMotion();
  // The ring stays mounted through a system change so its 24-second rotation is
  // never reset to zero; only the identity beneath it is re-keyed, and only
  // from the second render onwards — framer writes `initial` into the
  // prerendered markup, and a system name that ships as opacity:0 is a name
  // nobody whose JS failed will ever read.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  // A narrowed system is the thing you are reading, so it takes the accent;
  // "all" is a scope rather than a system, so it takes the ink, the way the
  // selector chip does, and never reads as one more system.
  const accent = pipeline ? "var(--dir-live)" : "var(--dir-ink)";

  return (
    <div className="flex flex-col items-center text-center">
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        aria-hidden="true"
        className="overflow-visible"
      >
        <circle cx="17" cy="17" r="16" fill="none" stroke="var(--dir-line)" />
        <circle
          cx="17"
          cy="17"
          r="9"
          fill="none"
          stroke="var(--dir-line-strong)"
          strokeDasharray="2 5"
          className="directory-orbit"
          style={{ transformOrigin: "17px 17px" }}
        />
        <circle cx="17" cy="17" r="3" fill="var(--dir-ink)" />
      </svg>

      <p
        className="mt-3 font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.32em", color: "var(--dir-faint)" }}
      >
        Ziiro Intelligence
      </p>

      <motion.div
        key={pipeline ? pipeline.id : "all"}
        className="flex flex-col items-center"
        initial={!shouldReduce && mounted.current ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.swap, ease: EASE_OUT_EXPO }}
      >
        <span
          aria-hidden="true"
          className="my-4 block h-10 w-px"
          style={{
            background: `linear-gradient(to bottom, var(--dir-line), ${accent})`,
          }}
        />

        <p
          className="font-mono text-[10px] uppercase"
          style={{ letterSpacing: "0.26em", color: accent }}
        >
          {pipeline ? pipeline.name : "All systems"}
        </p>

        {pipeline ? (
          <>
            <div aria-hidden="true" className="mt-4 flex items-center gap-1.5">
              {pipeline.agents.map((agent) => (
                <span
                  key={agent.id}
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--dir-live)", opacity: 0.7 }}
                />
              ))}
            </div>
            <p
              className="mt-3 font-mono text-[9px] uppercase"
              style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
            >
              {pipeline.agents.length} agents
            </p>
          </>
        ) : (
          <>
            {/* One dot per system, all at equal weight and none dimmed: the
                phone's version of the radial with nothing narrowed to. */}
            <div aria-hidden="true" className="mt-4 flex items-center gap-1.5">
              {PIPELINES.map((system) => (
                <span
                  key={system.id}
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--dir-ink)", opacity: 0.7 }}
                />
              ))}
            </div>
            <p
              className="mt-3 font-mono text-[9px] uppercase"
              style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
            >
              {PIPELINES.length} systems · {DIRECTORY_STATS.agents} agents
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
