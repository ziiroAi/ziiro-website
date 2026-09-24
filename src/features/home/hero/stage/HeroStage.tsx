import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";

// The brain is the live Spline glass brain, over a still of itself
// (HeroBrain). It replaced an orange raster lifted from the reference picture.
import HeroBrain, { BRAIN_STILL_AVIF_SRCSET, BRAIN_STILL_SIZES } from "../HeroBrain";
import DepartmentOrbit, { CoreDisc } from "../orbit";
import { CORE, STAGE_W } from "../orbit/geometry";

/**
 * The stage's width and the core's position in stage units, published once
 * for the CSS. The stage box is sized from `--stage-w`, and the brain box
 * (860 su, centred on the core) and the core disc's box (124 su, the CoreDisc
 * viewBox) are placed from `--core-x` / `--core-y` in index.css. So geometry.ts
 * stays the one source: changing STAGE_W or CORE there moves the box, the
 * brain and the disc with the threads and rings.
 */
const STAGE_VARS = {
  "--stage-w": STAGE_W,
  "--core-x": CORE.x,
  "--core-y": CORE.y,
} as CSSProperties;

/**
 * The right-hand half of the hero: the brain, the department orbit and the
 * core.
 *
 * Everything inside draws in stage units. The box is STAGE_W x 844 of them
 * (677 x 844): the reference's own stage (y 83-927, from x 860) widened 25 su
 * to the right so its right edge can sit on the screen's. The CSS in index.css
 * (`.cb-stage`) pins that edge to the viewport's right edge in every layout,
 * and sets `--s`, the size of one unit: one reference pixel on desktop, a
 * fraction of the phone width when the hero stacks.
 *
 * THREE LAYERS, AND ONLY TWO OF THEM ARE CLIPPED. The brain and the orbit sit
 * inside `.cb-stage__clip`, which cuts them at the stage edges. That is what
 * slices the brain flat at the screen's right edge and lets departments fade
 * out behind the top and bottom rules. The core disc is the exception: its box
 * runs 12 su past the edge (its ring stays ~7 su inside), so it lives outside
 * the clip, and only its faint outer halo is lost off screen, to the hero's
 * own `overflow-x: clip`. Inside the clip, the halo would be cut flat.
 *
 * The stage is decoration to a screen reader, with one exception: the eight
 * departments and their roles, a visually hidden list DepartmentOrbit renders
 * itself. That is why this root is NOT `aria-hidden`. An aria-hidden ancestor
 * cannot be undone further down, so it would silence that list too. Instead
 * each drawing hides itself: HeroBrain, the orbit's SVG and CoreDisc all
 * carry their own `aria-hidden`.
 */
export default function HeroStage({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  // The orbit's box, for HeroBrain: while the live brain is up, the orbit's
  // clock is the brain's turn.
  const orbitRef = useRef<HTMLDivElement>(null);
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
      {/* The homepage's preload. It goes through Helmet rather than
          index.html so that it ships on this page only: the prerender
          collects Helmet per route, and the template is shared by every route,
          none of which uses the file. The brain is usually the page's LCP
          element, so its image is fetched at high priority ahead of the
          parser reaching it. `type` makes a browser without AVIF skip it;
          that one takes the WebP from HeroBrain's <picture> instead. (The h1
          is Helvetica now, a local face, so there is no font to preload.)
          `fetchPriority` is camelCase because Helmet writes attribute names
          as given and HTML reads them case-insensitively. */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          type="image/avif"
          imageSrcSet={BRAIN_STILL_AVIF_SRCSET}
          imageSizes={BRAIN_STILL_SIZES}
          fetchPriority="high"
        />
      </Helmet>
      <div
        ref={rootRef}
        data-hero="stage"
        data-paused={paused ? "true" : "false"}
        className={`cb-stage ${className}`}
        style={STAGE_VARS}
      >
        <div className="cb-stage__clip">
          {/* The brain is the one layer that never fades in. It is usually the
              page's LCP element, and an element held at opacity 0 until the
              entrance timeline runs cannot paint as LCP before hydration. The
              orbit and core still rise in over it. */}
          <div data-hero="brain" className="cb-stage__brain">
            <HeroBrain orbitRef={orbitRef} />
          </div>
          <div ref={orbitRef} data-hero-stage-fade className="cb-stage__orbit">
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
