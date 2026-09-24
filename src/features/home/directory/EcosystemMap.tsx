import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createTimeline, stagger } from "animejs";
import { useReducedMotion } from "framer-motion";

import type { Pipeline } from "./pipelines";
import { buildLayout, CENTRE, VIEW, type MapNode } from "./layout";

/**
 * The ecosystem map: the section's fixed anchor.
 *
 * Seven systems around a shared core, each grown as a real tree: agents, then
 * what each agent can do and which steps it runs, then that step's input and
 * output. Branches end at different depths because the data does, and that
 * unevenness is what stops it looking like a diagram of itself. Every dot is a
 * string that also appears in the right column; none of it is filler, and no
 * number here is invented: counts are read off the pipeline objects.
 *
 * Under the trees, every node in the fourth rank also puts down a root into the
 * core. Those roots are what make the centre dense: the whole inventory
 * converging on one point, drawn, rather than a particle effect. The bundle is
 * split into a far and a near half so the core sits inside the tangle, and the
 * halves yaw six tenths of a degree against each other. That parallax is the
 * whole 3D cue and it costs two composited transforms.
 *
 * ── What this map is made of ──────────────────────────────────────────────
 * Hairlines and type, in the section's monochrome tokens, with one live hue
 * (--dir-live) spent only on what is selected. No gradient fills, no blurred
 * halos, no per-system rainbow: a whole branch in its own colour reads as one
 * big coloured object rather than as a structure, and seven of them read as
 * seven brands. Hue here means "this is the one you are looking at".
 *
 * Two rules keep it sharp at any column width:
 *   1. Every stroke is a non-scaling hairline, so a 1px line is 1px on screen
 *      whatever the viewBox is scaled to, on any devicePixelRatio.
 *   2. Type and hit targets are authored in real pixels and converted into
 *      viewBox units from the measured width, so labels stay legible and
 *      targets stay thumb-sized when the column narrows.
 *
 * Selection lives above this component. Clicking a hub selects that system,
 * clicking the core selects "all", and clicking an agent opens it in the right
 * column. Switching system remounts the newly selected edges, which replays
 * their draw-on, so the tree visibly grows on every switch without a timer.
 */

/** A system id, or every system at once. */
export type Selection = string | "all";

export const ALL = "all";

interface EcosystemMapProps {
  pipelines: Pipeline[];
  /** A system id, or "all" (the default) for the equal-weight view. */
  selectedId?: Selection;
  onSelect?: (id: Selection) => void;
  activeAgentId?: string | null;
  onAgentSelect?: (agentId: string | null) => void;
}

/* ── Tokens ───────────────────────────────────────────────────────────────
   The section's own palette, used as CSS variables so retoning the field
   retones the map. Each already carries its own alpha, so opacity is only
   ever used for state, never to fake a colour. */
const INK = "var(--dir-ink)";
const DIM = "var(--dir-dim)";
const FAINT = "var(--dir-faint)";
const LINE = "var(--dir-line)";
const LINE_STRONG = "var(--dir-line-strong)";
const LIVE = "var(--dir-live)";
const BG = "var(--dir-bg)";

/** Type and targets, in rendered pixels. Converted to viewBox units below. */
const PX = {
  /** The rim label: the system's name. */
  name: 19,
  /** Its three-word caption, drawn from the system's own step names. */
  caption: 9.5,
  /** The numeral inside a hub. */
  hub: 11,
  /** The core's name and the hover readout. */
  core: 9.5,
  readout: 10.5,
  /** Hit radius for a hub and for the core. WCAG target size with room over. */
  hubHit: 26,
  coreHit: 30,
  agentHit: 13,
} as const;

/** Below this column width the three-word captions come off: at that size they
 *  are more texture than information, and the names have to win. */
const CAPTION_MIN_WIDTH = 380;

/** What the map assumes until it has measured itself. Matches the desktop
 *  column, so the server render and the first paint agree. */
const ASSUMED_WIDTH = 560;

/**
 * viewBox units per rendered CSS pixel.
 *
 * The svg scales to its column, so everything authored in viewBox units shrinks
 * with it. Measuring the rendered width lets type and hit targets be authored
 * in pixels instead, which is the only way a 9px caption stays a 9px caption in
 * a 430px column as well as a 620px one.
 */
