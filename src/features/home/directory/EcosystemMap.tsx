import { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, stagger } from "animejs";
import { Brain, ChartLine, Compass, Film, PenLine, Ruler, Search } from "lucide-react";
import type { Pipeline } from "./pipelines";
import { buildLayout, CENTRE, VIEW, type MapNode } from "./layout";

/**
 * The ecosystem map.
 *
 * Five systems around a shared core, each grown as a real tree: agents, then
 * what each agent can do and which steps it runs, then that step's input and
 * output. Branches end at different depths because the data does — a
 * capability stops, a step carries on — and that unevenness is what stops it
 * looking like a diagram of itself. Every dot is a string that also appears in
 * the panel or the workflow; none of it is filler.
 *
 * Under the trees, every node in the fourth rank also puts down a root into
 * the core. Those roots are what make the centre dense: the whole inventory
 * converging on one point, drawn, rather than a particle effect.
 *
 * Depth is a hashed value per node. The root bundle is split into a far and a
 * near half drawn either side of the core — so the core sits inside the tangle
 * rather than on top of it — and the two halves yaw six tenths of a degree
 * against each other. That parallax is the whole 3D cue, and it costs two
 * composited transforms.
 *
 * Selection is bidirectional and lives above this component: clicking an agent
 * here opens it in the panel, and opening it there lights it here. Switching
 * system remounts the newly selected edges, which replays their draw-on, so
 * the tree visibly grows on every switch without a timer.
 */

interface EcosystemMapProps {
  pipelines: Pipeline[];
  selectedId: string;
  onSelect: (id: string) => void;
  activeAgentId: string | null;
  onAgentSelect: (agentId: string | null) => void;
}

// This is a bare triple, not an rgba() literal, so keep it in step with
// --dir-ink by hand.
const INK = "242,238,233";

/** The tree is drawn in bone, not in colour. Hue is spent only on the hub ring
 *  and on the agent dots hanging off it — a whole branch in its accent reads
 *  as one big coloured object rather than as a structure. */
const BONE = "#EDE8E0";

const ICONS = {
  search: Search,
  pen: PenLine,
  film: Film,
  brain: Brain,
  ruler: Ruler,
  compass: Compass,
  chart: ChartLine,
};

