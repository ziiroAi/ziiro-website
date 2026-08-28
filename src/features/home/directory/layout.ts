import type { Pipeline } from "./pipelines";

/**
 * The ecosystem map's geometry: a real tree per system, and the root bundle
 * they all share.
 *
 * Each system grows a branching tree several levels deep, and every level is
 * something in the data:
 *
 *   system      the pipeline
 *   agent       the agents inside it
 *   capability  what that agent does          (leaf)
 *   step        the workflow steps it owns
 *   io          that step's input and output  (leaf)
 *
 * So branches are uneven by construction — a capability stops at level four,
 * a step carries on to level five — which is what stops the picture looking
 * like a diagram of itself. Nothing here is filler: every dot is a string that
 * also appears in the panel or the workflow.
 *
 * Underneath, every level-four node also puts down a short root into the
 * shared core. Around a hundred and thirty of those converge on one point,
 * which is what makes the centre dense: it is the whole inventory feeding back
 * into one place, drawn, rather than a particle effect.
 *
 * Depth is a hashed value per node, used to split the root bundle into a near
 * and a far half that are drawn either side of the core and yaw against each
 * other. A slight vertical squash on every polar coordinate tilts the disc.
 *
 * Pure geometry, no React. All jitter is hashed from ids rather than drawn
 * from Math.random, so server and client renders agree.
 */

export const VIEW = 1000;
const CX = VIEW / 2;
const CY = VIEW / 2;

const R_SYSTEM = 158;
const R_AGENT = 196;
const R_LABEL = 452;

/** One step along a chain, and the stub out to a step's input or output. */
const SEG = 36;
const IO_SEG = 22;
/** Children per limb. Long limbs are the point: the reference's trees are
 *  chains of four or five stepping outward, not clusters hanging off a hub. */
const CHAIN_LEN = 4;

/** Tilts the disc. Applied to every polar coordinate. */
const Y_SQUASH = 0.94;

/** Fraction of a system's slice its tree may occupy. */
const SPREAD = 0.38;

/** Root bundle: how far off its own heading a root leaves the core, and how
 *  far out the roots reach. The splay is the difference between a bundle of
 *  dendrites and a firework. */
const ROOT_SWIRL = 38;
const ROOT_INNER = 9;
const ROOT_OUTER = 60;

/** FNV-1a, normalised to 0..1. Deterministic across server and client. */
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** −1..1 */
const jitter = (id: string) => hash01(id) * 2 - 1;

function polar(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    x: CX + Math.cos(a) * radius,
    y: CY + Math.sin(a) * radius * Y_SQUASH,
  };
}

