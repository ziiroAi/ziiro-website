import type { Pipeline } from "./pipelines";

/**
 * What the selected system is, and what is inside it.
 *
 * Two deliberate absences. There are no performance figures — no hours saved,
 * no volume processed — because no measured figure exists for these pipelines
 * and inventing one would undo the claim the rest of the page makes. What's
 * shown instead is structure a reader can check against the map beside it.
 * And there are no cards: the panel is hairlines and type, so it reads as a
 * specification rather than as an admin screen.
 *
 * The agent list is controlled from above. Opening a row here lights that
 * agent's node on the map, and clicking the node opens the row — one selection,
 * two renderings of it.
 */

interface PipelinePanelProps {
  pipeline: Pipeline;
  activeAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

/**
 * Desktop composes the two halves into one column. Mobile renders them either
 * side of the workflow, so a phone reads identity → flow → agents rather than
 * being handed the whole specification before it has seen what the thing does.
 */
export default function PipelinePanel(props: PipelinePanelProps) {
  return (
    <div>
      <PipelineIdentity pipeline={props.pipeline} />
      <PipelineDetail {...props} />
    </div>
  );
}

export function PipelineIdentity({ pipeline }: { pipeline: Pipeline }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className="font-mono text-[10px] font-bold uppercase"
          style={{ letterSpacing: "0.26em", color: pipeline.accent }}
        >
          {pipeline.category}
        </span>
        <span
          className="flex items-center gap-2 font-mono text-[10px] uppercase"
          style={{ letterSpacing: "0.22em", color: "var(--dir-dim)" }}
        >
          <span
            aria-hidden="true"
            className="directory-pulse block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--dir-live)" }}
          />
          {pipeline.status === "active" ? "Active" : "In build"}
        </span>
      </p>

      <h3
        className="mt-5 font-display font-semibold"
        style={{
          fontSize: "clamp(1.9rem, 3.2vw, 2.6rem)",
          letterSpacing: "-0.035em",
          lineHeight: 1.02,
          color: "var(--dir-ink)",
        }}
      >
        {pipeline.name}
      </h3>
      <p className="mt-2 text-[13px]" style={{ color: "var(--dir-faint)" }}>
        {pipeline.tagline}
      </p>

      <p
        className="mt-6 max-w-[52ch] text-[15px] leading-relaxed"
        style={{ color: "var(--dir-dim)" }}
      >
        {pipeline.purpose}
      </p>

    </div>
  );
}

