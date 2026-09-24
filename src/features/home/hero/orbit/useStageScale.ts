import { useEffect, useState, type RefObject } from "react";

/**
 * The size of one stage unit, `s` (CSS px per su), for the orbit and the core.
 *
 * CSS gets it first. The stage publishes `--s` as a LENGTH (index.css, per
 * layout), and a scale() needs a NUMBER. `tan(atan2(len, 1px))` divides one
 * length by another, but only reliably once `len` is a plain px value: WebKit
 * resolves `vw` wrongly inside atan2 (3.22 where 1.80 is right, at 390), while
 * a registered `<length>` property computes to absolute px first and then
 * divides exactly in Chromium and WebKit alike (0.555215 at 390). So the server
 * HTML, the first client render and a visit with JavaScript off all carry the
 * exact `s`, from `--s` itself.
 *
 * JavaScript follows as the fallback for engines without registered properties
 * or trig functions: once the element has been measured, the caller writes the
 * measured `s` inline over the CSS value. It returns `null` until then, and the
 * callers emit nothing for it, so the server and the first client render agree.
 */

const LENGTH = "--zo-len";

/** The registration that makes `--zo-len` compute to px. It is global, so it
 *  ships once, in ORBIT_CSS; CoreDisc mounts beside the orbit in HeroStage
 *  and relies on it. */
export const STAGE_LENGTH_PROPERTY = `@property ${LENGTH}{syntax:'<length>';inherits:true;initial-value:1px}`;

/** CSS that declares `--<name>: s` (a number) on `selector`, from `--s`. */
export function stageScaleCss(selector: string, name: string): string {
  return `${selector}{${LENGTH}:var(--s, 1px);--${name}:tan(atan2(var(${LENGTH}), 1px))}`;
}

export function useStageScale(
  ref: RefObject<Element>,
  /** The element's width in su: the stage (STAGE_W) or the core box (124). */
  widthSu: number,
): number | null {
  const [s, setS] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width <= 0) return;
      // Round so sub-pixel resize noise does not re-render every frame.
      setS(Math.round((width / widthSu) * 1e5) / 1e5);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, widthSu]);

  return s;
}
