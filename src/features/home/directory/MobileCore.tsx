import type { Pipeline } from "./pipelines";

/**
 * The intelligence layer, for a phone.
 *
 * A radial graph squeezed into 360px is unreadable, so the map isn't shrunk —
 * it's replaced with the one relationship the map exists to establish: this
 * system hangs off a shared intelligence layer, and it has this many agents
 * inside it. The selector above does the map's navigation job, and the
 * workflow below does its explanatory one.
 */
export default function MobileCore({ pipeline }: { pipeline: Pipeline }) {
  return (
    <div className="flex flex-col items-center text-center">
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        aria-hidden="true"
        className="overflow-visible"
      >
        <circle
          cx="17"
          cy="17"
          r="16"
          fill="none"
          stroke="rgba(242,238,233,0.12)"
        />
        <circle
          cx="17"
          cy="17"
          r="9"
          fill="none"
          stroke="rgba(140,106,255,0.34)"
          strokeDasharray="2 5"
          className="directory-orbit"
          style={{ transformOrigin: "17px 17px" }}
        />
        <circle cx="17" cy="17" r="3" fill="#f2eee9" />
      </svg>

      <p
        className="mt-3 font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.32em", color: "var(--dir-faint)" }}
      >
        Ziiro Intelligence
      </p>

      <span
        aria-hidden="true"
        className="my-4 block h-10 w-px"
        style={{
          background: `linear-gradient(to bottom, rgba(242,238,233,0.16), ${pipeline.accent})`,
        }}
      />

      <p
        className="font-mono text-[10px] uppercase"
        style={{ letterSpacing: "0.26em", color: pipeline.accent }}
      >
        {pipeline.name}
      </p>

      <div aria-hidden="true" className="mt-4 flex items-center gap-1.5">
        {pipeline.agents.map((agent) => (
          <span
            key={agent.id}
            className="block h-1.5 w-1.5 rounded-full"
            style={{ background: pipeline.accent, opacity: 0.7 }}
          />
        ))}
      </div>
      <p
        className="mt-3 font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
      >
        {pipeline.agents.length} agents
      </p>
    </div>
  );
}
