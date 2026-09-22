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
 * Lossless WebP because the focal nodes are a few saturated pixels, and lossy
 * WebP's chroma subsampling smears exactly those.
 *
 * The box is the orb's footprint, to the pixel: the orb was `--orb` square plus
 * a 22% margin reserved for its bloom, so it took 1.22x `--orb` of height in
 * the column. Every spacing figure measured against the hero (phone CTA
 * bottoms, the navbar clearance) was measured with that footprint, so keeping
 * it means none of them move. Width follows from the image's aspect ratio.
 *
 * `data-hero-orb` is kept so Hero's entrance timeline brings the brain in
 * exactly as it brought the orb in, and `data-hero-reveal` keeps the
 * crawler-safe hiding rule in index.css in charge of the first paint.
 *
 * To swap in a new render, replace public/media/hero-half-brain.webp and update
 * WIDTH and HEIGHT to its pixel size, so the browser reserves the right box
 * before the file arrives. The file is the render cropped to its visible
 * pixels, then downscaled to about twice the tallest display height (537px).
 * Downscale with premultiplied alpha: the glow keeps saturated blue under
 * near-zero alpha, and a straight-alpha resampler bleeds it into the edges.
 * Pillow's RGBA resize already premultiplies.
 */
const WIDTH = 614;
const HEIGHT = 1074;

export default function HalfBrain() {
  return (
    <div
      data-hero-reveal
      data-hero-orb
      aria-hidden="true"
      className="pointer-events-none shrink-0 select-none"
      style={{
        height: "calc(min(clamp(240px, 34vw, 440px), calc(100svh - 300px)) * 1.22)",
      }}
    >
      <img
        src="/media/hero-half-brain.webp"
        width={WIDTH}
        height={HEIGHT}
        alt=""
        decoding="async"
        draggable={false}
        className="block h-full w-auto"
      />
    </div>
  );
}
