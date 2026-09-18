import { useEffect, useRef, useState } from "react";
import { animate, cubicBezier, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";

import type { Pipeline } from "./pipelines";
import { findAgent } from "./pipelines";
import { AllSystemsIndex, Caption, Series } from "./PipelinePanel";
import {
  CSS_EASE,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";

/**
 * The right column's flow view: the selected system as a workflow, every step
 * in order on one rail.
 *
 * Where the map answers "what systems exist", this answers "how does this one
 * work" — so each step names the agent that owns it, which is the join between
 * the two views. It replaces the panel in the right-hand column rather than
 * taking the map's place, so it is laid out for a column roughly half the
 * width the flow used to have: one step per row, the tag and the counts on
 * their own lines rather than trailing the name.
 *
 * No cards, for the same reason the panel next to it has none: a rail, a
 * marker and type. Steps open in place, because the sequence is what is being
 * read and losing your position in it to inspect one step would defeat the
 * view. With no system selected it shows the same index the panel does.
 */

const expoOut = cubicBezier(...EASE_OUT_EXPO);

/** anime.js counts in milliseconds and the tokens in seconds. */
const ARRIVE_MS = Math.round(STAGGER.tight * 1000);

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The staggered arrival. A copy of the panel's, deliberately: the other files
 * in this directory belong to other owners, so there is nowhere shared to put
 * it. See PipelinePanel for why it keys off the selection and why the elements
 * opt in with `data-map-reveal` rather than an inline opacity.
 */
function useArrival(key: string) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>("[data-map-reveal]")];
    if (els.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const arrival = animate(els, {
      opacity: [0, 1],
      y: [TRAVEL.reveal, 0],
      delay: reduced ? 0 : stagger(ARRIVE_MS),
      duration: reduced ? 0 : MS.reveal,
      ease: expoOut,
    });

    return () => {
      arrival.revert();
    };
  }, [key]);

  return rootRef;
}

interface FlowViewProps {
  /** null is the "all" selection: no single system, so the index renders. */
  pipeline: Pipeline | null;
  /** Lit when its agent is the selected one, so the flow shows which stretch
   *  of the pipeline an agent is responsible for. */
  activeAgentId?: string | null;
  /** Selecting a system from the index. */
  onSelect?: (id: string) => void;
}

