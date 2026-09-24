import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";

import { START_YAW } from "../brainFrame";
import { DEPARTMENTS } from "./departments";
import { LAP_S, placeAt, type NodePlace } from "./loop";
import { createWeb, type Rect } from "./web";

/**
 * The departments round the brain: eight navy ringed dots on an uneven loop
 * (loop.ts), each with its number, name and role beside it; and the web
 * (web.ts), drawn on a canvas under them, with the plexus on the brain.
 *
 * MOTION. Every department is placed from one number, the turn, and orbits
 * the brain continuously, one lap per turn of it; the owner's r8 mockup is
 * the frame they start from. While the live brain is up, the turn is the
 * brain's own (HeroBrain calls `follow` from its frame), so dragging the
 * brain moves the departments, the web and the plexus, which also takes the
 * brain's yaw and tilt; and on desktop the scroll turns and zooms them all
 * together (brainFrame.ts, scrollPose). Otherwise (a phone, no WebGL, before
 * the scene loads) the orbit keeps its own clock at the same pace, and the
 * plexus holds the still's pose. Each department also drifts a little in and
 * out on its own slow period. Under reduced motion it holds its start frame,
 * and moves only when the visitor turns the brain.
 *
 * THE COPY WINS. On desktop the loop passes behind the copy on its left; a
 * department fades as it nears the copy's words, dot and label each on its
 * own, and comes back past them, so nothing ever sits over the headline. As
 * the scroll zooms the brain, the labels fade out too.
 *
 * COST. A frame writes eight custom properties per department (the dots and
 * words are placed in CSS from them, index.css `.zo-*`, and nothing touches
 * layout), and redraws the web's canvas. What the web needs from the DOM, the
 * loop's size, each label's line sizes and the copy's boxes, is measured on
 * resize only; the label boxes are worked out from the same numbers the CSS
 * uses.
 *
 * The drawing is decoration to a screen reader; the one thing it says, eight
 * departments each run by an AI role, is in the visually hidden list.
 */

/** The brain's pose, as the orbit follows it. */
export interface OrbitPose {
  turn: number;
  yaw: number;
  pitch: number;
  /** The scroll's zoom (1 at rest) and label fade (0 at rest). */
  zoom?: number;
  fade?: number;
}

export interface OrbitHandle {
  /** Hand the clock to the brain (true), or take it back (false). */
  drive(on: boolean): void;
  /** While driven: the brain's pose. The departments move by as much as its
   *  turn does, from wherever they were when it took over; the plexus takes
   *  its yaw and tilt as they are. */
  follow(pose: OrbitPose): void;
}

const N = DEPARTMENTS.length;

/** The numbers a department's place is written as (index.css). */
const VARS = ["--ox", "--oy", "--gx", "--gy", "--ax", "--ay"] as const;
const values = (p: NodePlace) => [p.ox, p.oy, p.gx, p.gy, p.ax, p.ay].map((v) => v.toFixed(3));

const vars = (p: NodePlace) =>
  Object.fromEntries(VARS.map((name, k) => [name, values(p)[k]])) as CSSProperties;

/** What the web needs from the layout, in the stage's CSS pixels. */
interface Geometry {
  cx: number;
  cy: number;
  a: number;
  b: number;
  /** Each department's lines (number, name, role): width and height. */
  lines: { w: number; h: number }[][];
  /** The copy's boxes, which departments fade near (desktop only). */
  copy: Rect[];
}

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** How far apart two boxes are: the gap between them, negative if they
 *  overlap. */
const gapBetween = (a: Rect, b: Rect) =>
  Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));

/** 1 clear of every box by `far` px or more, 0 within `near` px of one. */
const clearOf = (r: Rect, boxes: Rect[], near = 6, far = 24) => {
  let o = 1;
  for (const c of boxes) o = Math.min(o, smooth((gapBetween(r, c) - near) / (far - near)));
  return o;
};

