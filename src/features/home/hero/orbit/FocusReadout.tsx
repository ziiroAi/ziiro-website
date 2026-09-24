import { DEPARTMENTS } from "./departments";
import { FOCUS_POINT, READOUT_REST_INDEX, delayFor, pinAt } from "./motion";
import { STAGE_H } from "./geometry";
import { INK, ORANGE, ORANGE_INK } from "./palette";
import { PIN_SVG } from "./pin";

/**
 * Compact mode's focus key: a marker on the focus ring and a caption naming
 * the department passing it. Both only display where the per-node labels
 * cannot fit (`.zo-compact-only`, see ORBIT_CSS); everywhere else they are
 * `display: none` and cost nothing. Like the rest of the drawing they are
 * aria-hidden: the visually hidden list already carries the departments. Both
 * are HTML pins (see motion.ts); only the captions' opacity animates.
 *
 * THE CAPTION sits in the stage's bottom-left corner, which is the one calm
 * white ground on a phone: below and left of the arc, clear of the brain,
 * the rings and the threads. It used to sit beside the marker, which put orange
 * text over the brain's rim and read as clutter. Its lines are ordered by
 * length against the geometry: the short "04 SALES" line on top, where a
 * number passing slot 7 comes closest, and the longer role line underneath,
 * where the nearest node is already far to the right. Measured over a full
 * cycle at 390 and 360: no collision, 6.5px clear at the closest.
 *
 * THE MARKER makes the hollow ring read as an instrument rather than a stray
 * dot: at phone scale the ring is ~3px, so it gets a counter-scaled orange ring
 * with one index tick pointing out of the arc. The caption opens with the same
 * small ring, so the two read as a key and its legend without a leader line
 * across the numbers.
 *
 * One caption entry per department, each shown during that department's
 * active window with the same keyframe timing as the role colour, so exactly
 * one is visible at a time. Without motion the rest frame's next node into
 * the marker (04) is shown.
 */

const SIZE = 11;
/** Tracked tighter than the desktop labels: at 0.12em "08 TECHNOLOGY" came
 *  within 2.5px of a number passing slot 7 on a 360 phone. */
const TRACK_LABEL = 0.06;
const TRACK_ROLE = 0.02;
/** From the stage's left edge, in px: the page gutter on a 390 phone. */
const INSET_X = 16;
/** Baselines above the stage's bottom edge, in px. The role line's
 *  descenders stay 6px clear of the edge. */
const LABEL_BASELINE = -24;
const ROLE_BASELINE = -8;
const TEXT_X = 14;

/** Same weight and ink as the desktop labels. */

export function FocusMarker() {
  return (
    <div className="zo-pin zo-compact-only" style={{ transform: pinAt(FOCUS_POINT) }}>
      <div className="zo-pin zo-k">
        <svg {...PIN_SVG}>
          <circle r={5} fill="#FFFFFF" stroke={ORANGE} strokeWidth={1.25} />
          <line
            x1={-8.5}
            x2={-13.5}
            y1={0}
            y2={0}
            stroke={ORANGE}
            strokeWidth={1.25}
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

export default function FocusReadout() {
  return (
    <div className="zo-pin zo-compact-only" style={{ transform: `translate(0px,${STAGE_H}px)` }}>
      <div className="zo-pin zo-k">
        {DEPARTMENTS.map((d, i) => (
          <div
            key={d.number}
            className="zo-pin zo-a zo-readout"
            style={{
              transform: `translate(${INSET_X}px,0px)`,
              animationDelay: delayFor(i),
              opacity: i === READOUT_REST_INDEX ? 1 : 0,
            }}
          >
            <svg {...PIN_SVG}>
              <circle
                cx={4}
                cy={LABEL_BASELINE - 4}
                r={3.5}
                fill="#FFFFFF"
                stroke={ORANGE}
                strokeWidth={1.1}
              />
              <text
                x={TEXT_X}
                y={LABEL_BASELINE}
                fontSize={SIZE}
                letterSpacing={`${TRACK_LABEL}em`}
                fontWeight={500}
                fill={INK}
              >
                {`${d.number} ${d.label.toUpperCase()}`}
              </text>
              <text
                x={TEXT_X}
                y={ROLE_BASELINE}
                fontSize={SIZE}
                letterSpacing={`${TRACK_ROLE}em`}
                fill={ORANGE_INK}
              >
                {d.role}
              </text>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
