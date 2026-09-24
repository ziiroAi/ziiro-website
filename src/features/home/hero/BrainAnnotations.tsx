import { DIRECTORY_STATS, PIPELINES } from "@/features/home/directory/pipelines";

import DynamicIdentity, { useCycle } from "./DynamicIdentity";
import { IDENTITIES } from "./heroContent";

/**
 * The text around the half-brain, and the light that goes round it.
 *
 * The reference's annotation layer, mirrored so it faces the copy:
 * - a faint dotted arc just outside the brain's curved side;
 * - one ringed node on it per department, with its label outside;
 * - two small captions;
 * - the rotating identity by the core, on the cut edge.
 *
 * Everything that says something is real DOM text, so it is in the
 * prerendered HTML for a crawler and a screen reader. The arc, the dots and
 * the light are decoration, and hidden from assistive tech.
 *
 * DATA, NOT COPY. One node per entry in PIPELINES, and the "N departments"
 * caption reads DIRECTORY_STATS, so adding a department adds a node and changes
 * the count. Nothing here may carry a number the directory cannot back up:
 * the reference's coordinates and "127 jobs" are deliberately absent.
 *
 * GEOMETRY. Every position is a fraction of the brain's image box (x of its
 * width, y of its height), so the whole layer scales with `--brain-h` and
 * needs no measuring at runtime. The arc is the brain's own curve, fitted from
 * the image and pushed out by `ARC_GAP`, rather than a circle. A circle wide
 * enough to clear the poles bulges far past the brain at mid-height, and at
 * 1024 that bulge runs the labels into the copy.
 *
 * MOTION, all compositor-only, all off under prefers-reduced-motion (index.css):
 * - The light rides an arm that rotates about the curve's centre, inside a frame
 *   stretched vertically by B/A. Rotation plus that one static scale traces
 *   exactly the arc's ellipse, using transform alone.
 * - Each node and label pulses on the same period. Its phase is set to the
 *   moment the light reaches its angle, so it brightens as the light arrives.
 *   All of them mount in the same frame, so they stay locked together.
 */

/** Fitted from the current image: the curved side is a superellipse
 *  (n ≈ 1.8) centred on the cut edge. Semi-axes are in units of the box
 *  height. Re-fit these if the image changes, alongside HalfBrain's CORE. */
export interface BrainCurve {
  /** Cut edge, as a fraction of the box width. */
  cutX: number;
  /** Centre of the curved side, as a fraction of the box height. */
  centreY: number;
  /** Horizontal semi-axis of the curve, in box heights. */
  a: number;
  /** Vertical semi-axis of the curve, in box heights. */
  b: number;
  /** Box width over box height. */
  aspect: number;
  /** The core, as fractions of the box. */
  core: { x: number; y: number };
}

/** How far outside the brain the arc runs, in box heights (22px at 720). */
const ARC_GAP = 0.03;
/** The arc's extent either side of horizontal, in its own parametric angle.
 *  ±68° keeps both ends clear of the navbar at every desktop size measured. */
const ARC_SPAN = 68;
/** The nodes sit inside a slightly smaller span so the arc visibly continues
 *  past the first and last department. */
const NODE_SPAN = 60;
/** One pass of the light, top to bottom, in seconds. */
const LAP_S = 24;

const rad = (deg: number) => (deg * Math.PI) / 180;