const DepartmentOrbit = forwardRef<OrbitHandle>(function DepartmentOrbit(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<(HTMLLIElement | null)[]>([]);
  const captions = useRef<(HTMLParagraphElement | null)[]>([]);
  // The turn on screen. While the brain drives, it is the brain's turn plus
  // `offset`, which is fixed at the first turn after it takes over, so the
  // departments carry on from where they are.
  const shown = useRef(0);
  const offset = useRef<number | null>(null);
  const driven = useRef(false);
  const own = useRef<{ start(): void; stop(): void } | null>(null);
  const geometry = useRef<Geometry | null>(null);
  const web = useRef<ReturnType<typeof createWeb> | null>(null);
  const lastT = useRef(0);
  // The brain's pose for the plexus, and the scroll's zoom and fade: the
  // still's pose, at rest, until the live brain drives.
  const pose = useRef({ yaw: START_YAW, pitch: 0, zoom: 1, fade: 0 });

  // Refs only, so one function serves every render and every hook below.
  const place = useRef((turn: number, t: number) => {
    shown.current = turn;
    lastT.current = t;
    const g = geometry.current;
    const { zoom, fade } = pose.current;
    const zoomFade = 1 - smooth((fade - 0.12) / 0.38);
    rootRef.current?.style.setProperty("--zoom", zoom.toFixed(4));
    const points: { x: number; y: number; theta: number }[] = [];
    const labels: Rect[] = [];
    // Where two departments' words would meet (the loop brings some close on
    // a smaller screen), the later one fades until they part.
    const placed: Rect[] = [];
    for (let i = 0; i < N; i++) {
      const p = placeAt(i, N, turn, t);
      const li = nodes.current[i];
      const cap = captions.current[i];
      if (cap) cap.style.opacity = p.act.toFixed(3);
      let dotOpacity = 1;
      let wordsOpacity = zoomFade;
      if (g) {
        // The same arithmetic as `.zo-node` and `.zo-words` in index.css.
        const x = g.cx + g.a * p.ox * zoom;
        const y = g.cy + g.b * p.oy * zoom;
        points.push({ x, y, theta: p.theta });
        const lines = g.lines[i] ?? [];
        const height = lines.reduce((sum, l) => sum + l.h, 0);
        const ox = x + p.gx;
        let top = y + p.gy + (-0.5 + 0.5 * p.ay) * height;
        const boxes: Rect[] = [];
        for (const l of lines) {
          if (l.w > 0 && l.h > 0) boxes.push({ x: ox + (-0.5 + 0.5 * p.ax) * l.w, y: top, w: l.w, h: l.h });
          top += l.h;
        }
        if (g.copy.length) {
          dotOpacity = clearOf({ x: x - 11, y: y - 11, w: 22, h: 22 }, g.copy);
          for (const b of boxes) wordsOpacity = Math.min(wordsOpacity, clearOf(b, g.copy));
          wordsOpacity = Math.min(wordsOpacity, dotOpacity);
        }
        for (const b of boxes) wordsOpacity = Math.min(wordsOpacity, clearOf(b, placed, 2, 12));
        // Only words that show keep the strands off them, and others off.
        if (wordsOpacity > 0.05) labels.push(...boxes);
        if (wordsOpacity > 0.5) placed.push(...boxes);
      }
      if (li) {
        const v = values(p);
        VARS.forEach((name, k) => li.style.setProperty(name, v[k]));
        li.style.setProperty("--do", dotOpacity.toFixed(3));
        li.style.setProperty("--lo", wordsOpacity.toFixed(3));
      }
    }
    if (g) {
      web.current?.draw({
        nodes: points,
        labels,
        t,
        yaw: pose.current.yaw,
        pitch: pose.current.pitch,
        zoom,
      });
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      drive(on) {
        if (on === driven.current) return;
        driven.current = on;
        offset.current = null;
        if (on) {
          own.current?.stop();
        } else {
          pose.current = { yaw: START_YAW, pitch: 0, zoom: 1, fade: 0 };
          own.current?.start();
        }
      },
      follow({ turn, yaw, pitch, zoom = 1, fade = 0 }) {
        if (!driven.current) return;
        offset.current ??= shown.current - turn;
        pose.current = { yaw, pitch, zoom, fade };
        place.current(offset.current + turn, performance.now() / 1000);
      },
    }),
    [],
  );

  // The web: set up once, and measured again whenever the layout changes.
  useEffect(() => {
    const root = rootRef.current;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!root || !frame || !canvas) return;
    web.current = createWeb(canvas, N);
    const desktop = window.matchMedia("(min-width: 1024px) and (min-aspect-ratio: 1/1)");
    const phone = window.matchMedia("(max-width: 659.98px)");

    const measure = () => {
      const box = root.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      if (!box.width || !f.width) return;
      const a = f.width / 2;
      const b = f.height / 2;
      const cx = f.left - box.left + f.width / 2;
      const cy = f.top - box.top + f.height / 2;
      const lines = nodes.current.map((li) =>
        li
          ? [...li.querySelectorAll<HTMLElement>(".zo-num, .zo-label, .zo-role")].map((el) => ({
              w: el.offsetWidth,
              h: el.offsetHeight,
            }))
          : [],
      );
      // On desktop the web reaches across behind the copy; keep its words
      // clear, and let the departments pass behind them.
      const column = desktop.matches ? root.closest(".cb-comp")?.querySelector(".cb-copy") : null;
      const copy: Rect[] = column
        ? [...column.children].map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
          })
        : [];
      geometry.current = { cx, cy, a, b, lines, copy };
      web.current?.resize({
        width: box.width,
        height: box.height,
        cx,
        cy,
        a,
        b,
        keepOut: copy,
        compact: phone.matches,
        sweeps: desktop.matches,
      });
      place.current(shown.current, lastT.current);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(root);
    // The copy rises 10px into place on the entrance; measure once it has.
    const settled = window.setTimeout(measure, 1400);
    void document.fonts?.ready.then(measure);
    measure();
    return () => {
      ro.disconnect();
      window.clearTimeout(settled);
      web.current = null;
    };
  }, []);

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
    <div ref={rootRef} className="zo-root font-sans">
      {/* The web: strands, dots, the plexus, the arcs. Empty until the script
          runs; the departments below are in the page from the first paint. */}
      <canvas ref={canvasRef} className="zo-web" aria-hidden="true" />
      {/* The loop's box, for measuring: its centre is the brain's and its
          half-sizes are the loop's radii. Never seen. */}
      <div ref={frameRef} className="zo-frame" aria-hidden="true" />

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
              <span className="zo-role">{d.role}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Phones only (index.css): with no room for the labels round the loop,
          one caption under it names the department at nine o'clock, and
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
