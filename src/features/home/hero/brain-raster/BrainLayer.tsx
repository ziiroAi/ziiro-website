import { useEffect, useRef } from "react";
import "./brain-raster.css";

/**
 * The homepage brain: a raster lifted from the owner's hero reference picture.
 *
 * The left hemisphere was cropped around the core C, the UI drawn over it
 * (core disc, tick halo, dotted satellite ring) was removed, and the hidden
 * half is that hemisphere rotated 180 deg about C. A mirror would show a
 * Rorschach fold at every angle but 0 while it turns; a rotation keeps the
 * fibres radial and has no fold axis. It was upscaled x2 (EDSR) and refit as
 * ONE colour, cobalt rgb(0, 55, 251), at per-pixel opacity: the reference
 * brain is a single hue, and the refit changes the composite over white by
 * 0.3/255 on average. Pipeline: ./tools/build_brain_raster.py.
 *
 * Fills its parent box, whose centre is C (HeroStage sizes it 860 stage units
 * square). Rotates anticlockwise in CSS; pauses when `paused`, offscreen, in a
 * hidden tab, and under reduced motion (see brain-raster.css).
 *
 * It is usually the page's LCP element, and that is allowed: rather than
 * dodging the heuristic it is built to arrive fast. It is in the prerendered
 * HTML, not lazy, fetchpriority high, with explicit dimensions, and HeroStage
 * preloads the AVIF. It has no `decoding="async"`: that hint lets the browser
 * present a frame without the image, which is the opposite of what the LCP
 * image wants. Browsers with AVIF get the 1720px file (80 KB, sharp at DPR 2
 * at full stage size); the rest get the 860px WebP (90 KB).
 */

export const BRAIN_RASTER_AVIF = "/media/hero/brain-raster-1720.avif";
const BRAIN_RASTER_WEBP = "/media/hero/brain-raster-860.webp";

/** React 18 has no `fetchPriority` prop and warns on the camelCase form; the
 *  lowercase attribute passes straight through to the DOM (and to SSR). */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

interface BrainLayerProps {
  className?: string;
  paused?: boolean;
}

export default function BrainLayer({ className, paused = false }: BrainLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Its own offscreen / hidden-tab guarantee, on top of HeroStage's `paused`.
  // Attributes rather than state: nothing here needs a re-render.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const flag = (name: string, on: boolean) => {
      if (on) el.setAttribute(name, "");
      else el.removeAttribute(name);
    };
    const onVisibility = () => flag("data-tab-hidden", document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => flag("data-offscreen", !entry.isIntersecting));
      io.observe(el);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={className ? `brain-raster ${className}` : "brain-raster"}
      data-paused={paused ? "" : undefined}
      aria-hidden="true"
    >
      <div className="brain-raster-spin">
        <picture>
          <source type="image/avif" srcSet={BRAIN_RASTER_AVIF} />
          <img
            src={BRAIN_RASTER_WEBP}
            alt=""
            width={860}
            height={860}
            draggable={false}
            {...HIGH_PRIORITY}
          />
        </picture>
      </div>
    </div>
  );
}
