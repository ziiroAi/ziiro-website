import { useEffect, useRef, type ReactNode } from "react";
import { animate, cubicBezier, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";

import type { Pipeline, PipelineStatus } from "./pipelines";
import { DIRECTORY_STATS, PIPELINES } from "./pipelines";
import {
  CSS_EASE,
  EASE_OUT_EXPO,
  MS,
  STAGGER,
  TRAVEL,
} from "@/shared/motion/tokens";

/**
 * The right column's detail view: what the selected system is, what it is made
 * of, and which agents run it. With no system selected it hands over to the
 * all-systems index below, which is the same content the flow view falls back
 * to — one selection, one index.
 *
 * Three rules hold the look together:
 *
 *   1. Hairlines and type, never a filled card. Every rule on this panel is a
 *      single border-top; nothing nests, nothing is rounded, nothing casts a
 *      shadow. The panel should read as a specification, not an admin screen.
 *   2. The number is the hero of a data row. A large tabular figure with a
 *      small mono caption above it, and every figure is COUNTED off the
 *      pipeline data — there are no performance metrics here because no
 *      measured figure exists, and inventing one would undo the claim the rest
 *      of the page makes.
 *   3. Content arrives one element at a time, the way the dot-art scenes do.
 *
 * The agent list is controlled from above: opening a row lights that agent's
 * node on the map, and clicking the node opens the row.
 */

const expoOut = cubicBezier(...EASE_OUT_EXPO);

/** anime.js counts in milliseconds and the tokens in seconds. Tight rather
 *  than card-paced: a panel is a dozen elements, and at 90ms apart the last
 *  one would still be arriving a second after the first. */
const ARRIVE_MS = Math.round(STAGGER.tight * 1000);

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The staggered arrival, shared in shape with FlowView's copy of it.
 *
 * Elements opt in with `data-map-reveal`, which index.css hides ONLY under the
 * `js` class — so the prerendered markup a crawler sees is complete, and the
 * hiding is CSS rather than an inline style that would ship in the HTML.
 *
 * `key` is the selection: changing it remounts the subtree (see the keyed
 * wrapper below), so the effect re-runs against fresh, still-hidden nodes and
 * the cascade plays once per change rather than every render. Remounting is
 * what avoids a frame of fully-visible content: React would otherwise leave
 * the previous run's inline opacity in place until the effect fired.
 *
 * It lives in both files rather than in a shared module because the other
 * files in this directory belong to other owners.
 *
 * `enabled` is false for a block whose ancestor is already running the cascade
 * over it. That matters because the identity and the detail are rendered two
 * ways: composed into this panel on desktop, and standalone on mobile. Their
 * elements are hidden by CSS either way, so the standalone ones have to reveal
 * themselves or they never appear at all.
 */
function useArrival(key: string, enabled = true) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
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
  }, [key, enabled]);

  return rootRef;
}

/** Set by a parent that is already running the arrival over this block. */
interface Managed {
  managed?: boolean;
}

interface PipelinePanelProps {
  /** null is the "all" selection: no single system, so the index renders. */
  pipeline: Pipeline | null;
  activeAgentId?: string | null;
  onAgentSelect?: (agentId: string | null) => void;
  /** Selecting a system from the index. */
  onSelect?: (id: string) => void;
}

export default function PipelinePanel({
  pipeline,
  activeAgentId = null,
  onAgentSelect,
  onSelect,
}: PipelinePanelProps) {
  const rootRef = useArrival(pipeline ? pipeline.id : "all");

  return (
    <div
      key={pipeline ? pipeline.id : "all"}
      ref={rootRef}
      data-directory-view="detail"
      className="min-w-0"
    >
      {pipeline ? (
        <>
          <PipelineIdentity pipeline={pipeline} managed />
          <PipelineDetail
            pipeline={pipeline}
            activeAgentId={activeAgentId}
            onAgentSelect={onAgentSelect}
            managed
          />
        </>
      ) : (
        <AllSystemsIndex onSelect={onSelect} />
      )}
    </div>
  );
}

/**
 * Every system at once: the state the section opens in, and what the core node
 * selects. Compact on purpose — a name, what it is, what it is made of, and
 * whether it runs today. Clicking a row is the same selection the map makes.
 */
