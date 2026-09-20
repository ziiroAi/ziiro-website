import { useCallback, useEffect, useRef } from "react";
import { createSpring, type SteppableSpring } from "@/shared/motion/spring";

/**
 * Magnet tabs: the indicator is sprung to the selected tab and pulled toward
 * the pointer while it is over the strip.
 *
 * STATE. This component is controlled and holds none of its own. Products
 * already has one piece of state for "which stage is current", which the Beam
 * and the self-qualification list both read, so the tabs drive that rather
 * than keeping a second copy that could disagree with it.
 *
 * APPLE RULES THIS IS BUILT AGAINST.
 *   - Pointer DOWN selects, not click, so the feedback starts with the press.
 *   - The indicator is a spring, so it animates from wherever it currently is.
 *     Sweep the pointer across the strip and the indicator is dragged along by
 *     the magnet, and a selection mid-sweep is picked up from the position it
 *     had reached rather than restarting from the tab it left.
 *   - Critically damped, no overshoot. Nothing here is a flick.
 *   - Reduced motion gets the gentler equivalent rather than nothing: the
 *     indicator still moves and still marks the selection, it simply places
 *     itself instantly and the magnet is off.
 *
 * KEYBOARD. A real tablist. Arrows move between tabs, Home and End jump to the
 * ends, and every tab is reachable and operable without a pointer.
 */

/** How far the indicator may be dragged off its tab by the pointer, in px. */
const MAGNET_RANGE = 14;

export interface MagnetTab {
  id: string;
  label: string;
}

interface MagnetTabsProps {
  tabs: MagnetTab[];
  /** Index of the selected tab. */
  value: number;
  onChange: (index: number) => void;
  /** id of the panel each tab controls, for aria-controls. */
  panelId?: (index: number) => string;
  className?: string;
  "aria-label"?: string;
}

export default function MagnetTabs({
  tabs,
  value,
  onChange,
  panelId,
  className,
  "aria-label": ariaLabel,
}: MagnetTabsProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const x = useRef<SteppableSpring | null>(null);
  const w = useRef<SteppableSpring | null>(null);
  const frame = useRef(0);
  const pointerX = useRef<number | null>(null);
  const reduced = useRef(false);

  /** Where the indicator wants to be: the selected tab, pulled toward the
   *  pointer by up to MAGNET_RANGE. The pull is proportional to how far the
   *  pointer is from the tab's centre, so it eases off rather than snapping. */
  const restingTarget = useCallback(() => {
    const el = tabRefs.current[value];
    const strip = stripRef.current;
    if (!el || !strip) return null;
    const left = el.offsetLeft;
    const width = el.offsetWidth;
    if (reduced.current || pointerX.current === null) return { left, width };
    const centre = left + width / 2;
    const dx = pointerX.current - centre;
    const pull = Math.max(-1, Math.min(1, dx / (width * 1.5))) * MAGNET_RANGE;
    return { left: left + pull, width };
  }, [value]);

  // Place the indicator, then keep it placed through resizes and font loads.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = tabRefs.current[value];
    if (!el) return;
    x.current = createSpring(el.offsetLeft) as SteppableSpring;
    w.current = createSpring(el.offsetWidth) as SteppableSpring;
    const paint = () => {
      const node = indicatorRef.current;
      if (!node || !x.current || !w.current) return;
      node.style.transform = `translate3d(${x.current.value}px, 0, 0)`;
      node.style.width = `${w.current.value}px`;
    };
    paint();

    const strip = stripRef.current;
    const onResize = () => {
      const active = tabRefs.current[value];
      if (!active || !x.current || !w.current) return;
      x.current.jumpTo(active.offsetLeft);
      w.current.jumpTo(active.offsetWidth);
      paint();
    };
    const observer = strip ? new ResizeObserver(onResize) : null;
    if (strip && observer) observer.observe(strip);
    return () => observer?.disconnect();
    // Placement only depends on the element refs, which do not change after
    // mount; `value` is followed by the spring loop below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One rAF loop, running only while the springs still have somewhere to go.
  const tick = useCallback(() => {
    const node = indicatorRef.current;
    const sx = x.current;
    const sw = w.current;
    if (!node || !sx || !sw) return;
    let last = performance.now();
    const run = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const target = restingTarget();
      if (target) {
        sx.setTarget(target.left);
        sw.setTarget(target.width);
      }
      sx.step(dt);
      sw.step(dt);
      node.style.transform = `translate3d(${sx.value}px, 0, 0)`;
      node.style.width = `${sw.value}px`;
      if (!sx.settled || !sw.settled) {
        frame.current = requestAnimationFrame(run);
      } else {
        frame.current = 0;
      }
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(run);
  }, [restingTarget]);

  // Selection changed: retarget. Under reduced motion, place it with no travel.
  useEffect(() => {
    const el = tabRefs.current[value];
    if (!el || !x.current || !w.current) return;
    if (reduced.current) {
      x.current.jumpTo(el.offsetLeft);
      w.current.jumpTo(el.offsetWidth);
      const node = indicatorRef.current;
      if (node) {
        node.style.transform = `translate3d(${el.offsetLeft}px, 0, 0)`;
        node.style.width = `${el.offsetWidth}px`;
      }
      return;
    }
    tick();
  }, [value, tick]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced.current) return;
    const strip = stripRef.current;
    if (!strip) return;
    pointerX.current = e.clientX - strip.getBoundingClientRect().left;
    tick();
  };

  const onPointerLeave = () => {
    if (reduced.current) return;
    pointerX.current = null;
    tick();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = value === last ? 0 : value + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = value === 0 ? last : value - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label={ariaLabel}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onKeyDown={onKeyDown}
      className={`relative inline-flex flex-wrap items-center gap-1 rounded-full border border-[var(--border)] p-1 ${className ?? ""}`}
    >
      {/* The moving mark. Sits under the labels, painted by the spring loop
          rather than by a class, and hidden from assistive tech because
          aria-selected on the tab already carries the same information. */}
      <span
        ref={indicatorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1 -z-0 h-[calc(100%-0.5rem)] rounded-full bg-[var(--text-primary)]"
        style={{ transform: "translate3d(0,0,0)", width: 0 }}
      />
      {tabs.map((tab, i) => {
        const selected = i === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[i] = node;
            }}
            type="button"
            role="tab"
            id={`magnet-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={panelId?.(i)}
            tabIndex={selected ? 0 : -1}
            // Pointer down, not click: the press is when the reader committed,
            // and waiting for release makes the strip feel slow.
            onPointerDown={() => onChange(i)}
            // Keyboard activation still arrives as a click with no pointer
            // type, and selecting twice is idempotent.
            onClick={() => onChange(i)}
            className={`relative z-10 rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] ${
              selected ? "text-[var(--background)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
