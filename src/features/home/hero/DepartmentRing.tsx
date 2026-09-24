import { forwardRef, useImperativeHandle, useRef, type CSSProperties } from "react";

import { PIPELINES } from "@/features/home/directory/pipelines";

/**
 * The departments, on a ring around the brain that turns with it.
 *
 * The ring is a circle at the fibre sphere's equator, seen from a little
 * above: an ellipse on screen. Each department is a point on it. Its angle is
 * its place in the list plus the brain's yaw, the same number that turns the
 * brain (brainMotion), so dragging the brain spins the departments too.
 *
 * - Depth. A point's cosine says how near it is. The near half sits in front
 *   of the brain at full strength and a touch larger. The far half drops to
 *   25% and goes behind the brain's canvas, which multiplies into the page, so
 *   a far label shows through the glass rather than floating over it.
 * - Cost. A frame writes two custom properties per department and two SVG
 *   paths. Position, scale and opacity are all computed in CSS from those
 *   (index.css, `.brain-dept`), and nothing touches layout.
 * - Data, not copy. One point per entry in PIPELINES, spaced evenly, so a new
 *   department joins the ring and the spacing closes up.
 * - Access. The departments are an ordered list of real text, 01 to 07 in DOM
 *   order, whatever the ring is doing. The ring, the dots and the numbers are
 *   decoration and hidden from assistive tech.
 * - Stacked, below lg, there is no room for names round the ring. It keeps its
 *   points and their numbers, still, and the names become a plain list under
 *   the brain.
 */

/** Ring shape as fractions of the square: at the fibres' equator, centred on
 *  the scene's pivot (the square's centre), just outside the fibres at the
 *  sides (0.44 against their ~0.41), and seen from about 22° above
 *  (0.167 / 0.44 = sin 22°). index.css reads these through --ring-rx/-ry.
 *  Two numbers rather than one object: react-refresh only lets a component
 *  file export primitives alongside the component. */
export const RING_RX = 0.44;
export const RING_RY = 0.167;

/** Department 01's angle before any turn, chosen for the start pose: 01 in
 *  front of the brain on the copy side, the rest following round. */
const FIRST = (130 * Math.PI) / 180;
const DOTS = 96;

export interface DepartmentRingHandle {
  update(yaw: number): void;
}

const angleOf = (i: number) => FIRST + (i * 2 * Math.PI) / PIPELINES.length;

/** The ring's dots on one side of it, as one path of zero-length strokes that
 *  round caps turn into dots. In the square's own units, 1000 across. */
function dots(yaw: number, front: boolean): string {
  let d = "";
  for (let j = 0; j < DOTS; j++) {
    const a = (j * 2 * Math.PI) / DOTS + yaw;
    const c = Math.cos(a);
    if (c >= 0 !== front) continue;
    const x = 500 + 1000 * RING_RX * Math.sin(a);
    const y = 500 + 1000 * RING_RY * c;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
  }
  return d;
}

/** The custom properties one department is drawn from. */
const place = (a: number) =>
  ({ "--s": Math.sin(a).toFixed(4), "--c": Math.cos(a).toFixed(4) }) as CSSProperties;

const DepartmentRing = forwardRef<
  DepartmentRingHandle,
  { startYaw: number; onHold: (on: boolean) => void }
>(function DepartmentRing({ startYaw, onHold }, ref) {
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const back = useRef<SVGPathElement>(null);
  const front = useRef<SVGPathElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      update(yaw) {
        items.current.forEach((li, i) => {
          if (!li) return;
          const a = angleOf(i) + yaw;
          const c = Math.cos(a);
          li.style.setProperty("--s", Math.sin(a).toFixed(4));
          li.style.setProperty("--c", c.toFixed(4));
          // In front of the brain's canvas or behind it (index.css).
          li.toggleAttribute("data-front", c >= 0);
        });
        back.current?.setAttribute("d", dots(yaw, false));
        front.current?.setAttribute("d", dots(yaw, true));
      },
    }),
    [],
  );

  const ring = (side: "back" | "front") => (
    <svg
      data-hero-reveal
      data-hero-annot
      aria-hidden="true"
      className={`brain-square brain-ring brain-ring-${side}`}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
    >
      <path ref={side === "back" ? back : front} d={dots(startYaw, side === "front")} />
    </svg>
  );

  return (
    <>
      {ring("back")}
      {ring("front")}
      <ol
        data-hero-reveal
        data-hero-annot
        aria-label="Departments"
        className="brain-depts"
        // A label being read holds the turn (brainMotion), so it stays under
        // the pointer. Delegated, one pair of listeners for the whole list.
        onPointerOver={(e) => {
          if (e.pointerType === "mouse" && (e.target as Element).closest("li")) onHold(true);
        }}
        onPointerOut={(e) => {
          if (!e.relatedTarget || !(e.relatedTarget as Element).closest?.("li")) onHold(false);
        }}
      >
        {PIPELINES.map((p, i) => {
          const a = angleOf(i) + startYaw;
          const n = String(i + 1).padStart(2, "0");
          return (
            <li
              key={p.id}
              ref={(el) => {
                items.current[i] = el;
              }}
              className="brain-dept"
              data-front={Math.cos(a) >= 0 ? "" : undefined}
              style={place(a)}
            >
              <span aria-hidden="true" className="brain-dept-node">
                <span className="brain-dept-node-num font-mono text-[9px] leading-none tracking-[0.08em] text-[#3350FF]">
                  {n}
                </span>
              </span>
              {/* Same type as the old arc's labels: mono, the number in blue
                  over the name in ink. */}
              <span className="brain-dept-label font-mono uppercase">
                <span
                  aria-hidden="true"
                  className="brain-dept-num text-[9px] leading-[1.2] tracking-[0.12em] text-[#3350FF]"
                >
                  {n}
                </span>
                <span className="brain-dept-name text-[10px] leading-[1.35] tracking-[0.2em] text-[var(--text-primary)]">
                  {p.name}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
});

export default DepartmentRing;
