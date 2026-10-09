// (C) W16-A: the owner's close-up model (three vertebrae, his own textures), which the plan's stage dives into from
// the full spine. worker-3 placed it in LOOK space on the full spine's vertebra 4 (W16-C step 1, closeup-look.json
// "w16c-1"), so it overlaps the full spine's middle and the two can crossfade in place. Plain numbers.
import type { Gap, Vec3 } from "./look";

export interface CloseupLook {
  /** Maps the GLB's model space into LOOK space; column-major, for Matrix4.fromArray on a parent of gltf.scene. */
  matrix: readonly number[];
  /** The middle vertebra's centre, where the camera aims. */
  pivot: Vec3;
  /** Up its column. */
  axis: Vec3;
  /** Its three disc gaps, bottom first (G0 is a thin sliver, mostly out of frame), for the glowing rings. */
  gaps: readonly Gap[];
}

/** Its bands' height as a share of each gap's width (worker-3, W16-C step 3): its gaps are 3-6x taller than the full
 *  spine's, so the full spine's share made solid drums. */
export const CLOSEUP_RING_HEIGHT_K = 0.25;

export const CLOSEUP: CloseupLook = {
  matrix: [
    0.5450681, -0.0027418, -0.0013452, 0,
    0.0030148, 0.5213525, 0.1590328, 0,
    0.0004868, -0.159038, 0.5213591, 0,
    -0.1058385, 0.1493099, -0.0232646, 1,
  ],
  pivot: [-0.01063, 0.45389, 0.01375],
  axis: [-0.02204, 0.95675, -0.29008],
  gaps: [
    { centre: [0.03889, 0.13584, 0.10384], normal: [-0.15412, 0.98539, -0.07252], radius: 0.07172, width: 0.0109, grooveRadius: 0.06535 },
    { centre: [-0.00899, 0.34366, 0.0488], normal: [-0.08104, 0.9496, -0.30281], radius: 0.0708, width: 0.05124, grooveRadius: 0.06431 },
    { centre: [-0.00925, 0.56465, -0.0207], normal: [0.03703, 0.96036, -0.27629], radius: 0.07372, width: 0.05178, grooveRadius: 0.06029 },
  ],
};

/** Its gaps for makeRings, which sizes every band by the full spine's `heightK`: each width is scaled so its band
 *  comes out CLOSEUP_RING_HEIGHT_K of the real width tall. */
export const closeupRingGaps = (heightK: number): Gap[] =>
  CLOSEUP.gaps.map((gap) => ({ ...gap, width: (gap.width * CLOSEUP_RING_HEIGHT_K) / heightK }));