export default function EcosystemMap({
  pipelines,
  selectedId,
  onSelect,
  activeAgentId,
  onAgentSelect,
}: EcosystemMapProps) {
  const layout = useMemo(() => buildLayout(pipelines), [pipelines]);
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<SVGSVGElement>(null);

  const byId = useMemo(
    () => new Map(pipelines.map((p) => [p.id, p])),
    [pipelines],
  );

  // Split the root bundle once across all systems, not per system: the halves
  // have to interleave or the parallax reads as five separate discs.
  const { back, front } = useMemo(() => {
    const all = layout.flatMap((s) => s.roots);
    return {
      back: all.filter((r) => r.z < 0.5),
      front: all.filter((r) => r.z >= 0.5),
    };
  }, [layout]);

  const hoveredNode = hovered
    ? layout
        .flatMap((s) => [
          {
            ...s.node,
            // The bare step count in a system node needs to say what it counts
            // the first time someone points at it.
            label: `${byId.get(s.pipelineId)!.name} · ${
              byId.get(s.pipelineId)!.steps.length
            } steps`,
          },
          ...s.agents,
          ...s.nodes,
        ])
        .find((node) => node.key === hovered)
    : undefined;

  // Entrance, once, when the map first comes into view: the core arrives, the
  // roots grow out of it, then the systems and their names.
  useEffect(() => {
    const svg = rootRef.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tl: ReturnType<typeof createTimeline> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();

        const q = (sel: string) => svg.querySelectorAll<SVGElement>(sel);
        tl = createTimeline({ defaults: { ease: "out(3)" } });
        tl.add(q("[data-map-centre]"), {
          opacity: [0, 1],
          scale: [0.6, 1],
          duration: 900,
        })
          .add(
            q("[data-map-bundle]"),
            { opacity: [0, 1], scale: [0.8, 1], duration: 1400 },
            "-=560",
          )
          .add(
            q("[data-map-tree]"),
            { opacity: [0, 1], duration: 1100, delay: stagger(80) },
            "-=1000",
          )
          .add(
            q("[data-map-system]"),
            {
              opacity: [0, 1],
              scale: [0.6, 1],
              duration: 700,
              delay: stagger(70),
            },
            "-=1000",
          )
          .add(
            q("[data-map-label]"),
            { opacity: [0, 1], duration: 600, delay: stagger(60) },
            "-=520",
          );
      },
      { rootMargin: "-12% 0px" },
    );

    observer.observe(svg);
    return () => {
      observer.disconnect();
      tl?.cancel();
    };
  }, []);

  const origin = `${CENTRE.x}px ${CENTRE.y}px`;

  /** How lit anything belonging to a system should be right now. */
  const weight = (pipelineId: string, agentId?: string) => {
    const open = pipelineId === selectedId;
    if (!open) return { open, muted: false, opacity: 0.5 };
    const muted = !!activeAgentId && activeAgentId !== agentId;
    return { open, muted, opacity: muted ? 0.28 : 1 };
  };

  return (
    <div className="relative w-full">
      <svg
        ref={rootRef}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="h-auto w-full overflow-visible"
        role="group"
        aria-label="Ziiro system ecosystem map"
      >
        {/* Halo, squashed to match the tilt of the disc. */}
        <ellipse
          data-map-reveal
          data-map-centre
          aria-hidden="true"
          cx={CENTRE.x}
          cy={CENTRE.y}
          rx={168}
          ry={142}
          fill="rgba(255,138,61,0.12)"
          style={{ filter: "blur(28px)" }}
        />

        {/* ── Root bundle, far half. Painted before the core so the core sits
               inside the tangle rather than on top of it. ── */}
        {(
          [
            ["back", back, "directory-yaw-back"],
            ["front", front, "directory-yaw-front"],
          ] as const
        ).map(([half, strands, cls], layerIndex) => (
          <g
            key={half}
            data-map-reveal
            data-map-bundle
            aria-hidden="true"
            className={cls}
            style={{ transformOrigin: origin, willChange: "transform" }}
          >
            {/* The core knot is drawn between the two halves. */}
            {layerIndex === 1 && <Core />}
            {strands.map((strand) => {
              const pipeline = byId.get(strand.pipelineId)!;
              const { open, muted } = weight(
                strand.pipelineId,
                strand.agentId,
              );
              const near = strand.z >= 0.5;
              const opacity = open
                ? muted
                  ? 0.24
                  : near
                    ? 0.95
                    : 0.55
                : near
                  ? 0.62
                  : 0.36;
              return (
                <g
                  key={strand.key}
                  style={{ opacity, transition: "opacity 520ms ease" }}
                >
                  <path
                    d={strand.d}
                    fill="none"
                    stroke={pipeline.accent}
                    strokeWidth={near ? 0.6 : 0.35}
                    strokeLinecap="round"
                    opacity={0.45}
                  />
                  <circle
                    cx={strand.x}
                    cy={strand.y}
                    r={strand.r}
                    fill={pipeline.accent}
                  />
                </g>
              );
            })}
          </g>
        ))}

        {/* The core's name, above the bundle and haloed so it stays legible
            wherever the roots happen to cross it. */}
        <g data-map-reveal data-map-centre aria-hidden="true">
          <text
            x={CENTRE.x}
            y={CENTRE.y + 84}
            textAnchor="middle"
            className="font-mono"
            fontSize={10}
            letterSpacing="2.6"
            fill={`rgba(${INK},0.82)`}
            stroke="#000000"
            strokeWidth={4}
            paintOrder="stroke"
          >
            SECOND BRAIN
          </text>
        </g>

        {/* ── The trees ──────────────────────────────────────────────────── */}
        {layout.map((system) => {
          const pipeline = byId.get(system.pipelineId)!;
          const open = system.pipelineId === selectedId;

          return (
            <g key={system.pipelineId} data-map-reveal data-map-tree>
              {/* Core → system. Dotted, and only the live one travels. */}
              <line
                aria-hidden="true"
                x1={CENTRE.x}
                y1={CENTRE.y}
                x2={system.node.x}
                y2={system.node.y}
                stroke={open ? pipeline.accent : `rgba(${INK},0.16)`}
                strokeWidth={1}
                strokeDasharray="2 8"
                opacity={open ? 0.5 : 0.3}
                className={open ? "directory-flow" : undefined}
                style={{ transition: "stroke 500ms ease, opacity 500ms ease" }}
              />

              {/* Edges first, so nodes sit on top of their own connections. */}
              <g aria-hidden="true">
                {[...system.agents, ...system.nodes].map((n, i) => {
                  if (n.kind === "io" && !open) return null;
                  const { opacity } = weight(n.pipelineId, n.agentId);
                  return (
                    <line
                      // Remounting on select replays the draw-on, so the tree
                      // visibly grows every time the system changes.
                      key={open ? `${n.key}:e:on` : `${n.key}:e`}
                      x1={n.px}
                      y1={n.py}
                      x2={n.x}
                      y2={n.y}
                      stroke={`rgba(${INK},${open ? 0.5 : 0.42})`}
                      strokeWidth={n.kind === "io" ? 0.6 : 0.85}
                      strokeLinecap="round"
                      pathLength={1}
                      opacity={opacity * (open ? 0.9 : 0.62)}
                      className={open ? "directory-draw" : undefined}
                      style={
                        open
                          ? {
                              animationDelay: `${(i % 26) * 24}ms`,
                              transition: "opacity 520ms ease",
                            }
                          : { transition: "opacity 520ms ease" }
                      }
                    />
                  );
                })}
              </g>

              {/* Leaves and steps. A mix of marks: hollow rings for what an
                  agent can do, solid dots for the steps it runs, fine points
                  for a step's two ends. */}
              {system.nodes.map((n) => {
                if (n.kind === "io" && !open) return null;
                const { open: on, muted, opacity } = weight(
                  n.pipelineId,
                  n.agentId,
                );
                // Two marks, and the difference carries meaning: a solid bone
                // circle is something the system does, a hollow ring is one
                // end of it — an input or an output.
                const tip = n.kind === "io";
                const r = (tip ? 4 : on ? 6.2 : 5.2) + n.z * (on ? 1 : 0.8);
                return (
                  <g
                    key={n.key}
                    opacity={opacity * (tip ? 0.72 : on ? 1 : 0.82)}
                    onMouseEnter={() => setHovered(n.key)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      pointerEvents: on && !muted ? "auto" : "none",
                      transition: "opacity 520ms ease",
                    }}
                  >
                    {!tip && on && (
                      <circle cx={n.x} cy={n.y} r={r * 2.1} fill={BONE} opacity={0.07} />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r}
                      fill={tip ? "#000000" : BONE}
                      stroke={tip ? `rgba(${INK},0.45)` : "rgba(0,0,0,0.8)"}
                      strokeWidth={tip ? 1.1 : 0.7}
                    />
                    {/* The small tick inside a hollow ring, as in the
                        reference — it marks an end of a step rather than a
                        thing the step does. */}
                    {tip && (
                      <line
                        x1={n.x}
                        y1={n.y}
                        x2={n.x}
                        y2={n.y - r * 0.55}
                        stroke={`rgba(${INK},0.45)`}
                        strokeWidth={0.9}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              })}

              {/* Agents: the only things inside a tree you can aim at. */}
              {system.agents.map((agent) => {
                const active = open && activeAgentId === agent.agentId;
                const dimmed = open && activeAgentId && !active;
                return (
                  <g
                    key={agent.key}
                    data-map-node={open ? "" : undefined}
                    role={open ? "button" : undefined}
                    tabIndex={open ? 0 : undefined}
                    aria-pressed={open ? active : undefined}
                    aria-label={
                      open ? `${agent.label}, in ${pipeline.name}` : undefined
                    }
                    className={open ? "cursor-pointer" : undefined}
                    onClick={
                      open
                        ? () =>
                            onAgentSelect(active ? null : agent.agentId ?? null)
                        : undefined
                    }
                    onKeyDown={
                      open
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onAgentSelect(
                                active ? null : agent.agentId ?? null,
                              );
                            }
                          }
                        : undefined
                    }
                    onMouseEnter={() => setHovered(agent.key)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <circle
                      cx={agent.x}
                      cy={agent.y}
                      r={18}
                      fill="transparent"
                      style={{ pointerEvents: open ? "auto" : "none" }}
                    />
                    <circle
                      className="map-focus"
                      cx={agent.x}
                      cy={agent.y}
                      r={15}
                      fill="none"
                      stroke="#f2eee9"
                      strokeWidth={1.2}
                    />
                    <circle
                      cx={agent.x}
                      cy={agent.y}
                      r={active ? 14 : 0}
                      fill="none"
                      stroke={pipeline.accent}
                      strokeWidth={1}
                      opacity={active ? 0.6 : 0}
                      style={{
                        transition:
                          "r 500ms cubic-bezier(0.22,1,0.36,1), opacity 400ms ease",
                      }}
                    />
                    <circle
                      cx={agent.x}
                      cy={agent.y}
                      r={open ? 5 : 4.2}
                      fill={pipeline.accent}
                      stroke="none"
                      opacity={open ? (dimmed ? 0.4 : 1) : 0.8}
                      style={{
                        transition:
                          "opacity 460ms ease, fill 500ms ease, r 500ms cubic-bezier(0.22,1,0.36,1)",
                      }}
                    />
                  </g>
                );
              })}

              <g
                data-map-node
                data-map-reveal
                data-map-system
                role="button"
                tabIndex={0}
                aria-pressed={open}
                aria-label={`${pipeline.name}. ${pipeline.steps.length} steps, ${pipeline.agents.length} agents.`}
                className="cursor-pointer"
                onClick={() => onSelect(system.pipelineId)}
                onMouseEnter={() => setHovered(system.node.key)}
                onMouseLeave={() => setHovered(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(system.pipelineId);
                  }
                }}
              >
                <circle
                  cx={system.node.x}
                  cy={system.node.y}
                  r={40}
                  fill="transparent"
                />
                <circle
                  className="map-focus"
                  cx={system.node.x}
                  cy={system.node.y}
                  r={34}
                  fill="none"
                  stroke="#f2eee9"
                  strokeWidth={1.4}
                />
                <circle
                  cx={system.node.x}
                  cy={system.node.y}
                  r={open ? 38 : 27}
                  fill={pipeline.accent}
                  opacity={open ? 0.11 : 0}
                  style={{
                    transition:
                      "opacity 500ms ease, r 600ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
                <circle
                  cx={system.node.x}
                  cy={system.node.y}
                  r={system.node.r}
                  fill="#0a0810"
                  stroke={
                    open || hovered === system.node.key
                      ? pipeline.accent
                      : `rgba(${INK},0.34)`
                  }
                  strokeWidth={open ? 1.5 : 1}
                  style={{
                    transition: "stroke 400ms ease, stroke-width 400ms ease",
                  }}
                />
                {(() => {
                  // A glyph rather than a number: the hub is the one mark on
                  // the map that has to be identifiable at a glance, and a
                  // two-digit count never was.
                  const Glyph = ICONS[pipeline.icon];
                  return (
                    <Glyph
                      x={system.node.x - 11}
                      y={system.node.y - 11}
                      width={22}
                      height={22}
                      fill="none"
                      strokeWidth={1.4}
                      stroke={open ? pipeline.accent : `rgba(${INK},0.55)`}
                      style={{ transition: "stroke 400ms ease" }}
                    />
                  );
                })()}
              </g>

              <g data-map-reveal data-map-label aria-hidden="true">
                <text
                  x={labelX(system.label.x, pipeline.shortName, 34)}
                  y={system.label.y}
                  textAnchor="middle"
                  className="font-serif"
                  fontSize={34}
                  letterSpacing="4.5"
                  fill={open ? "#F6F2EC" : `rgba(${INK},0.68)`}
                  stroke="#000000"
                  strokeWidth={5}
                  paintOrder="stroke"
                  style={{ transition: "fill 400ms ease" }}
                >
                  {pipeline.shortName.toUpperCase()}
                </text>
                <text
                  x={labelX(system.label.x, pipeline.shortName, 34)}
                  y={system.label.y + 22}
                  textAnchor="middle"
                  className="font-sans"
                  fontSize={11}
                  letterSpacing="0.4"
                  fill={`rgba(${INK},${open ? 0.5 : 0.32})`}
                  stroke="#000000"
                  strokeWidth={3.5}
                  paintOrder="stroke"
                  style={{ transition: "fill 400ms ease" }}
                >
                  {pipeline.tags.join("  ·  ")}
                </text>
              </g>
            </g>
          );
        })}

        {/* ── Hover readout, drawn last so it sits over everything ───────── */}
        {hoveredNode && (
          <g aria-hidden="true" style={{ pointerEvents: "none" }}>
            <line
              x1={hoveredNode.x + hoveredNode.r * 0.7}
              y1={hoveredNode.y - hoveredNode.r * 0.7}
              x2={hoveredNode.x + hoveredNode.r + 10}
              y2={hoveredNode.y - hoveredNode.r - 10}
              stroke={`rgba(${INK},0.34)`}
              strokeWidth={0.8}
            />
            <text
              x={hoveredNode.x + hoveredNode.r + 14}
              y={hoveredNode.y - hoveredNode.r - 12}
              className="font-mono"
              fontSize={11}
              letterSpacing="0.4"
              fill="#f2eee9"
              stroke="#000000"
              strokeWidth={3.5}
              paintOrder="stroke"
            >
              {hoveredNode.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Keep a rim label inside the viewBox. Width is estimated from the string
 * rather than measured — an SVG text measurement would cost a layout pass per
 * label per render, and an estimate is plenty for a clamp.
 */
function labelX(x: number, label: string, fontSize: number) {
  const half = (label.length * fontSize * 0.66) / 2;
  return Math.min(Math.max(x, half + 6), VIEW - half - 6);
}

/** The intelligence layer: a dark well the roots run into, and a hot point. */
function Core() {
  return (
    <g data-map-centre aria-hidden="true">
      <circle cx={CENTRE.x} cy={CENTRE.y} r={30} fill="rgba(0,0,0,0.6)" />
      <circle
        cx={CENTRE.x}
        cy={CENTRE.y}
        r={20}
        fill="rgba(255,138,61,0.26)"
        style={{ filter: "blur(8px)" }}
      />
      <circle
        cx={CENTRE.x}
        cy={CENTRE.y}
        r={13}
        fill="none"
        stroke="rgba(140,106,255,0.42)"
        strokeWidth={1}
        strokeDasharray="2 5"
        className="directory-orbit"
        style={{ transformOrigin: `${CENTRE.x}px ${CENTRE.y}px` }}
      />
      <circle
        cx={CENTRE.x}
        cy={CENTRE.y}
        r={5}
        fill="#FFFFFF"
        className="directory-core"
        style={{ transformOrigin: `${CENTRE.x}px ${CENTRE.y}px` }}
      />
    </g>
  );
}
