import { useRef, type CSSProperties } from "react";
import { Helmet } from "react-helmet-async";

// The brain is the live Spline glass brain, over a still of itself
// (HeroBrain). It replaced an orange raster lifted from the reference picture.
import HeroBrain, { BRAIN_STILL_AVIF_SRCSET, BRAIN_STILL_SIZES } from "../HeroBrain";
import DepartmentOrbit, { type OrbitHandle } from "../orbit";
import { BRAIN_BOX, BRAIN_HALF } from "../brainFrame";
import { EXTENT } from "../orbit/loop";

/**
 * The loop's and the brain's measurements, published once for the CSS, which
 * sizes the loop (`--loop-a` in index.css) so that the departments and their
 * labels always fit round it, and the brain box inside it. loop.ts and
 * brainFrame.ts stay the one source: change them and the sizing follows.
 */
const LOOP_VARS = {
  "--reach-l": EXTENT.left.toFixed(4),
  "--reach-r": EXTENT.right.toFixed(4),
  "--reach-up": EXTENT.up.toFixed(4),
  "--reach-dn": EXTENT.down.toFixed(4),
  "--brain-half": String(BRAIN_HALF),
  "--brain-box": String(BRAIN_BOX),
} as CSSProperties;

/**
 * The hero's picture: the glass brain, with its fibres, the eight departments
 * travelling round it on an uneven loop, and the string web running through
 * them, out across the hero.
 *
 * index.css (`.cb-stage`) makes this box the band under the bar, the full
 * width, on desktop, with the brain placed in the room right of the copy; and
 * a band under the copy when the hero stacks. Everything inside is placed
 * from the loop's radii and the brain's centre, so the brain, the departments
 * and the web scale together.
 *
 * ONE CLOCK. The brain's turn moves the departments and the web (HeroBrain
 * drives the orbit through its handle); without the live brain the orbit
 * keeps its own clock at the same pace.
 *
 * The stage is decoration to a screen reader, with one exception: the eight
 * departments and their roles, a visually hidden list DepartmentOrbit renders
 * itself. That is why this root is NOT `aria-hidden`. An aria-hidden ancestor
 * cannot be undone further down, so it would silence that list too. Instead
 * each drawing hides itself: HeroBrain and the orbit's drawing carry their own
 * `aria-hidden`.
 */
export default function HeroStage({ className = "" }: { className?: string }) {
  const orbitRef = useRef<OrbitHandle>(null);

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
      <div data-hero="stage" className={`cb-stage ${className}`} style={LOOP_VARS}>
        {/* The brain is the one layer that never fades in. It is usually the
            page's LCP element, and an element held at opacity 0 until the
            entrance timeline runs cannot paint as LCP before hydration. The
            orbit rises in over it. */}
        <div data-hero="brain" className="cb-stage__brain">
          <HeroBrain orbitRef={orbitRef} />
        </div>
        <div data-hero-stage-fade className="cb-stage__orbit">
          <DepartmentOrbit ref={orbitRef} />
        </div>
      </div>
    </>
  );
}