const fmt = (p: { x: number; y: number }) =>
  `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

export type NodeKind = "system" | "agent" | "capability" | "step" | "io";

export interface MapNode {
  key: string;
  kind: NodeKind;
  pipelineId: string;
  /** Set on agents and on everything descended from one. */
  agentId?: string;
  label: string;
  x: number;
  y: number;
  r: number;
  /** Its parent's position: the other end of its edge. */
  px: number;
  py: number;
  /** 0 = furthest back, 1 = nearest the viewer. */
  z: number;
}

export interface RootStrand {
  key: string;
  pipelineId: string;
  agentId?: string;
  d: string;
  /** Where the root ends, and how big its tip reads. */
  x: number;
  y: number;
  r: number;
  z: number;
}

export interface SystemLayout {
  pipelineId: string;
  angle: number;
  node: MapNode;
  label: { x: number; y: number };
  /** Which side of the map this branch is on, so labels anchor outward. */
  anchor: "start" | "middle" | "end";
  /** Clickable agent nodes, kept separate because they carry interaction. */
  agents: MapNode[];
  /** Everything below the agents: capabilities, steps, and step inputs and
   *  outputs, flattened — each already knows where its parent sits. */
  nodes: MapNode[];
  roots: RootStrand[];
}

/** Fan `count` children across ±half degrees, centred on `mid`. */
function fan(index: number, count: number, mid: number, half: number) {
  if (count <= 1) return mid;
  return mid + (index / (count - 1) - 0.5) * 2 * half;
}

export function buildLayout(pipelines: Pipeline[]): SystemLayout[] {
  const n = pipelines.length;
  const slice = 360 / n;
  const arcHalf = slice * SPREAD;

  return pipelines.map((pipeline, i) => {
    // Start at twelve o'clock and run clockwise, so the first pipeline in the
    // data is the one at the top.
    const angle = -90 + i * slice;
    const sys = polar(angle, R_SYSTEM);
    const cos = Math.cos((angle * Math.PI) / 180);
    // Alternating, so neighbouring systems' roots twist against each other.
    const swirlDir = i % 2 === 0 ? 1 : -1;

    const node: MapNode = {
      key: pipeline.id,
      kind: "system",
      pipelineId: pipeline.id,
      label: pipeline.shortName,
      x: sys.x,
      y: sys.y,
      r: 23,
      px: CX,
      py: CY,
      z: 1,
    };

    const nodes: MapNode[] = [];
    const roots: RootStrand[] = [];

    /** A short curved root from the core, in this system's direction. */
    const root = (seed: string, agentId: string | undefined, z: number) => {
      const w = jitter(seed + "rw");
      const h = hash01(seed + "rh");
      const tip = polar(
        angle + w * (arcHalf * 2.0),
        ROOT_INNER + h * (ROOT_OUTER - ROOT_INNER),
      );
      // Leaves the core hard off-heading, so the roots twist into a rope
      // instead of radiating as a star.
      const c1 = polar(
        angle + swirlDir * (10 + h * ROOT_SWIRL),
        ROOT_INNER * (0.24 + h * 0.4),
      );
      const c2 = polar(angle + w * (arcHalf * 0.5), ROOT_INNER * 1.5 + h * 40);
      roots.push({
        key: `${seed}:root`,
        pipelineId: pipeline.id,
        agentId,
        d: `M ${CX} ${CY} C ${fmt(c1)}, ${fmt(c2)}, ${fmt(tip)}`,
        x: tip.x,
        y: tip.y,
        r: 1.1 + z * 2.2,
        z,
      });
    };

    // Branches off the system: one per agent, plus one for any steps no agent
    // owns, so nothing in the data goes unrepresented.
    const orphanSteps = pipeline.steps.filter((s) => !s.agent);
    const branchCount = pipeline.agents.length + (orphanSteps.length ? 1 : 0);
    const branchHalf = (arcHalf / Math.max(branchCount, 1)) * 0.95;

    interface Child {
      id: string;
      label: string;
      kind: "capability" | "step";
      step?: Pipeline["steps"][number];
    }

    /**
     * Walk a chain of children outward from one point.
     *
     * This is the shape that matters. Hanging every child off its parent at a
     * single radius produces a fan, and a fan reads as a chart. Stepping them
     * one after another, each one a segment further out and a few degrees off
     * the last, produces the wandering chains the map is supposed to look like
     * — the same structure, drawn as something that grew rather than something
     * that was plotted.
     */
    const growChain = (
      children: Child[],
      startAngle: number,
      startRadius: number,
      origin: { x: number; y: number },
      agentId: string | undefined,
      seedBase: string,
    ) => {
      let r = startRadius;
      let drift = 0;
      let parent = origin;
      const maxDrift = branchHalf * 1.15;

      children.forEach((child, j) => {
        const seed = `${seedBase}:${child.id}`;
        const z = hash01(seed + "z");
        r += SEG * (0.8 + hash01(seed + "r") * 0.5);
        drift = Math.max(
          -maxDrift,
          Math.min(maxDrift, drift + jitter(seed + "a") * 9),
        );
        const a = startAngle + drift;
        const pos = polar(a, r);

        nodes.push({
          key: seed,
          kind: child.kind,
          pipelineId: pipeline.id,
          agentId,
          label: child.label,
          x: pos.x,
          y: pos.y,
          r: 6.1,
          px: parent.x,
          py: parent.y,
          z,
        });
        root(seed, agentId, z);

        // A step's two ends hang off it as short stubs, which is where the
        // small hollow rings in the picture come from.
        if (child.step) {
          const ends = [
            { id: "in", label: child.step.input },
            { id: "out", label: child.step.output },
          ];
          ends.forEach((end, k) => {
            const eSeed = `${seed}:${end.id}`;
            const ea = a + (k === 0 ? -1 : 1) * (12 + hash01(eSeed) * 12);
            const epos = polar(ea, r + IO_SEG * (0.7 + hash01(eSeed + "r") * 0.6));
            nodes.push({
              key: eSeed,
              kind: "io",
              pipelineId: pipeline.id,
              agentId,
              label: end.label,
              x: epos.x,
              y: epos.y,
              r: 4,
              px: pos.x,
              py: pos.y,
              z: hash01(eSeed + "z"),
            });
          });
        }

        parent = pos;
        void j;
      });
    };

    const agents: MapNode[] = pipeline.agents.map((agent, j) => {
      const mid = fan(j, branchCount, angle, arcHalf);
      const aPos = polar(mid, R_AGENT + jitter(agent.id) * 14);
      const aZ = hash01(agent.id + "z");

      const agentNode: MapNode = {
        key: `${pipeline.id}:${agent.id}`,
        kind: "agent",
        pipelineId: pipeline.id,
        agentId: agent.id,
        label: agent.name,
        x: aPos.x,
        y: aPos.y,
        r: 5,
        px: sys.x,
        py: sys.y,
        z: aZ,
      };
      root(`${pipeline.id}:${agent.id}`, agent.id, aZ);

      const children: Child[] = [
        ...agent.capabilities.map((c, k) => ({
          id: `c${k}`,
          label: c,
          kind: "capability" as const,
        })),
        ...pipeline.steps
          .filter((st) => st.agent === agent.id)
          .map((st) => ({
            id: st.id,
            label: st.name,
            kind: "step" as const,
            step: st,
          })),
      ];

      // Split into short chains rather than one long one, so an agent throws
      // two or three limbs instead of a single tendril.
      const chains: Child[][] = [];
      for (let i = 0; i < children.length; i += CHAIN_LEN) {
        chains.push(children.slice(i, i + CHAIN_LEN));
      }

      chains.forEach((chain, ci) => {
        growChain(
          chain,
          fan(ci, chains.length, mid, branchHalf),
          R_AGENT,
          aPos,
          agent.id,
          `${pipeline.id}:${agent.id}:${ci}`,
        );
      });

      return agentNode;
    });

    // Steps nobody owns still belong to the system: they get their own branch
    // rather than being dropped from the picture.
    if (orphanSteps.length) {
      const mid = fan(branchCount - 1, branchCount, angle, arcHalf);
      growChain(
        orphanSteps.map((st) => ({
          id: st.id,
          label: st.name,
          kind: "step" as const,
          step: st,
        })),
        mid,
        R_SYSTEM + 26,
        sys,
        undefined,
        `${pipeline.id}:unowned`,
      );
    }

    return {
      pipelineId: pipeline.id,
      angle,
      node,
      label: polar(angle, R_LABEL),
      anchor: cos > 0.45 ? "start" : cos < -0.45 ? "end" : "middle",
      agents,
      nodes,
      roots,
    };
  });
}

export const CENTRE = { x: CX, y: CY };
