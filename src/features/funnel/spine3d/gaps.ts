// (C) The owner's 9 disc gaps, copied from funnel/proto/look/owner-models/full-gaps.json: glTF model space of his
// full spine (Y up, model units), bottom first, so index i is disc G0i (contract.ts DISCS). The glow rings sit on
// these, and the placeholder mesh is built between them until the crunched mesh lands (W14-A).

export interface Gap {
  readonly centre: readonly [number, number, number];
  /** Unit vector up the column. */
  readonly normal: readonly [number, number, number];
  /** Body radius at the gap. */
  readonly radius: number;
  /** Gap height along the normal. */
  readonly width: number;
  readonly grooveRadius: number;
}

export const GAPS: readonly Gap[] = [
  { centre: [0.06315, 0.05504, 0.12523], normal: [-0.30375, 0.927, -0.22001], radius: 0.07507, width: 0.008, grooveRadius: 0.05481 },
  { centre: [0.02844, 0.16972, 0.09831], normal: [-0.26114, 0.93611, -0.23559], radius: 0.07654, width: 0.016, grooveRadius: 0.05191 },
  { centre: [0.00512, 0.28931, 0.06294], normal: [-0.18226, 0.9452, -0.27088], radius: 0.07442, width: 0.011, grooveRadius: 0.04968 },
  { centre: [-0.00933, 0.39726, 0.03092], normal: [-0.09232, 0.94962, -0.29951], radius: 0.07203, width: 0.017, grooveRadius: 0.04764 },
  { centre: [-0.01194, 0.51052, -0.00342], normal: [0.00635, 0.9495, -0.31372], radius: 0.06969, width: 0.021, grooveRadius: 0.04626 },
  { centre: [-0.0067, 0.62676, -0.04044], normal: [0.09847, 0.9461, -0.30855], radius: 0.06746, width: 0.023, grooveRadius: 0.04311 },
  { centre: [0.00961, 0.74395, -0.07737], normal: [0.168, 0.94221, -0.28987], radius: 0.06471, width: 0.023, grooveRadius: 0.03962 },
  { centre: [0.0332, 0.8607, -0.11352], normal: [0.20192, 0.9403, -0.27399], radius: 0.06221, width: 0.03, grooveRadius: 0.0386 },
  { centre: [0.06006, 0.95322, -0.14201], normal: [0.1956, 0.93995, -0.27969], radius: 0.06149, width: 0.016, grooveRadius: 0.03961 },
];
