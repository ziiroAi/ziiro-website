import { useState } from "react";
import { useReducedMotion } from "framer-motion";

import type { Pipeline } from "./pipelines";
import { findAgent } from "./pipelines";
import { CSS_EASE, MS } from "@/shared/motion/tokens";

/**
 * The selected pipeline as a workflow: every step in order, on one rail.
 *
 * Where the map answers "what systems exist", this answers "how does this one
 * work" — so each step names the agent that owns it, which is the join between
 * the two views. Steps open in place rather than into a modal, because the
 * sequence is what's being read and losing your position in it to inspect one
 * step would defeat the view.
 *
 * No cards. A rail, a marker, and type: the same reason the panel next to it
 * has none. The height animates with the grid-template-rows 0fr→1fr technique,
 * so nothing is measured in JS; where a browser doesn't support it the detail
 * simply appears.
 */

interface FlowViewProps {
  pipeline: Pipeline;
  /** Lit when its agent is the selected one, so the flow shows which stretch
   *  of the pipeline an agent is responsible for. */
  activeAgentId: string | null;
}

export default function FlowView({ pipeline, activeAgentId }: FlowViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  // Only the height is real motion here, so it is the only thing the reduced
  // motion preference removes: the step still opens, it just opens at once.
  const expand = shouldReduce
    ? "none"
    : `grid-template-rows ${MS.swap}ms ${CSS_EASE.outExpo}`;

  return (
    <div className="max-w-[42rem]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p
          className="font-mono text-[9px] uppercase"
          style={{ letterSpacing: "0.26em", color: "var(--dir-faint)" }}
        >
          Workflow
        </p>
        <p
          className="font-mono text-[10px]"
          style={{ letterSpacing: "0.04em", color: "var(--dir-faint)" }}
        >
          Trigger — {pipeline.trigger}
        </p>
      </div>

      <ol
        className="relative mt-6 border-t"
        style={{ borderColor: "var(--dir-line)" }}
      >
        {/* The rail. Stops at the last marker so the sequence visibly ends. */}
        <span
          aria-hidden="true"
          className="absolute bottom-10 left-[3px] top-7 w-px"
          style={{
            background: `linear-gradient(to bottom, ${pipeline.accent}55, ${pipeline.accent}12)`,
          }}
        />

        {pipeline.steps.map((step, i) => {
          const open = openId === step.id;
          const agent = findAgent(pipeline, step.agent);
          const lit = !activeAgentId || step.agent === activeAgentId;

          return (
            <li key={step.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : step.id)}
                aria-expanded={open}
                className="group w-full py-4 pl-10 pr-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--dir-ink)]"
                style={{
                  opacity: lit ? 1 : 0.5,
                  // Dimming the steps an agent doesn't own is a change of
                  // emphasis, not a reveal, so it moves at the swap rate the
                  // rest of the directory changes state on.
                  transition: `opacity ${MS.swap}ms ${CSS_EASE.out}`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[26px] block h-[7px] w-[7px] rounded-full"
                  style={{
                    background: step.automated
                      ? pipeline.accent
                      : "var(--dir-bg)",
                    border: `1px solid ${
                      step.automated ? pipeline.accent : "var(--dir-line-strong)"
                    }`,
                  }}
                />

                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className="font-mono text-[10px] tabular-nums"
                    style={{ color: pipeline.accent }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="font-display text-[17px] font-semibold"
                    style={{
                      letterSpacing: "-0.02em",
                      color: open ? pipeline.accent : "var(--dir-ink)",
                      transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                    }}
                  >
                    {step.name}
                  </span>
                  {agent && (
                    <span
                      className="font-mono text-[10px] uppercase"
                      style={{
                        letterSpacing: "0.16em",
                        color: "var(--dir-faint)",
                      }}
                    >
                      {agent.name}
                    </span>
                  )}
                  <span
                    className="ml-auto shrink-0 font-mono text-[9px] uppercase"
                    style={{
                      letterSpacing: "0.2em",
                      color: step.automated
                        ? "var(--dir-live)"
                        : "var(--dir-faint)",
                    }}
                  >
                    {step.automated ? "Auto" : "Human"}
                  </span>
                </span>

                <span
                  className="mt-1.5 block max-w-[52ch] text-[13px] leading-relaxed"
                  style={{ color: "var(--dir-dim)" }}
                >
                  {step.description}
                </span>

                <span
                  className="grid"
                  style={{
                    gridTemplateRows: open ? "1fr" : "0fr",
                    transition: expand,
                  }}
                >
                  <span className="overflow-hidden">
                    <span className="mt-4 flex flex-wrap gap-x-10 gap-y-3 pb-1">
                      <Field label="Input" value={step.input} />
                      <Field label="Output" value={step.output} />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className="mt-6 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <span
          className="font-mono text-[9px] uppercase"
          style={{ letterSpacing: "0.26em", color: "var(--dir-faint)" }}
        >
          Outputs
        </span>
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: "var(--dir-ink)" }}
        >
          {pipeline.outputs.map((out, i) => (
            <span key={out}>
              {i > 0 && (
                <span aria-hidden="true" style={{ color: "var(--dir-faint)" }}>
                  {"  ·  "}
                </span>
              )}
              {out}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="block">
      <span
        className="block font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
      >
        {label}
      </span>
      <span
        className="mt-1 block max-w-[34ch] text-[13px] leading-snug"
        style={{ color: "var(--dir-ink)" }}
      >
        {value}
      </span>
    </span>
  );
}
