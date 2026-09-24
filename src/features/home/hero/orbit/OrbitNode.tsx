import type { CSSProperties } from "react";

import type { Department } from "./departments";
import { DOT_R, NODE_HALO_R, NODE_OUTER_R, NODE_RING_R } from "./geometry";
import { COBALT_INK, INK } from "./palette";
import { PIN_SVG } from "./pin";

/**
 * One department node: a ringed cobalt dot, and to its LEFT a right-aligned
 * block of number, label and role.
 *
 * Every moving part is an HTML pin (see motion.ts): the node itself (placed on
 * the track and scaled on entry and exit), the text block (offset to follow
 * the reference's small per-slot irregularities), and the cobalt copy of the
 * role that fades in over the grey one. Each pin carries a small
 * static SVG, so the drawing is the same as a plain SVG node's.
 *
 * The text sits inside `.zo-k`, which counter-scales it by `--zo-k` about the
 * block's anchor (the label's right edge, on its baseline). The dot and the
 * offset to the anchor scale with the stage; the type holds its size.
 *
 * `copy` "a" is the node proper and carries the measurement hook and the active
 * moment. "b" is the invisible stand-in that enters from the top during its
 * department's wrap step (see motion.ts).
 */

/**
 * Type, fitted to the reference ink in JetBrains Mono (the hero's mono): the
 * label's caps are 8px tall with an 8.5px advance, and the numbers' digits
 * are 7.3px. Anchors sit right of the measured INK edge by the trailing
 * letter-spacing plus the right side bearing, which was measured on a render.
 */
const NUMBER_SIZE = 10;
const LABEL_SIZE = 11;
const ROLE_SIZE = 10;
const NUMBER_X = 1.4;
const LABEL_X = 2.4;
const ROLE_X = 1.0;
const NUMBER_Y = -19.5;
const ROLE_Y = 14;

/** Weight 500 for the number and label (the reference's stems are 1.3–1.7px
 *  against our 1.05 at 400); INK (palette.ts) holds the tone. The
 *  role line stays at 400. */
const STRONG = 500;
const DOT = "#1B4BFC";
const NUMBER_BLUE = "#2B65FD";
const ROLE_GREY = "#6E7184";

interface OrbitNodeProps {
  readonly dept: Department;
  readonly copy: "a" | "b";
  readonly nodeTransform: string;
  readonly textTransform: string;
  readonly delay: string;
  readonly hidden?: boolean;
}

function RoleText({ role, fill, className }: { role: string; fill: string; className: string }) {
  return (
    <text
      className={className}
      x={ROLE_X}
      y={ROLE_Y}
      textAnchor="end"
      fontSize={ROLE_SIZE}
      letterSpacing="0.04em"
      fill={fill}
    >
      {role}
    </text>
  );
}

export default function OrbitNode({
  dept,
  copy,
  nodeTransform,
  textTransform,
  delay,
  hidden = false,
}: OrbitNodeProps) {
  const isA = copy === "a";
  const node: CSSProperties = {
    transform: nodeTransform,
    animationDelay: delay,
    opacity: hidden ? 0 : undefined,
  };

  return (
    <div className={`zo-pin zo-a zo-node-${copy}`} style={node}>
      <svg {...PIN_SVG}>
        <circle r={NODE_HALO_R} fill="url(#zo-node-halo)" />
        <circle r={NODE_OUTER_R} fill="none" stroke="#DCE4FE" strokeWidth={0.8} />
        <circle r={NODE_RING_R} fill="#FFFFFF" stroke="#A9BDFC" strokeWidth={1} />
        <circle r={DOT_R} fill={DOT} data-hero={isA ? `dept-${dept.number}` : undefined} />
      </svg>

      <div
        className={`zo-pin zo-a zo-text-${copy}`}
        style={{ transform: textTransform, animationDelay: delay }}
      >
        <div className="zo-pin zo-k">
          <svg {...PIN_SVG}>
            <text
              className="zo-num"
              x={NUMBER_X}
              y={NUMBER_Y}
              textAnchor="end"
              fontSize={NUMBER_SIZE}
              fontWeight={STRONG}
              letterSpacing="0.08em"
              fill={NUMBER_BLUE}
            >
              {dept.number}
            </text>
            <text
              className="zo-label"
              x={LABEL_X}
              y={0}
              textAnchor="end"
              fontSize={LABEL_SIZE}
              fontWeight={STRONG}
              letterSpacing="0.17em"
              fill={INK}
            >
              {dept.label.toUpperCase()}
            </text>
            <RoleText
              role={dept.role}
              fill={ROLE_GREY}
              className={isA ? "zo-label zo-role" : "zo-label"}
            />
          </svg>
          {/* The active colour: a cobalt copy faded in over the grey one. */}
          {isA && (
            <div className="zo-pin zo-a zo-role-on" style={{ animationDelay: delay, opacity: 0 }}>
              <svg {...PIN_SVG}>
                <RoleText role={dept.role} fill={COBALT_INK} className="zo-label" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
