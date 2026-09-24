import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";

// The brain is a raster lifted from the reference picture and refit as one
// cobalt at per-pixel opacity.
import BrainLayer, { BRAIN_RASTER_AVIF } from "../brain-raster/BrainLayer";
import DepartmentOrbit, { CoreDisc } from "../orbit";
import { CORE } from "../orbit/geometry";

/**
 * The h1's face, Instrument Serif upright, latin subset: the file Google's css2
 * answers with for this family today. The h1 paints in a metric-matched
 * fallback first (index.css), so this only shortens the time before the real
 * face swaps in; it moves nothing. If Google bumps the versioned path, the
 * preload simply misses and the stylesheet still loads the font.
 */
const H1_FONT =
  "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjnTLgNs.woff2";

/**
 * The core's position in stage units, published once for the CSS. The brain
 * box (860 su, centred on the core) and the core disc's box (124 su, the
 * CoreDisc viewBox) are placed from these in index.css, so moving CORE in
 * geometry.ts moves the brain and the disc with the threads and rings.
 */
const CORE_VARS = { "--core-x": CORE.x, "--core-y": CORE.y } as CSSProperties;

/**
 * The right-hand half of the hero: the brain, the department orbit and the
 * core.
 *
 * Everything inside draws in stage units. The box is 652 x 844 of them, the
 * reference's own stage at x 860-1512 and y 83-927, and the CSS in index.css
 * (`.cb-stage`) sets `--s`, the size of one unit, for the current layout: one
 * reference pixel on desktop, a fraction of the phone width when the hero
 * stacks.
 *
 * THREE LAYERS, AND ONLY TWO OF THEM ARE CLIPPED. The brain and the orbit sit
 * inside `.cb-stage__clip`, which cuts them at the stage edges. That is what
 * slices the brain flat at the right rule and lets departments fade out behind
 * the top and bottom rules. The core disc is the exception: in the reference
 * it overhangs the right rule by 16px, so it lives outside the clip, above the
 * rule. Putting it inside would slice the disc flat on one side.
 *
 * The stage is decoration to a screen reader, with one exception: the eight
 * departments and their roles, a visually hidden list DepartmentOrbit renders
 * itself. That is why this root is NOT `aria-hidden`. An aria-hidden ancestor
 * cannot be undone further down, so it would silence that list too. Instead
 * each drawing hides itself: BrainLayer, the orbit's SVG and CoreDisc all
 * carry their own `aria-hidden`.
 */
export default function HeroStage({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Paused until the effect below has decided otherwise. That makes the
  // prerendered HTML, and any render without JavaScript, the static rest frame,
  // which is exactly the reference picture.
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;

    // One place decides, from three inputs: the motion preference, whether
    // any useful part of the stage is on screen, and whether the tab is.
    const decide = () => setPaused(reduced.matches || !visible || document.hidden);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.intersectionRatio > 0.1;
        decide();
      },
      { threshold: [0, 0.1, 0.25] },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", decide);
    reduced.addEventListener("change", decide);
    decide();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", decide);
      reduced.removeEventListener("change", decide);
    };
  }, []);

  return (
    <>
      {/* The homepage's two preloads. They go through Helmet rather than
          index.html so that they ship on this page only: the prerender
          collects Helmet per route, and the template is shared by every route,
          none of which uses either file.
          - The brain is usually the page's LCP element, so its image is
            fetched at high priority ahead of the parser reaching it. `type`
            makes a browser without AVIF skip it; that one takes the WebP from
            BrainLayer's <picture> instead.
          - The h1's face (see H1_FONT). Font preloads need CORS mode even
            same-origin, and Google's font host requires it.
          `fetchPriority` is camelCase because Helmet writes attribute names
          as given and HTML reads them case-insensitively. */}
      <Helmet>
        <link rel="preload" as="image" type="image/avif" href={BRAIN_RASTER_AVIF} fetchPriority="high" />
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href={H1_FONT} />
      </Helmet>
      <div
        ref={rootRef}
        data-hero="stage"
        data-paused={paused ? "true" : "false"}
        className={`cb-stage ${className}`}
        style={CORE_VARS}
      >
        <div className="cb-stage__clip">
          {/* The brain is the one layer that never fades in. It is usually the
              page's LCP element, and an element held at opacity 0 until the
              entrance timeline runs cannot paint as LCP before hydration. The
              orbit and core still rise in over it. */}
          <div data-hero="brain" className="cb-stage__brain">
            <BrainLayer paused={paused} />
          </div>
          <div data-hero-stage-fade className="cb-stage__orbit">
            <DepartmentOrbit paused={paused} />
          </div>
        </div>
        <div data-hero-stage-fade className="cb-stage__core">
          <CoreDisc />
        </div>
      </div>
    </>
  );
}