export function PipelineDetail({
  pipeline,
  activeAgentId,
  onAgentSelect,
}: PipelinePanelProps) {
  return (
    <div>
      {/* ── The shape of the system. A line of type, not a row of tiles. ── */}
      <dl
        className="mt-9 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <Metric label="Steps" value={pipeline.steps.length} />
        <Metric label="Agents" value={pipeline.agents.length} />
        <Metric label="Integrations" value={pipeline.integrations.length} />
      </dl>

      <div
        className="mt-5 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <Caption>Trigger</Caption>
        <p className="mt-2 text-[13px]" style={{ color: "var(--dir-dim)" }}>
          {pipeline.trigger}
        </p>
      </div>

      <div
        className="mt-5 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <Caption>Connected to</Caption>
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--dir-dim)" }}
        >
          {pipeline.integrations.map((tool, i) => (
            <span key={tool}>
              {i > 0 && (
                <span aria-hidden="true" style={{ color: "var(--dir-faint)" }}>
                  {"  ·  "}
                </span>
              )}
              {tool}
            </span>
          ))}
        </p>
      </div>

      {/* ── Agents ── */}
      <div className="mt-10">
        <Caption>Agents</Caption>

        <ul className="mt-4">
          {pipeline.agents.map((agent, i) => {
            const open = activeAgentId === agent.id;
            const next = pipeline.agents[i + 1];

            return (
              <li
                key={agent.id}
                className="border-t"
                style={{ borderColor: "var(--dir-line)" }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onAgentSelect(open ? null : agent.id)}
                  className="group relative flex w-full items-baseline gap-4 py-3.5 pl-4 pr-1 text-left"
                >
                  {/* The accent rail. Grows on hover, stays on when open. */}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-0 top-2 w-px transition-opacity duration-200 group-hover:opacity-100"
                    style={{
                      background: pipeline.accent,
                      opacity: open ? 1 : 0,
                    }}
                  />
                  <span
                    className="font-mono text-[10px] tabular-nums transition-colors duration-200"
                    style={{ color: open ? pipeline.accent : "var(--dir-faint)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="text-[15px] transition-colors duration-200 group-hover:text-[var(--dir-ink)]"
                    style={{ color: open ? "var(--dir-ink)" : "var(--dir-dim)" }}
                  >
                    {agent.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto shrink-0 font-mono text-[14px] leading-none transition-transform duration-300"
                    style={{
                      color: open ? pipeline.accent : "var(--dir-faint)",
                      transform: open ? "rotate(45deg)" : "none",
                    }}
                  >
                    +
                  </span>
                </button>

                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="pb-8 pl-9 pr-1 pt-1">
                      <p
                        className="max-w-[46ch] text-[13px] leading-relaxed"
                        style={{ color: "var(--dir-dim)" }}
                      >
                        {agent.role}
                      </p>

                      {/* Input → process → output → whoever gets it next.
                          Agents are links in a chain, and the chain is the
                          thing worth showing. */}
                      <div className="relative mt-6 pl-5">
                        <span
                          aria-hidden="true"
                          className="absolute bottom-2 left-0 top-2 w-px"
                          style={{
                            background: `linear-gradient(to bottom, ${pipeline.accent}66, ${pipeline.accent}10)`,
                          }}
                        />
                        <Link label="Input" accent={pipeline.accent}>
                          {agent.input}
                        </Link>
                        <Link label="Process" accent={pipeline.accent}>
                          {agent.capabilities.join("  ·  ")}
                        </Link>
                        <Link label="Output" accent={pipeline.accent}>
                          {agent.output}
                        </Link>
                        <Link
                          label={next ? "Hands to" : "Leaves the pipeline as"}
                          accent={pipeline.accent}
                          terminal
                        >
                          {next ? next.name : pipeline.outputs[0]}
                        </Link>
                      </div>

                      <div className="mt-6">
                        <Caption>Weighs up</Caption>
                        <ul className="mt-2.5 space-y-1.5">
                          {agent.logic.map((line) => (
                            <li
                              key={line}
                              className="max-w-[46ch] text-[13px] leading-snug"
                              style={{ color: "var(--dir-dim)" }}
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div
          className="border-t"
          style={{ borderColor: "var(--dir-line)" }}
        />
      </div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono text-[9px] uppercase"
      style={{ letterSpacing: "0.26em", color: "var(--dir-faint)" }}
    >
      {children}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="sr-only">{label}</dt>
      <dd
        className="font-display text-[26px] font-semibold tabular-nums"
        style={{ letterSpacing: "-0.03em", color: "var(--dir-ink)" }}
      >
        {String(value).padStart(2, "0")}
      </dd>
      <span
        aria-hidden="true"
        className="font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Link({
  label,
  children,
  accent,
  terminal,
}: {
  label: string;
  children: React.ReactNode;
  accent: string;
  terminal?: boolean;
}) {
  return (
    <div className="relative pb-4 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute -left-5 top-[7px] block h-1.5 w-1.5 rounded-full"
        style={{
          background: terminal ? accent : "var(--dir-bg)",
          border: `1px solid ${accent}`,
        }}
      />
      <p
        className="font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 max-w-[42ch] text-[13px] leading-snug"
        style={{ color: terminal ? accent : "var(--dir-ink)" }}
      >
        {children}
      </p>
    </div>
  );
}
