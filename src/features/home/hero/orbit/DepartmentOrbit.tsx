import { useRef, type CSSProperties, type ReactNode } from "react";

import { DEPARTMENTS } from "./departments";
import {
  CORE,
  CORE_DISC_R,
  RING_INNER_R,
  RING_OUTER_R,
  SATELLITES,
  SATELLITE_R,
  STAGE_H,
  STAGE_W,
  NODE_RING_R,
  TRACK,
} from "./geometry";
import { ORBIT_CSS } from "./orbitCss";
import {
  BEAT_DELAYS,
  FOCUS_POINT,
  RIPPLE_REST,
  delayFor,
  parkedFrame,
  pinAt,
  restFrame,
} from "./motion";
import FocusReadout, { FocusMarker } from "./FocusReadout";
import OrbitNode from "./OrbitNode";
import { INK, MARKER_GREY, ORANGE, RULE_GREY, TRACK_GREY } from "./palette";
import { PIN_SVG } from "./pin";
import { useOffscreenPause } from "./useOffscreenPause";
import { useStageScale } from "./useStageScale";

interface DepartmentOrbitProps {
  className?: string;
  paused?: boolean;
}

const PARKED = parkedFrame();

/** The satellite ring's box: its radius plus room for the largest dot. */
/** Room past the satellite ring for its largest dot (r 2.8) and the ring's
 *  own 2 su stroke. */
const DRIFT_PAD = 4;
const DRIFT_R = SATELLITE_R + DRIFT_PAD;
const DRIFT_BOX: CSSProperties = {
  left: CORE.x - DRIFT_R,
  top: CORE.y - DRIFT_R,
  width: 2 * DRIFT_R,
  height: 2 * DRIFT_R,
};

