import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";

import { DEPARTMENTS } from "./departments";
import { LAP_S, loopPath, placeAt, type NodePlace } from "./loop";

/**
 * The department orbit: the eight departments travelling round the brain on a
 * slightly lumpy loop (loop.ts), each a graphite ringed dot with its number,
 * label and role set outside the loop, so nothing inside it (the brain, its
 * fibres) can ever sit under a word.
 *
 * MOTION. Every department is placed from one number, the turn. While the live
 * brain is up, the turn is the brain's own (HeroBrain calls `setTurn` from its
 * frame), so dragging the brain moves the departments with it. Otherwise (a
 * phone, no WebGL, before the scene loads) the orbit keeps its own clock at the
 * same pace, one lap per LAP_S. Each department also drifts a little in and out
 * on its own slow period. Under reduced motion it holds its start frame, and
 * moves only when the visitor turns the brain.
 *
 * COST. A frame writes five custom properties per department; position, the
 * label's side and the active accent are all computed in CSS from them
 * (index.css, `.zo-*`), and nothing touches layout.
 *
 * The drawing is decoration to a screen reader; the one thing it says, eight
 * departments each run by an AI role, is in the visually hidden list.
 */

export interface OrbitHandle {
  /** Hand the clock to the brain (true), or take it back (false). */
  drive(on: boolean): void;
  /** While driven: the brain's turn, in radians. The departments move by as
   *  much as it does, from wherever they were when it took over. */
  setTurn(turn: number): void;
}

const PATH = loopPath();
const N = DEPARTMENTS.length;

/** Write every department's place into its custom properties, and the
 *  active weight into its caption. */
function paint(
  nodes: (HTMLLIElement | null)[],
  captions: (HTMLParagraphElement | null)[],
  turn: number,
  t: number,
) {
  for (let i = 0; i < N; i++) {
    const p = placeAt(i, N, turn, t);
    const li = nodes[i];
    if (li) {
      li.style.setProperty("--ox", p.ox.toFixed(4));
      li.style.setProperty("--oy", p.oy.toFixed(4));
      li.style.setProperty("--nx", p.nx.toFixed(4));
      li.style.setProperty("--ny", p.ny.toFixed(4));
      li.style.setProperty("--act", p.act.toFixed(3));
    }
    const cap = captions[i];
    if (cap) cap.style.opacity = p.act.toFixed(3);
  }
}

const vars = (p: NodePlace) =>
  ({
    "--ox": p.ox.toFixed(4),
    "--oy": p.oy.toFixed(4),
    "--nx": p.nx.toFixed(4),
    "--ny": p.ny.toFixed(4),
    "--act": p.act.toFixed(3),
  }) as CSSProperties;

const DepartmentOrbit = forwardRef<OrbitHandle>(function DepartmentOrbit(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);
  const captions = useRef<(HTMLParagraphElement | null)[]>([]);
  // The turn on screen. While the brain drives, it is the brain's turn plus
  // `offset`, which is fixed at the first turn after it takes over, so the
  // departments carry on from where they are.
  const shown = useRef(0);
  const offset = useRef<number | null>(null);
  const driven = useRef(false);
  const own = useRef<{ start(): void; stop(): void } | null>(null);
  // Refs only, so one function serves every render and both hooks below.
  const place = useRef((turn: number, t: number) => {
    shown.current = turn;
    paint(nodes.current, captions.current, turn, t);
  });

  useImperativeHandle(
    ref,
    () => ({
      drive(on) {
        if (on === driven.current) return;
        driven.current = on;
        offset.current = null;
        if (on) own.current?.stop();
        else own.current?.start();
      },
      setTurn(turn) {
        if (!driven.current) return;
        offset.current ??= shown.current - turn;
        place.current(offset.current + turn, performance.now() / 1000);
      },
    }),
    [],
  );

  // The orbit's own clock. Off under reduced motion, off screen, and in a
  // hidden tab; handed to the brain while the live scene is up.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rate = (2 * Math.PI) / LAP_S;
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let wanted = true;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      place.current(shown.current + rate * dt, now / 1000);
    };
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (wanted && !driven.current && onScreen && !document.hidden) {
        raf = requestAnimationFrame(tick);
      }
    };
    own.current = {
      start() {
        wanted = true;
        sync();
      },
      stop() {
        wanted = false;
        sync();
      },
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      own.current = null;
    };
  }, []);

  return (
    <div ref={rootRef} className="zo-root font-hero-mono">
      {/* The path, drawn once: a fine warm-grey line. Unit coordinates in a
          box that CSS sizes to the loop's radii, so it scales with them. */}
      <svg
        className="zo-loop"
        viewBox="-1.25 -1.25 2.5 2.5"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d={PATH} />
      </svg>

      <ul className="zo-nodes" aria-hidden="true">
        {DEPARTMENTS.map((d, i) => (
          <li
            key={d.number}
            ref={(el) => {
              nodes.current[i] = el;
            }}
            className="zo-node"
            data-hero={`dept-${d.number}`}
            style={vars(placeAt(i, N, 0, 0))}
          >
            <span className="zo-dot" />
            <span className="zo-words">
              <span className="zo-num">{d.number}</span>
              <span className="zo-label">{d.label.toUpperCase()}</span>
              <span className="zo-role">
                {d.role}
                <span className="zo-role-on">{d.role}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>

      {/* Phones only (index.css): with no room for the labels round the loop,
          one caption under it names the department at the focus, and
          cross-fades as the next one arrives. */}
      <div className="zo-readout" aria-hidden="true">
        {DEPARTMENTS.map((d, i) => (
          <p
            key={d.number}
            ref={(el) => {
              captions.current[i] = el;
            }}
            style={{ opacity: placeAt(i, N, 0, 0).act }}
          >
            <span className="zo-readout-name">
              {d.number} {d.label.toUpperCase()}
            </span>
            <span className="zo-readout-role">{d.role}</span>
          </p>
        ))}
      </div>

      <ul className="sr-only">
        {DEPARTMENTS.map((d) => (
          <li key={d.number}>{`${d.number} ${d.label}, ${d.role}`}</li>
        ))}
      </ul>
    </div>
  );
});

export default DepartmentOrbit;