function useUnitsPerPixel(ref: RefObject<HTMLElement>) {
  const [width, setWidth] = useState(ASSUMED_WIDTH);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0;
      if (measured <= 0) return;
      // Snapped to 8px: a drag-resize would otherwise re-render nine hundred
      // nodes on every frame of the drag.
      setWidth((prev) => (Math.abs(prev - measured) < 8 ? prev : Math.round(measured)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return { unitsPerPx: VIEW / width, width };
}

/** How far back the map starts, in px of Z. Far enough to read as coming
 *  forward, close enough that the foreshortening never looks like a zoom.
 *  Paired with MAP_PERSPECTIVE_PX on the wrapper: changing one without the
 *  other changes how strong the effect is. */
const MAP_DEPTH_PX = -240;

/** The viewing distance the depth is measured against. Long rather than short,
 *  because a short perspective exaggerates the foreshortening into a swoop and
 *  the brief asks for restraint. */
const MAP_PERSPECTIVE_PX = 1400;

/** The map's endless CSS animations (the yaw, the orbit, the core's breathing
 *  and the selected spoke's dash) freeze while the wrapper carries
 *  `data-map-paused`. They animate SVG, which Chrome cannot composite, so left
 *  running offscreen they cost style, layout and a full-page repaint on every
 *  frame while the reader is still on the hero. `animation-play-state` resumes
 *  each one where it stopped. Scoped here so the component owns its pause. */
const PAUSE_CSS =
  "[data-map-paused] :is(.directory-yaw-front,.directory-yaw-back,.directory-orbit,.directory-core,.directory-flow){animation-play-state:paused}";

export default function EcosystemMap({
  pipelines,
  selectedId = ALL,
  onSelect,
  activeAgentId = null,
  onAgentSelect,
}: EcosystemMapProps) {
  const layout = useMemo(() => buildLayout(pipelines), [pipelines]);
  const byId = useMemo(
    () => new Map(pipelines.map((p) => [p.id, p])),
    [pipelines],
  );

  const [hovered, setHovered] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  const { unitsPerPx, width } = useUnitsPerPixel(wrapRef);

  /** px -> viewBox units. */
  const u = (px: number) => +(px * unitsPerPx).toFixed(2);
  /** State changes travel on the house curve, and instantly under reduced
   *  motion: the preference exists to remove the movement, not shorten it. */
  const ease = (properties: string, ms = 420) =>
    reduce ? undefined : `${properties} ${ms}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  const isAll = selectedId === ALL;
  const showCaptions = width >= CAPTION_MIN_WIDTH;

  // Split the root bundle once across all systems, not per system: the halves
  // have to interleave or the parallax reads as seven separate discs.
  const { back, front } = useMemo(() => {
    const all = layout.flatMap((s) => s.roots);
    return {
      back: all.filter((r) => r.z < 0.5),
      front: all.filter((r) => r.z >= 0.5),
    };
  }, [layout]);

  const hoveredNode = hovered
    ? layout
        .flatMap((s) => {
          const pipeline = byId.get(s.pipelineId)!;
          return [
            {
              ...s.node,
              // A hub's readout says what the system is and what it is made of,
              // counted off the data rather than asserted.
              label: `${pipeline.name} · ${pipeline.steps.length} steps · ${pipeline.agents.length} agents`,
            },
            ...s.agents,
            ...s.nodes,
          ] as MapNode[];
        })
        .find((node) => node.key === hovered)
    : undefined;

  // Entrance, once, when the map first comes into view: the core arrives, the
  // roots grow out of it, then the systems and their names.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tl: ReturnType<typeof createTimeline> | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();

        const q = (sel: string) => svg.querySelectorAll<SVGElement>(sel);

        /* ── ITEM 5: THE MAP NOW ARRIVES THROUGH DEPTH ──────────────────────
           It used to "slide in from the left or top-left", and that was never
           written as a slide. Every node was revealed with `scale: [0.6, 1]`,
           and an SVG element's transform-origin defaults to the VIEWBOX origin
           rather than the element's own centre: computed
           `transform-box: view-box; transform-origin: 0px 0px`. Measured, a
           node at 0.6 sat 136px left and 96px above its resting place, so
           scaling up read as travelling down and right into position. The
           diagonal drift was a side effect of the origin, not a decision.

           So the scales are gone, and with them the drift. The whole map now
           comes forward: perspective on the wrapper, the svg translating from
           negative Z to zero, which foreshortening renders as the object
           emerging toward the viewer rather than arriving from one side. The
           nodes inside simply fade, staggered, because a second moving part
           would be two animations explaining the same arrival.

           NO ROTATION, deliberately. Depth alone is the brief.

           Still one shot: the observer disconnects on first intersection and
           the timeline is cancelled on cleanup, so nothing here is per-frame
           work and nothing survives the section leaving the screen. */
        tl = createTimeline({ defaults: { ease: "out(3)" } });
        tl.add(svg, {
          opacity: [0, 1],
          translateZ: [MAP_DEPTH_PX, 0],
          duration: 1100,
        })
          .add(
            q("[data-map-centre]"),
            { opacity: [0, 1], duration: 700 },
            "-=820",
          )
          .add(
            q("[data-map-bundle]"),
            { opacity: [0, 1], duration: 900 },
            "-=640",
          )
          .add(
            q("[data-map-tree]"),
            { opacity: [0, 1], duration: 900, delay: stagger(80) },
            "-=760",
          )
          .add(
            q("[data-map-system]"),
            { opacity: [0, 1], duration: 700, delay: stagger(70) },
            "-=760",
          )
          .add(
            q("[data-map-label]"),
            { opacity: [0, 1], duration: 600, delay: stagger(60) },
            "-=420",
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

  // Pause the endless animations whenever nobody can see them: offscreen or in
  // a hidden tab. An attribute rather than state, so toggling it never
  // re-renders the map's nodes.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let onScreen = true;
    const sync = () => wrap.toggleAttribute("data-map-paused", !onScreen || document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(wrap);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const origin = `${CENTRE.x}px ${CENTRE.y}px`;

  /** How lit a system is: every system equally in "all", otherwise the chosen
   *  one at full strength and the rest receded rather than hidden. */
  const systemOpacity = (pipelineId: string) =>
    isAll || pipelineId === selectedId ? 1 : 0.26;

  const select = (id: Selection) => onSelect?.(id);
  /** Space and Enter both activate, and neither scrolls the page. */
  const activate = (run: () => void) => (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      run();
    }
  };

  return (
    // The perspective lives here rather than on the svg, because an element
    // cannot foreshorten its own Z: the parent supplies the viewing distance.
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{ perspective: `${MAP_PERSPECTIVE_PX}px` }}
    >
      <style dangerouslySetInnerHTML={{ __html: PAUSE_CSS }} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="h-auto w-full overflow-visible"
        // Stated, not inherited. An SVG defaults to transform-box: view-box
        // with the origin at 0 0, which is what turned a scale into a slide
        // from the top left; the map now comes forward about its own centre.
        style={{ transformBox: "border-box", transformOrigin: "center" }}
        role="group"
        aria-label={`Ziiro system map. ${pipelines.length} systems around a shared core. Select a system, or the core for all of them.`}
      >
        {/* ── Root bundle. The far half is painted before the core so the core
               sits inside the tangle rather than on top of it. ── */}
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
            style={{
              transformOrigin: origin,
              willChange: "transform",
              pointerEvents: "none",
            }}
          >
            {layerIndex === 1 && <CoreMark />}
            {strands.map((strand) => {
              const near = strand.z >= 0.5;
              // The knot stays monochrome whatever is selected. The core is the
              // one thing every system shares, and lighting one system's roots
              // inside it only ever read as a bright smudge off to one side.
              const stroke = near ? LINE_STRONG : LINE;
              return (
                <g
                  key={strand.key}
                  style={{
                    opacity: systemOpacity(strand.pipelineId) * (near ? 1 : 0.7),
                    transition: ease("opacity", 520),
                  }}
                >
                  <path
                    d={strand.d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={near ? 0.9 : 0.6}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={strand.x}
                    cy={strand.y}
                    r={strand.r}
                    fill={near ? DIM : FAINT}
                  />
                </g>
              );
            })}
          </g>
        ))}

        {/* ── The core: the "all systems" control, and the one mark that says
               something is running rather than drawn. ── */}
        <g
          data-map-node
          data-map-reveal
          data-map-centre
          role="button"
          tabIndex={0}
          aria-pressed={isAll}
          aria-label={`All systems. ${pipelines.length} systems.`}
          className="cursor-pointer"
          onClick={() => select(ALL)}
          onKeyDown={activate(() => select(ALL))}
          onMouseEnter={() => setHovered("core")}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered("core")}
          onBlur={() => setHovered(null)}
        >
          <circle
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={Math.max(34, u(PX.coreHit))}
            fill="transparent"
          />
          <circle
            className="map-focus"
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={Math.max(30, u(PX.coreHit) - 4)}
            fill="none"
            stroke={INK}
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
          />
          {/* The ring reads the selection: lit when every system is in view. */}
          <circle
            cx={CENTRE.x}
            cy={CENTRE.y}
            r={26}
            fill="none"
            stroke={isAll ? LIVE : hovered === "core" ? INK : LINE_STRONG}
            strokeWidth={isAll ? 1.5 : 1}
            vectorEffect="non-scaling-stroke"
            style={{ transition: ease("stroke, stroke-width") }}
          />
          <text
            x={CENTRE.x}
            y={CENTRE.y + 84}
            textAnchor="middle"
            className="font-mono"
            fontSize={u(PX.core)}
            letterSpacing={u(2)}
            fill={isAll || hovered === "core" ? INK : DIM}
            stroke={BG}
            strokeWidth={u(2.5)}
            paintOrder="stroke"
            style={{ transition: ease("fill") }}
          >
            SECOND BRAIN
          </text>
        </g>

        {/* ── The trees ──────────────────────────────────────────────────── */}
        {layout.map((system, index) => {
          const pipeline = byId.get(system.pipelineId)!;
          const open = !isAll && system.pipelineId === selectedId;
          /** Systems being read carry their full detail: all seven in "all",
           *  and only the selected one once a system is chosen. */
          const detail = isAll || open;
          const hub = system.node;
          const hot = hovered === hub.key;
          const nameSize = u(PX.name);

          return (
            <g key={system.pipelineId} data-map-reveal data-map-tree>
              <g
                style={{
                  opacity: systemOpacity(system.pipelineId),
                  transition: ease("opacity", 520),
                }}
              >
                {/* Core to hub. Dotted, and only the selected one travels. */}
                <line
                  aria-hidden="true"
                  x1={CENTRE.x}
                  y1={CENTRE.y}
                  x2={hub.x}
                  y2={hub.y}
                  stroke={open ? LIVE : LINE_STRONG}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="2 8"
                  className={open ? "directory-flow" : undefined}
                  style={{ pointerEvents: "none", transition: ease("stroke") }}
                />

                {/* Hub to agent: the system's skeleton, drawn whether or not
                    the system is the one being read. */}
                <g aria-hidden="true" style={{ pointerEvents: "none" }}>
                  {system.agents.map((n, i) => {
                    const dimmed =
                      open && !!activeAgentId && activeAgentId !== n.agentId;
                    return (
                      <line
                        // Remounting on select replays the draw-on, so the tree
                        // visibly grows every time the system changes.
                        key={open ? `${n.key}:e:on` : `${n.key}:e`}
                        x1={n.px}
                        y1={n.py}
                        x2={n.x}
                        y2={n.y}
                        stroke={open ? DIM : LINE_STRONG}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        pathLength={1}
                        opacity={dimmed ? 0.3 : 1}
                        className={open ? "directory-draw" : undefined}
                        style={{
                          animationDelay: open ? `${(i % 26) * 24}ms` : undefined,
                          transition: ease("opacity", 520),
                        }}
                      />
                    );
                  })}
                </g>

                {/* Everything below the agents: what each one can do, the steps
                    it runs, and a step's two ends.

                    This is the detail, and it is only drawn for systems being
                    read: all seven in the "all" view, one when one is selected.
                    A receding system keeps its hub, its spoke and its agents, so
                    it recedes to a structure rather than to a cloud of dots. */}
                <g
                  data-map-detail
                  aria-hidden={detail ? undefined : "true"}
                  style={{
                    opacity: detail ? 1 : 0,
                    pointerEvents: detail ? undefined : "none",
                    transition: ease("opacity", 520),
                  }}
                >
                  <g aria-hidden="true" style={{ pointerEvents: "none" }}>
                    {system.nodes.map((n, i) => {
                      if (n.kind === "io" && !open) return null;
                      const dimmed =
                        open && !!activeAgentId && activeAgentId !== n.agentId;
                      return (
                        <line
                          key={open ? `${n.key}:e:on` : `${n.key}:e`}
                          x1={n.px}
                          y1={n.py}
                          x2={n.x}
                          y2={n.y}
                          stroke={open ? DIM : LINE_STRONG}
                          strokeWidth={n.kind === "io" ? 0.7 : 1}
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="round"
                          pathLength={1}
                          opacity={dimmed ? 0.3 : 1}
                          className={open ? "directory-draw" : undefined}
                          style={{
                            animationDelay: open
                              ? `${(i % 26) * 24}ms`
                              : undefined,
                            transition: ease("opacity", 520),
                          }}
                        />
                      );
                    })}
                  </g>

                  {/* Two marks, and the difference carries meaning: a solid dot
                      is something the system does, a hollow ring is one end of
                      it, an input or an output. */}
                  {system.nodes.map((n) => {
                    if (n.kind === "io" && !open) return null;
                    const tip = n.kind === "io";
                    const dimmed =
                      open && !!activeAgentId && activeAgentId !== n.agentId;
                    const r = (tip ? 3.6 : open ? 5.6 : 4.8) + n.z * 1.1;
                    return (
                      <g
                        key={n.key}
                        opacity={dimmed ? 0.3 : 1}
                        onMouseEnter={() => setHovered(n.key)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          pointerEvents: open && !dimmed ? "auto" : "none",
                          transition: ease("opacity", 520),
                        }}
                      >
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r}
                          fill={tip ? BG : open ? INK : DIM}
                          stroke={tip ? FAINT : BG}
                          strokeWidth={tip ? 1 : 0.75}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Agents: the only things inside a tree you can aim at. */}
                {system.agents.map((agent) => {
                  const active = open && activeAgentId === agent.agentId;
                  const dimmed = open && !!activeAgentId && !active;
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
                              onAgentSelect?.(active ? null : agent.agentId ?? null)
                          : undefined
                      }
                      onKeyDown={
                        open
                          ? activate(() =>
                              onAgentSelect?.(active ? null : agent.agentId ?? null),
                            )
                          : undefined
                      }
                      onMouseEnter={() => setHovered(agent.key)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(agent.key)}
                      onBlur={() => setHovered(null)}
                      style={{ pointerEvents: open ? "auto" : "none" }}
                    >
                      <circle
                        cx={agent.x}
                        cy={agent.y}
                        r={Math.max(16, u(PX.agentHit))}
                        fill="transparent"
                      />
                      <circle
                        className="map-focus"
                        cx={agent.x}
                        cy={agent.y}
                        r={14}
                        fill="none"
                        stroke={INK}
                        strokeWidth={1.25}
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* The open agent wears a ring rather than a glow. */}
                      <circle
                        cx={agent.x}
                        cy={agent.y}
                        r={active ? 12 : 0}
                        fill="none"
                        stroke={LIVE}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        opacity={active ? 1 : 0}
                        style={{ transition: ease("r, opacity", 500) }}
                      />
                      <circle
                        cx={agent.x}
                        cy={agent.y}
                        r={open ? 5.4 : 4.4}
                        fill={open ? LIVE : DIM}
                        opacity={dimmed ? 0.35 : 1}
                        style={{ transition: ease("opacity, fill, r", 460) }}
                      />
                    </g>
                  );
                })}

                {/* The hub: the system's control. A hairline ring with its
                    ring-order numeral, and the name out on the rim. */}
                <g
                  data-map-node
                  data-map-reveal
                  data-map-system
                  role="button"
                  tabIndex={0}
                  aria-pressed={open}
                  aria-label={`${pipeline.name}. ${pipeline.steps.length} steps, ${pipeline.agents.length} agents.`}
                  className="cursor-pointer"
                  onClick={() => select(system.pipelineId)}
                  onKeyDown={activate(() => select(system.pipelineId))}
                  onMouseEnter={() => setHovered(hub.key)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(hub.key)}
                  onBlur={() => setHovered(null)}
                >
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r={Math.max(34, u(PX.hubHit))}
                    fill="transparent"
                  />
                  <circle
                    className="map-focus"
                    cx={hub.x}
                    cy={hub.y}
                    r={hub.r + 11}
                    fill="none"
                    stroke={INK}
                    strokeWidth={1.25}
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Hover and selection both answer with a second hairline,
                      so pointing at a hub says "this one is aimable" before
                      you click it. */}
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r={hub.r + 7}
                    fill="none"
                    stroke={open ? LIVE : INK}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                    opacity={open ? 0.55 : hot ? 0.5 : 0}
                    style={{ transition: ease("opacity") }}
                  />
                  <circle
                    cx={hub.x}
                    cy={hub.y}
                    r={hub.r}
                    fill={BG}
                    stroke={open ? LIVE : hot ? INK : LINE_STRONG}
                    strokeWidth={open ? 1.5 : 1}
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: ease("stroke, stroke-width") }}
                  />
                  <text
                    x={hub.x}
                    y={hub.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-mono"
                    fontSize={u(PX.hub)}
                    letterSpacing={u(0.5)}
                    fill={open ? LIVE : hot ? INK : DIM}
                    style={{
                      pointerEvents: "none",
                      transition: ease("fill"),
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </text>
                </g>

                <g
                  data-map-reveal
                  data-map-label
                  aria-hidden="true"
                  style={{ pointerEvents: "none" }}
                >
                  <text
                    x={clampLabel(system.label.x, pipeline.shortName, nameSize)}
                    y={system.label.y}
                    textAnchor="middle"
                    // font-display, not font-serif. These labels were set in
                    // Instrument Serif, the only live use of a face this site
                    // does not otherwise have: a decorative serif inside a
                    // Helvetica and Space Mono system, used to make one
                    // section feel different. Hierarchy here comes from size,
                    // fill weight and the halo stroke, all of which are still
                    // doing their job.
                    className="font-display"
                    fontSize={nameSize}
                    letterSpacing={u(2.4)}
                    fill={open ? INK : isAll ? DIM : FAINT}
                    stroke={BG}
                    strokeWidth={u(2.5)}
                    paintOrder="stroke"
                    style={{ transition: ease("fill") }}
                  >
                    {pipeline.shortName.toUpperCase()}
                  </text>
                  {showCaptions && (
                    <text
                      x={clampLabel(system.label.x, pipeline.shortName, nameSize)}
                      y={system.label.y + u(15)}
                      textAnchor="middle"
                      className="font-mono"
                      fontSize={u(PX.caption)}
                      letterSpacing={u(1.4)}
                      fill={open ? DIM : FAINT}
                      stroke={BG}
                      strokeWidth={u(2)}
                      paintOrder="stroke"
                      style={{ transition: ease("fill") }}
                    >
                      {pipeline.tags.join("  ·  ").toUpperCase()}
                    </text>
                  )}
                </g>
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
              stroke={FAINT}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={hoveredNode.x + hoveredNode.r + 14}
              y={hoveredNode.y - hoveredNode.r - 12}
              className="font-mono"
              fontSize={u(PX.readout)}
              letterSpacing={u(0.2)}
              fill={INK}
              stroke={BG}
              strokeWidth={u(2.5)}
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
 * rather than measured, because an SVG text measurement would cost a layout
 * pass per label per render and an estimate is plenty for a clamp.
 */
function clampLabel(x: number, label: string, fontSize: number) {
  const half = (label.length * fontSize * 0.66) / 2;
  return Math.min(Math.max(x, half + 6), VIEW - half - 6);
}

/**
 * The core mark: a hairline well the roots run into, and one live point.
 *
 * Drawn between the two halves of the bundle so the strands pass in front of
 * it as well as behind. Its hit area, focus ring and name are a separate
 * group above the trees, so a spoke can never steal the click.
 */
function CoreMark() {
  return (
    <g data-map-centre aria-hidden="true">
      <circle cx={CENTRE.x} cy={CENTRE.y} r={30} fill={BG} opacity={0.72} />
      <circle
        cx={CENTRE.x}
        cy={CENTRE.y}
        r={13}
        fill="none"
        stroke={LINE_STRONG}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="2 5"
        className="directory-orbit"
        style={{ transformOrigin: `${CENTRE.x}px ${CENTRE.y}px` }}
      />
      <circle
        cx={CENTRE.x}
        cy={CENTRE.y}
        r={4.5}
        fill={LIVE}
        className="directory-core"
        style={{ transformOrigin: `${CENTRE.x}px ${CENTRE.y}px` }}
      />
    </g>
  );
}