export default function FlowView({
  pipeline,
  activeAgentId = null,
  onSelect,
}: FlowViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  const rootRef = useArrival(pipeline ? pipeline.id : "all");

  // Only the height is real motion here, so it is the only thing the reduced
  // motion preference removes: the step still opens, it just opens at once.
  const expand = shouldReduce
    ? "none"
    : `grid-template-rows ${MS.swap}ms ${CSS_EASE.outExpo}`;

  if (!pipeline) {
    return (
      <div key="all" ref={rootRef} data-directory-view="flow" className="min-w-0">
        <AllSystemsIndex onSelect={onSelect} />
      </div>
    );
  }

  const automated = pipeline.steps.filter((s) => s.automated).length;

  return (
    <div key={pipeline.id} ref={rootRef} data-directory-view="flow" className="min-w-0">
      <div
        data-map-reveal
        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
      >
        <Caption>Workflow</Caption>
        <p
          className="font-mono text-[10px] uppercase tabular-nums"
          style={{ letterSpacing: "0.18em", color: "var(--dir-faint)" }}
        >
          {pad(pipeline.steps.length)} steps · {pad(automated)} automated
        </p>
      </div>

      <div
        data-map-reveal
        className="mt-5 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <Caption>Trigger</Caption>
        <p
          className="mt-2 max-w-[48ch] text-[13px] leading-relaxed"
          style={{ color: "var(--dir-dim)" }}
        >
          {pipeline.trigger}
        </p>
      </div>

      <ol className="relative mt-8">
        {/* The rail. A flat hairline rather than a gradient, with the accent
            kept for the markers: the line is structure, the colour is data.
            It stops at the last marker so the sequence visibly ends. */}
        <span
          aria-hidden="true"
          className="absolute bottom-10 left-[3px] top-6 w-px"
          style={{ background: "var(--dir-line-strong)" }}
        />

        {pipeline.steps.map((step, i) => {
          const open = openId === step.id;
          const agent = findAgent(pipeline, step.agent);
          const lit = !activeAgentId || step.agent === activeAgentId;

          return (
            <li
              key={step.id}
              data-map-reveal
              className="relative border-t first:border-t-0"
              style={{ borderColor: "var(--dir-line)" }}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : step.id)}
                aria-expanded={open}
                className="group w-full py-5 pl-9 pr-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--dir-ink)]"
                style={{
                  // Dimming the steps an agent doesn't own is a change of
                  // emphasis, not a reveal, so it moves at the swap rate the
                  // rest of the directory changes state on.
                  opacity: lit ? 1 : 0.45,
                  transition: `opacity ${MS.swap}ms ${CSS_EASE.out}`,
                }}
              >
                {/* Filled for a step that runs unattended, hollow for one that
                    waits on a person. The map draws its nodes the same way.
                    The fill is the accent rather than the system's own hue:
                    seven hues were seven lights on a black field, and on paper
                    the warm end of that ramp runs at 2.4:1. Accent here means
                    the same thing it means in the label beside it, which is
                    that this step runs without anyone. */}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[30px] block h-[7px] w-[7px] rounded-full"
                  style={{
                    background: step.automated ? "var(--dir-live)" : "var(--dir-bg)",
                    border: `1px solid ${
                      step.automated ? "var(--dir-live)" : "var(--dir-line-strong)"
                    }`,
                  }}
                />

                <span className="flex items-baseline gap-x-3">
                  <span
                    className="font-mono text-[10px] tabular-nums"
                    style={{ color: "var(--dir-faint)" }}
                  >
                    {pad(i + 1)}
                  </span>
                  <span
                    className="font-display text-[16px] font-semibold"
                    style={{
                      letterSpacing: "-0.02em",
                      color: open ? "var(--dir-live)" : "var(--dir-ink)",
                      transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                    }}
                  >
                    {step.name}
                  </span>
                  <span
                    className="ml-auto shrink-0 font-mono text-[9px] uppercase"
                    style={{
                      letterSpacing: "0.2em",
                      color: step.automated ? "var(--dir-live)" : "var(--dir-faint)",
                    }}
                  >
                    {step.automated ? "Auto" : "Human"}
                  </span>
                </span>

                {agent && (
                  <span
                    className="mt-1 block font-mono text-[10px] uppercase"
                    style={{ letterSpacing: "0.16em", color: "var(--dir-faint)" }}
                  >
                    {agent.name}
                  </span>
                )}

                <span
                  className="mt-2 block max-w-[48ch] text-[13px] leading-relaxed"
                  style={{ color: "var(--dir-dim)" }}
                >
                  {step.description}
                </span>

                <span
                  className="grid"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: expand }}
                >
                  <span className="overflow-hidden">
                    <span className="mt-5 grid gap-x-8 gap-y-5 pb-1 sm:grid-cols-2">
                      <StepField label="Input" value={step.input} />
                      <StepField label="Output" value={step.output} />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        data-map-reveal
        className="mt-2 border-t pt-5"
        style={{ borderColor: "var(--dir-line)" }}
      >
        <Caption>Outputs</Caption>
        <p
          className="mt-2 max-w-[48ch] text-[13px] leading-relaxed"
          style={{ color: "var(--dir-ink)" }}
        >
          <Series items={pipeline.outputs} />
        </p>
      </div>
    </div>
  );
}

/** A step's input or output. Spans rather than the panel's dt/dd, because
 *  everything inside a <button> has to be phrasing content. */
function StepField({ label, value }: { label: string; value: string }) {
  return (
    <span className="block">
      <span
        className="block font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
      >
        {label}
      </span>
      <span
        className="mt-1.5 block max-w-[34ch] text-[13px] leading-snug"
        style={{ color: "var(--dir-ink)" }}
      >
        {value}
      </span>
    </span>
  );
}