/** A static full-stage SVG layer, drawn in su. */
function Layer({ children }: { children: ReactNode }) {
  return (
    <svg
      width={STAGE_W}
      height={STAGE_H}
      viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A hairline pin: a 1 su bar that the pin's transform aims and stretches.
 *  `className` carries its loop (`zo-a` or `zo-pair`) and animation. */
function Hairline({
  className,
  transform,
  delay,
  height,
  fill,
  hidden,
}: {
  className: string;
  transform: string;
  delay: string;
  height: number;
  fill: string;
  hidden?: boolean;
}) {
  return (
    <div
      className={`zo-pin ${className}`}
      style={{ transform, animationDelay: delay, opacity: hidden ? 0 : undefined }}
    >
      <svg {...PIN_SVG}>
        <rect y={-height / 2} width={1} height={height} fill={fill} />
      </svg>
    </div>
  );
}

/**
 * The department orbit: eight departments flowing anticlockwise along the
 * track, each tied to the core by a hairline, with a fixed hollow marker at
 * nine o'clock that wakes whichever node is passing it.
 *
 * Fills the stage box. Inside, one plane the size of the stage at s = 1
 * (STAGE_W × STAGE_H su) is scaled once by `--zo-s`, and everything in it draws in
 * stage units: static SVG layers for what never moves, and HTML pins, animated
 * on the compositor, for what does (see motion.ts). The core disc is NOT drawn
 * here: it is `CoreDisc`, on its own unclipped layer above the stage (it
 * overhangs the stage's right edge), and the threads converge underneath it.
 *
 * The whole drawing is `aria-hidden`; the one thing it says, eight departments
 * each run by an AI role, is in the visually hidden list beside it.
 */
export default function DepartmentOrbit({ className, paused = false }: DepartmentOrbitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const offscreen = useOffscreenPause(ref);
  // Nothing until measured, so the server and the first client render agree;
  // until then ORBIT_CSS derives the same value from the stage's `--s`.
  const s = useStageScale(ref, STAGE_W);
  const rootStyle = s === null ? undefined : ({ "--zo-s": s } as CSSProperties);

  return (
    <div
      ref={ref}
      className={`zo-root relative h-full w-full ${className ?? ""}`}
      style={rootStyle}
      data-paused={paused || offscreen ? "true" : "false"}
    >
      <style dangerouslySetInnerHTML={{ __html: ORBIT_CSS }} />
      <div className="zo-plane font-hero-mono" aria-hidden="true">
        {/* Every gradient, in an SVG of its own that holds nothing else and
            renders first: the pins' SVGs reference these by id, so they must
            not depend on any drawing layer staying rendered. */}
        <svg
          width={0}
          height={0}
          aria-hidden="true"
          focusable="false"
          style={{ position: "absolute" }}
        >
          <defs>
            {/* The resting threads are ink, faint, and run into the brain's
                dark fibres; orange is kept for the nodes and the active
                connector (zo-glow, the pulse, the ripple, the core). */}
            <linearGradient id="zo-thread" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={INK} stopOpacity="0.5" />
              <stop offset="1" stopColor={INK} stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="zo-glow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={ORANGE} stopOpacity="0.95" />
              <stop offset="0.6" stopColor={ORANGE} stopOpacity="0.55" />
              <stop offset="1" stopColor={ORANGE} stopOpacity="0.85" />
            </linearGradient>
            {/* The track lightens over its top (reference darkness ≈ 13 there
                against ≈ 35 on the rest of the arc). */}
            <linearGradient
              id="zo-track"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={TRACK.y - TRACK.r}
              x2="0"
              y2={TRACK.y - TRACK.r + 40}
            >
              <stop offset="0" stopColor={TRACK_GREY} stopOpacity="0.4" />
              <stop offset="1" stopColor={TRACK_GREY} stopOpacity="1" />
            </linearGradient>
            <radialGradient id="zo-node-halo">
              <stop offset="0.55" stopColor={ORANGE} stopOpacity="0.1" />
              <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="zo-pulse">
              <stop offset="0" stopColor={ORANGE} stopOpacity="1" />
              <stop offset="0.45" stopColor={ORANGE} stopOpacity="0.9" />
              <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        <Layer>
          {/* Rings about C. Radii are the ink peaks on the reference. */}
          <circle
            cx={CORE.x}
            cy={CORE.y}
            r={RING_OUTER_R}
            fill="none"
            stroke={RULE_GREY}
            strokeWidth={0.8}
            strokeDasharray="3 5"
          />
          <circle
            cx={CORE.x}
            cy={CORE.y}
            r={RING_INNER_R}
            fill="none"
            stroke={TRACK_GREY}
            strokeWidth={0.8}
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
        </Layer>

        {/* The satellite ring drifts with the brain: its own layer, turned
            about C on the compositor. */}
        <div className="zo-drift" style={DRIFT_BOX}>
          <svg
            width={2 * DRIFT_R}
            height={2 * DRIFT_R}
            viewBox={`${CORE.x - DRIFT_R} ${CORE.y - DRIFT_R} ${2 * DRIFT_R} ${2 * DRIFT_R}`}
            aria-hidden="true"
            focusable="false"
          >
            {/* Ink, like the fibres they drift through. */}
            <circle
              cx={CORE.x}
              cy={CORE.y}
              r={SATELLITE_R}
              fill="none"
              stroke={INK}
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeDasharray="0.1 6"
              strokeLinecap="round"
            />
            {SATELLITES.map((p) => (
              <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={p.r} fill={INK} fillOpacity={0.7} />
            ))}
          </svg>
        </div>

        {/* The track the departments ride. */}
        <Layer>
          <circle
            cx={TRACK.x}
            cy={TRACK.y}
            r={TRACK.r}
            fill="none"
            stroke="url(#zo-track)"
            strokeWidth={0.9}
            strokeDasharray="3 4"
          />
        </Layer>

        {/* Threads (to the brain's rim). Copy B's thread only shows during
            its entry step. */}
        {DEPARTMENTS.map((d, i) => {
          const rest = restFrame(i);
          const delay = delayFor(i);
          return (
            <div key={`thread-${d.number}`}>
              <Hairline
                className="zo-a zo-thread-a"
                transform={rest.thread}
                delay={delay}
                height={0.9}
                fill="url(#zo-thread)"
              />
              <Hairline
                className="zo-a zo-thread-b"
                transform={PARKED.thread}
                delay={delay}
                height={0.9}
                fill="url(#zo-thread)"
                hidden
              />
            </div>
          );
        })}

        {/* The active thread, dot to disc: two glows take turns, so
            consecutive ones can cross-fade. */}
        {BEAT_DELAYS.glow.map((delay) => (
          <Hairline
            key={delay}
            className="zo-pair zo-glow"
            transform={restFrame(0).glow}
            delay={delay}
            height={1.2}
            fill="url(#zo-glow)"
            hidden
          />
        ))}

        {/* A ring off the core each time a pulse lands. It sits under the
            disc, so only the part outside r 41 shows, through the frosted
            band. */}
        <div className="zo-pin" style={{ transform: pinAt(CORE) }}>
          <div className="zo-pin zo-step zo-core-ring" style={{ opacity: 0 }}>
            <svg {...PIN_SVG}>
              <circle r={CORE_DISC_R + 1} fill="none" stroke={ORANGE} strokeWidth={1.2} />
            </svg>
          </div>
        </div>

        <div className="zo-pin zo-step zo-pulse" style={{ animationDelay: BEAT_DELAYS.pulse, opacity: 0 }}>
          <svg {...PIN_SVG}>
            <circle r={4.5} fill="url(#zo-pulse)" />
          </svg>
        </div>

        {/* The fixed focus marker, and its orange tint for each crossing. */}
        <Layer>
          <circle
            data-hero="focus-ring"
            cx={FOCUS_POINT.x}
            cy={FOCUS_POINT.y}
            r={5.5}
            fill="#FFFFFF"
            stroke={MARKER_GREY}
            strokeWidth={1.2}
          />
        </Layer>
        <div
          className="zo-pin zo-step zo-focus"
          style={{ transform: pinAt(FOCUS_POINT), opacity: 0 }}
        >
          <svg {...PIN_SVG}>
            <circle r={5.5} fill="none" stroke={ORANGE} strokeWidth={1.2} />
          </svg>
        </div>

        {/* Compact mode only: the phone-scale marker over the ring above. */}
        <FocusMarker />

        {DEPARTMENTS.map((d, i) => {
          const rest = restFrame(i);
          const delay = delayFor(i);
          return (
            <div key={`node-${d.number}`}>
              <OrbitNode
                dept={d}
                copy="b"
                nodeTransform={PARKED.node}
                textTransform={PARKED.text}
                delay={delay}
                hidden
              />
              <OrbitNode
                dept={d}
                copy="a"
                nodeTransform={rest.node}
                textTransform={rest.text}
                delay={delay}
              />
            </div>
          );
        })}

        {/* The ripple off whichever dot is crossing the marker. */}
        <div
          className="zo-pin zo-step zo-ripple-at"
          style={{ transform: RIPPLE_REST, animationDelay: BEAT_DELAYS.ripple }}
        >
          <div className="zo-pin zo-step zo-ripple" style={{ animationDelay: BEAT_DELAYS.ripple, opacity: 0 }}>
            <svg {...PIN_SVG}>
              <circle r={NODE_RING_R} fill="none" stroke={ORANGE} strokeWidth={1} />
            </svg>
          </div>
        </div>

        {/* Compact mode only: on top, so a node passing the marker never
            covers the name it is being read out as. */}
        <FocusReadout />
      </div>

      <ul className="sr-only">
        {DEPARTMENTS.map((d) => (
          <li key={d.number}>{`${d.number} ${d.label}, ${d.role}`}</li>
        ))}
      </ul>
    </div>
  );
}
