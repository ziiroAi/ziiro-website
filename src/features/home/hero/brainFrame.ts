/**
 * How the glass brain is framed, shared by everything that has to line up
 * with it: SplineBrain (the live scene), HeroBrain (the still and the pose),
 * the web's mesh on the brain (orbit/brainMesh.ts), and the brain box in
 * index.css (published by HeroStage).
 *
 * Sizes are in the department loop's base radius, so the brain scales with
 * the loop; the brain's own measures are in its half-width.
 */

/** The start pose: the brain in side profile, as in the owner's mockup, its
 *  frontal lobe toward the copy and the stem at the bottom centre. The still
 *  is rendered at exactly this angle. */
export const START_YAW = (328 * Math.PI) / 180;

/** The brain's rest tilt: its top turned a little toward the viewer, as in
 *  the mockup. A drag tilts it from here and it settles back here. The still
 *  is rendered at this tilt too. */
export const START_PITCH = (6 * Math.PI) / 180;

/** Half the brain's width, in the loop's base radius: the mockup's
 *  proportion, the brain about half the departments' ring. */
export const BRAIN_HALF = 0.5;

/** The brain box's half-size, in the loop's base radius: the canvas and the
 *  still, centred on the loop. Room for the whole brain at any turn (at most
 *  1.05 half-widths from the centre), and at the scroll's full zoom (below). */
export const BRAIN_BOX = 0.72;

/** The brain's pivot sits this many half-widths below the centre of the
 *  brain box. Measured for this export with the fibres off: the pivot is low
 *  in the brain, and this lift centres the brain's silhouette in its box at
 *  any turn, to within 1% of its half-width. */
export const BRAIN_LIFT = 0.463;

/**
 * The scroll: as the hero scrolls away, the brain, the plexus on it, the web
 * and the departments turn together by up to SCROLL_TURN and zoom in by up to
 * SCROLL_ZOOM, scrubbed to the scroll and eased, and back again scrolling up.
 * `progress` is how far through the hero's height the page has scrolled, 0 to
 * 1; `fade` is the eased progress, which the labels fade out by as the zoom
 * carries them past.
 */
export const SCROLL_TURN = Math.PI;
export const SCROLL_ZOOM = 0.35;

export function scrollPose(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const eased = p * p * (3 - 2 * p);
  return { turn: SCROLL_TURN * eased, zoom: 1 + SCROLL_ZOOM * eased, fade: eased };
}