export function AllSystemsIndex({ onSelect }: { onSelect?: (id: string) => void }) {
  return (
    <div>
      <div
        data-map-reveal
        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
      >
        <Caption>All systems</Caption>
        <p
          className="font-mono text-[10px] uppercase tabular-nums"
          style={{ letterSpacing: "0.18em", color: "var(--dir-faint)" }}
        >
          {pad(DIRECTORY_STATS.departments)} systems · {pad(DIRECTORY_STATS.live)} active ·{" "}
          {DIRECTORY_STATS.agents} agents
        </p>
      </div>

      <ul className="mt-6">
        {PIPELINES.map((system, i) => (
          <li
            key={system.id}
            data-map-reveal
            className="border-t last:border-b"
            style={{ borderColor: "var(--dir-line)" }}
          >
            <button
              type="button"
              onClick={() => onSelect?.(system.id)}
              className="group relative w-full py-4 pl-4 pr-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--dir-ink)]"
            >
              {/* The rail that lights under the row you are pointing at, one
                  hairline wide, so a row is visibly the same thing as a limb
                  on the map. It was the branch's own hue; the map is drawn in
                  ink now and hue means "this is the one you are reading", so
                  the accent is what a row lights in. Opacity comes from
                  classes: an inline opacity outranks :hover and the rail would
                  never light. */}
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-0 top-3 w-px opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70"
                style={{
                  background: "var(--dir-live)",
                  transition: `opacity ${MS.micro}ms ${CSS_EASE.out}`,
                }}
              />

              <span className="flex items-baseline gap-x-4">
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: "var(--dir-faint)" }}
                >
                  {pad(i + 1)}
                </span>
                <span
                  className="font-display text-[17px] font-semibold group-hover:text-[var(--dir-ink)]"
                  style={{
                    letterSpacing: "-0.02em",
                    color: "var(--dir-dim)",
                    transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                  }}
                >
                  {system.name}
                </span>
                <StatusTag status={system.status} className="ml-auto shrink-0" />
              </span>

              <span className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pl-7">
                <span className="text-[12px]" style={{ color: "var(--dir-faint)" }}>
                  {system.tagline}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tabular-nums"
                  style={{ letterSpacing: "0.18em", color: "var(--dir-faint)" }}
                >
                  {pad(system.steps.length)} steps · {pad(system.agents.length)} agents
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PipelineIdentity({
  pipeline,
  managed = false,
}: { pipeline: Pipeline | null } & Managed) {
  const rootRef = useArrival(pipeline ? pipeline.id : "none", !managed);
  if (!pipeline) return null;

  return (
    <div key={pipeline.id} ref={rootRef}>
      <p
        data-map-reveal
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        {/* The eyebrow names the Ziiro pipeline that runs this department, and
            it is the header of the one system you have narrowed to, so it is
            where the accent belongs. It was the system's own hue, which on
            paper ran as low as 2.4:1 for the warm end of the seven. */}
        <span
          className="font-mono text-[10px] font-bold uppercase"
          style={{ letterSpacing: "0.26em", color: "var(--dir-live)" }}
        >
          {pipeline.category}
        </span>
        <StatusTag status={pipeline.status} />
      </p>

      <div data-map-reveal>
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
      </div>

      <p
        data-map-reveal
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
  activeAgentId = null,
  onAgentSelect,
  managed = false,
}: {
  pipeline: Pipeline | null;
  activeAgentId?: string | null;
  onAgentSelect?: (agentId: string | null) => void;
} & Managed) {
  const shouldReduce = useReducedMotion();
  const rootRef = useArrival(pipeline ? pipeline.id : "none", !managed);
  if (!pipeline) return null;

  // Every figure on this panel, counted. Nothing here is typed by hand, so a
  // sixth step or a fourth agent in pipelines.ts changes the panel by itself.
  const counts = [
    { label: "Steps", value: pipeline.steps.length },
    { label: "Automated", value: pipeline.steps.filter((s) => s.automated).length },
    { label: "Agents", value: pipeline.agents.length },
    {
      label: "Capabilities",
      value: pipeline.agents.reduce((n, a) => n + a.capabilities.length, 0),
    },
    { label: "Integrations", value: pipeline.integrations.length },
    { label: "Outputs", value: pipeline.outputs.length },
  ];

  return (
    <div key={pipeline.id} ref={rootRef}>
      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
        {counts.map((c) => (
          <div
            key={c.label}
            data-map-reveal
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

      <Row label="Trigger">{pipeline.trigger}</Row>

      <Row label="Connected to">
        <Series items={pipeline.integrations} />
      </Row>

      <div data-map-reveal className="mt-10">
        <Caption>Agents</Caption>
      </div>

      <ul className="mt-4">
        {pipeline.agents.map((agent, i) => {
          const open = activeAgentId === agent.id;
          const next = pipeline.agents[i + 1];

          return (
            <li
              key={agent.id}
              data-map-reveal
              className="border-t last:border-b"
              style={{ borderColor: "var(--dir-line)" }}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => onAgentSelect?.(open ? null : agent.id)}
                className="group relative flex w-full items-baseline gap-4 py-3.5 pl-4 pr-1 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--dir-ink)]"
              >
                <span
                  aria-hidden="true"
                  className={`absolute bottom-2 left-0 top-2 w-px ${
                    open
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60"
                  }`}
                  style={{
                    background: "var(--dir-live)",
                    transition: `opacity ${MS.micro}ms ${CSS_EASE.out}`,
                  }}
                />
                <span
                  className="font-mono text-[10px] tabular-nums"
                  style={{
                    color: open ? "var(--dir-live)" : "var(--dir-faint)",
                    transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                  }}
                >
                  {pad(i + 1)}
                </span>
                <span
                  className={`text-[15px] group-hover:text-[var(--dir-ink)] ${
                    open ? "text-[var(--dir-ink)]" : "text-[var(--dir-dim)]"
                  }`}
                  style={{ transition: `color ${MS.micro}ms ${CSS_EASE.out}` }}
                >
                  {agent.name}
                </span>
                {/* Not aria-hidden: unlike the "+" it replaced, this is data —
                    how many named jobs the agent does, counted off its
                    capabilities, which are also its nodes on the map. */}
                <span
                  className="ml-auto shrink-0 font-mono text-[10px] uppercase tabular-nums"
                  style={{
                    letterSpacing: "0.2em",
                    color: open ? "var(--dir-live)" : "var(--dir-faint)",
                    transition: `color ${MS.micro}ms ${CSS_EASE.out}`,
                  }}
                >
                  {open ? "Close" : `${pad(agent.capabilities.length)} jobs`}
                </span>
              </button>

              <AgentDetail
                open={open}
                agent={agent}
                nextName={next ? next.name : pipeline.outputs[0]}
                isLast={!next}
                shouldReduce={!!shouldReduce}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * An agent's chain, opened in place. The height animates through the
 * grid-template-rows 0fr→1fr technique, so nothing is measured in JS; where a
 * browser doesn't support it the detail simply appears.
 */
function AgentDetail({
  open,
  agent,
  nextName,
  isLast,
  shouldReduce,
}: {
  open: boolean;
  agent: Pipeline["agents"][number];
  nextName: string;
  isLast: boolean;
  /** The row's height is the one thing here that genuinely travels, so it is
   *  also the one thing a reduced-motion preference removes: the detail still
   *  opens, it just arrives already open. */
  shouldReduce: boolean;
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateRows: open ? "1fr" : "0fr",
        transition: shouldReduce
          ? "none"
          : `grid-template-rows ${MS.swap}ms ${CSS_EASE.outExpo}`,
      }}
    >
      <div className="overflow-hidden">
        {/* Indented to the agent's name: the button's pl-4, its mono number and
            the gap between them. */}
        <div className="pb-8 pl-11 pr-1 pt-1">
          <p
            className="max-w-[46ch] text-[13px] leading-relaxed"
            style={{ color: "var(--dir-dim)" }}
          >
            {agent.role}
          </p>

          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="Input">{agent.input}</Field>
            <Field label="Does">
              <Series items={agent.capabilities} />
            </Field>
            <Field label="Output">{agent.output}</Field>
            <Field label={isLast ? "Leaves as" : "Hands to"}>{nextName}</Field>
          </dl>

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
  );
}

/** A labelled line under its own hairline, and the nearest this panel comes to
 *  a box: one rule, one caption, one value. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      data-map-reveal
      className="mt-6 border-t pt-5"
      style={{ borderColor: "var(--dir-line)" }}
    >
      <Caption>{label}</Caption>
      <p
        className="mt-2 max-w-[52ch] text-[13px] leading-relaxed"
        style={{ color: "var(--dir-dim)" }}
      >
        {children}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt
        className="font-mono text-[9px] uppercase"
        style={{ letterSpacing: "0.24em", color: "var(--dir-faint)" }}
      >
        {label}
      </dt>
      <dd
        className="mt-1.5 max-w-[42ch] text-[13px] leading-snug"
        style={{ color: "var(--dir-ink)" }}
      >
        {children}
      </dd>
    </div>
  );
}

/** Values on one line, separated by a middot rather than by chrome. */
export function Series({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <span key={item}>
          {i > 0 && (
            <span aria-hidden="true" style={{ color: "var(--dir-faint)" }}>
              {"  ·  "}
            </span>
          )}
          {item}
        </span>
      ))}
    </>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-mono text-[9px] uppercase"
      style={{ letterSpacing: "0.26em", color: "var(--dir-faint)" }}
    >
      {children}
    </p>
  );
}

/** Live or not, in the one hue the field reserves for liveness. */
export function StatusTag({
  status,
  className = "",
}: {
  status: PipelineStatus;
  className?: string;
}) {
  const live = status === "active";

  return (
    <span
      className={`flex items-center gap-2 font-mono text-[10px] uppercase ${className}`}
      style={{ letterSpacing: "0.22em", color: "var(--dir-dim)" }}
    >
      <span
        aria-hidden="true"
        className={`block h-1.5 w-1.5 rounded-full ${live ? "directory-pulse" : ""}`}
        style={
          live
            ? { background: "var(--dir-live)" }
            : { border: "1px solid var(--dir-line-strong)" }
        }
      />
      {live ? "Active" : "In build"}
    </span>
  );
}