export default function BrainAnnotations({ curve }: { curve: BrainCurve }) {
  const [index] = useCycle(IDENTITIES.length, 3400, 1500);

  const A = curve.a + ARC_GAP; // box heights
  const B = curve.b + ARC_GAP;

  // A point on the arc at parametric angle phi (negative is up), as
  // fractions of the box.
  const at = (phi: number) => ({
    x: curve.cutX - (A / curve.aspect) * Math.cos(rad(phi)),
    y: curve.centreY + B * Math.sin(rad(phi)),
  });

  // The arc as an SVG path in a viewBox that IS the box, 1000 units tall.
  const vbW = curve.aspect * 1000;
  const start = at(-ARC_SPAN);
  const end = at(ARC_SPAN);
  const arcPath = `M ${start.x * vbW} ${start.y * 1000} A ${A * 1000} ${B * 1000} 0 0 0 ${end.x * vbW} ${end.y * 1000}`;

  const n = PIPELINES.length;
  const nodes = PIPELINES.map((p, i) => {
    const phi = n === 1 ? 0 : -NODE_SPAN + (2 * NODE_SPAN * i) / (n - 1);
    // The light runs from +ARC_SPAN (top) to -ARC_SPAN in arm rotation, so it
    // reaches phi at this fraction of the lap. A negative delay puts the
    // pulse's peak exactly there.
    const reach = (ARC_SPAN + phi) / (2 * ARC_SPAN);
    return { p, i, pos: at(phi), delay: `${((reach - 1) * LAP_S).toFixed(2)}s` };
  });

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

  return (
    <>
      {/* ── The arc, its nodes and the light. Pure decoration. ───────────── */}
      <div
        data-hero-reveal
        data-hero-annot
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${vbW} 1000`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* The ends fade out rather than stopping on a dot. */}
            <linearGradient
              id="brain-arc-fade"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={start.y * 1000}
              x2="0"
              y2={end.y * 1000}
            >
              <stop offset="0" stopColor="#3350FF" stopOpacity="0" />
              <stop offset="0.1" stopColor="#3350FF" stopOpacity="0.34" />
              <stop offset="0.9" stopColor="#3350FF" stopOpacity="0.34" />
              <stop offset="1" stopColor="#3350FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={arcPath}
            fill="none"
            stroke="url(#brain-arc-fade)"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeDasharray="0.1 9"
          />
        </svg>

        {/* The light: frame (static vertical stretch) > arm (rotates) > glow. */}
        <div
          className="absolute h-0 w-0"
          style={{
            left: pct(curve.cutX),
            top: pct(curve.centreY),
            transform: `scaleY(${(B / A).toFixed(4)})`,
          }}
        >
          <div className="brain-orbit-arm absolute left-0 top-0 h-0 w-0">
            <div
              className="brain-orbit-light absolute h-[30px] w-[30px] rounded-full"
              style={{
                left: `calc(var(--brain-h) * ${-A})`,
                top: 0,
                translate: "-50% -50%",
                background:
                  "radial-gradient(circle, rgba(51, 80, 255, 0.5) 0%, rgba(51, 80, 255, 0.18) 38%, rgba(51, 80, 255, 0) 70%)",
              }}
            />
          </div>
        </div>

        {nodes.map(({ p, pos, delay }) => (
          <div
            key={p.id}
            className="absolute"
            style={{ left: pct(pos.x), top: pct(pos.y), translate: "-50% -50%" }}
          >
            <span
              className="brain-pulse-halo absolute left-1/2 top-1/2 h-[26px] w-[26px] rounded-full"
              style={{
                translate: "-50% -50%",
                opacity: 0,
                animationDelay: delay,
                background:
                  "radial-gradient(circle, rgba(51, 80, 255, 0.28) 0%, rgba(51, 80, 255, 0) 70%)",
              }}
            />
            {/* The reference's marker: a solid dot, a white gap, a hairline
                ring. It holds steady; the halo behind it is what brightens. */}
            <span
              className="relative block h-[11px] w-[11px] rounded-full bg-white"
              style={{
                opacity: 0.8,
                boxShadow: "inset 0 0 0 1px rgba(51, 80, 255, 0.6)",
              }}
            >
              <span className="absolute inset-[3px] rounded-full bg-[#3350FF]" />
            </span>
          </div>
        ))}
      </div>

      {/* ── Department labels: real text, outside the arc, toward the copy.
           Beside the copy only; stacked, there is no room for them. ── */}
      <ul
        data-hero-reveal
        data-hero-annot
        aria-label="Departments"
        className="pointer-events-none absolute inset-0 hidden lg:block"
      >
        {nodes.map(({ p, i, pos, delay }) => (
          <li
            key={p.id}
            className="absolute whitespace-nowrap text-right font-mono uppercase"
            style={{
              left: pct(pos.x),
              top: pct(pos.y),
              translate: "calc(-100% - 14px) -50%",
            }}
          >
            {/* No resting opacity here: the pulse supplies its quiet 0.55.
                Under reduced motion there is no pulse, so the label sits at
                full strength instead of permanently dimmed. */}
            <span className="brain-pulse block" style={{ animationDelay: delay }}>
              <span
                aria-hidden="true"
                className="block text-[9px] leading-[1.2]"
                style={{ letterSpacing: "0.12em", color: "#3350FF" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="block text-[10px] leading-[1.35]"
                style={{ letterSpacing: "0.2em", color: "var(--text-primary)" }}
              >
                {p.name}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {/* ── Two captions, reference style, beside the copy only. ── */}
      <p
        data-hero-reveal
        data-hero-annot
        className="pointer-events-none absolute hidden whitespace-nowrap text-right font-mono text-[9px] uppercase leading-[1.5] lg:block"
        style={{
          // Level with the first department, well out to the side, which is
          // where the reference puts it. It hangs off the brain box's left
          // edge rather than off the arc, so it cannot meet the first label.
          // This caption ends 60px outside the box. The first label starts
          // about 0.205 x --brain-h - 94px from the box edge. At the smallest
          // desktop brain (440px) they are still ~56px apart.
          left: 0,
          top: pct(nodes[0]?.pos.y ?? at(-NODE_SPAN).y),
          translate: "calc(-100% - 60px) -50%",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
        }}
      >
        <span className="block">{DIRECTORY_STATS.departments} departments</span>
        <span className="block">One intelligence</span>
      </p>
      <p
        data-hero-reveal
        data-hero-annot
        className="pointer-events-none absolute hidden whitespace-nowrap font-mono text-[9px] uppercase leading-[1.5] lg:block"
        style={{
          // On the cut-edge side, well below the identity.
          left: `calc(${pct(curve.cutX)} + 16px)`,
          top: pct(curve.centreY + 0.3),
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
        }}
      >
        <span className="block">From fragmented</span>
        <span className="block">To focused</span>
      </p>

      {/* ── The rotating identity, on the cut edge by the core. Centred with
           the `translate` property, because the entrance timeline animates
           `transform` on the two lines inside. ── */}
      <div
        className="pointer-events-none absolute whitespace-nowrap"
        style={{
          left: `calc(${pct(curve.core.x)} + 16px)`,
          top: pct(curve.core.y),
          translate: "0 -50%",
        }}
      >
        <p
          data-hero-reveal
          data-hero-orb-label
          className="font-mono text-[9px] uppercase leading-none"
          style={{ letterSpacing: "0.2em", color: "var(--text-muted)" }}
        >
          Your AI
        </p>
        <span data-hero-reveal data-hero-orb-word className="mt-[5px] block">
          <DynamicIdentity
            items={IDENTITIES}
            index={index}
            srLabel={`Your AI: ${IDENTITIES.join(", ")}`}
            className="font-display font-medium"
            style={{
              fontSize: "15px",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}
          />
        </span>
      </div>
    </>
  );
}
