/**
 * The hero's object: the mirrored half-brain, in place of IntelligenceOrb.
 *
 * A still image, not a scene. The brain is a rendered illustration (curve
 * facing the copy on the left, the straight cut edge on the right), so there is
 * no WebGL here and no ogl chunk to fetch.
 *
 * The asset is the TRANSPARENT render, not the white-background one. The hero
 * stands on the page's pure #FFFFFF, and the renders' own ground is a
 * near-white #FAFBFD: over white that shows as a faint grey-blue box with a
 * hard straight edge around the brain. With alpha, the page is the ground.
 *
 * Two encodes of the same 2x master (690x1440), through <picture>:
 * - AVIF 4:4:4 q80, 364 KB, which every current browser takes. Full-resolution
 *   chroma is the point: 4:2:0 smears the saturated nodes, and those few pixels
 *   are the focal points.
 * - WebP q70 with sharp YUV, 400 KB, for the rest. That is the lowest quality
 *   where the nodes' error stops improving. Its alpha is lossless because lossy
 *   alpha posterises the thin glass into flat patches.
 * The <picture> is `display: contents`, so the <img> lays out exactly as it did
 * on its own.
 *
 * Size lives in index.css under `[data-brain-scope]`, because it needs
 * breakpoints: about 720px tall beside the copy at 1440x900, a plain 92vw when
 * stacked. That rule also holds the margin that stops a box taller than the
 * column from growing the hero. Width follows from the image's aspect ratio.
 * WIDTH and HEIGHT let the browser reserve it before the file arrives.
 *
 * Three layers, each owning one thing, so no two animations fight over one
 * `transform`:
 * - the outer box is what Hero's entrance timeline scales and fades in, through
 *   `data-hero-orb`. `data-hero-reveal` keeps the crawler-safe hiding rule in
 *   index.css in charge of the first paint;
 * - the float layer drifts the whole object ±0.6% on the house 13s
 *   `hero-float` loop;
 * - the glow breathes behind the image at the core, on the house 9s
 *   `hero-glow-pulse` loop. Behind, not over: it shows through the glass and
 *   just past the cut edge, and it never tints the nodes. It is centred with the
 *   `translate` property rather than `transform`, because the loop animates
 *   `transform` and would otherwise undo the centring.
 *
 * Both loops are compositor-only and both stop under prefers-reduced-motion,
 * which index.css already handles. The glow then rests at its middle opacity.
 *
 * To swap in a new render:
 * 1. Crop it to its visible pixels.
 * 2. Downscale it to about twice the tallest display height, with
 *    premultiplied alpha. Glow stores saturated blue under near-zero alpha, and
 *    a straight-alpha resampler bleeds it into the edges. Pillow's RGBA resize
 *    already premultiplies.
 * 3. Encode both files as above.
 * 4. Update WIDTH, HEIGHT and CORE.
 *
 * This render was also cleaned before encoding. Its wash and echo contours
 * outside the curved edge were removed, and the glow it painted past the cut
 * edge was cut back to a falloff that is gone within 0.05H of the core.
 */
const WIDTH = 690;
const HEIGHT = 1440;

/** The core's nucleus in the current image, as a fraction of its box: on the
 *  cut edge at mid-height. Measured, not eyeballed. */
const CORE = { x: 0.907, y: 0.493 };

export default function HalfBrain() {
  return (
    <div
      data-hero-reveal
      data-hero-orb
      data-brain-scope
      aria-hidden="true"
      className="pointer-events-none shrink-0 select-none"
      style={{ height: "var(--brain-h)" }}
    >
      <div className="hero-float relative h-full">
        {/* Diameter 25% of the width, which is 0.12H: a soft falloff hugging the
            core rather than a patch. The first version was 63% (0.3H) and
            spilled a visible blue cloud past the cut edge. Alpha runs 0.12 at the
            centre to 0 at the rim, and the breath scales it by 0.5-0.85. */}
        <div
          className="hero-glow-pulse absolute rounded-full"
          style={{
            left: `${CORE.x * 100}%`,
            top: `${CORE.y * 100}%`,
            width: "25%",
            aspectRatio: "1",
            translate: "-50% -50%",
            opacity: 0.65,
            background:
              "radial-gradient(closest-side, rgba(51, 80, 255, 0.12) 0%, rgba(51, 80, 255, 0.05) 38%, rgba(51, 80, 255, 0.015) 70%, rgba(51, 80, 255, 0) 100%)",
          }}
        />
        <picture className="contents">
          <source type="image/avif" srcSet="/media/hero-half-brain.avif" />
          <img
            src="/media/hero-half-brain.webp"
            width={WIDTH}
            height={HEIGHT}
            alt=""
            decoding="async"
            draggable={false}
            className="relative block h-full w-auto"
          />
        </picture>
      </div>
    </div>
  );
}
