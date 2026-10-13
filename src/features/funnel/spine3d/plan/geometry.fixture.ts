// (C) Test data: the disc gaps and r17's cameras as look.ts (W14-B, version w14b-1) gives them, glTF model space,
// bottom disc first. The modules take geometry as input, so the viewer passes look.ts's own values in part 2.
import type { CameraLook, DiscGeometry } from "./targets";

export const GAPS: readonly DiscGeometry[] = [
  { centre: [0.06315, 0.05504, 0.12523], normal: [-0.30375, 0.927, -0.22001], grooveRadius: 0.05481 },
  { centre: [0.02844, 0.16972, 0.09831], normal: [-0.26114, 0.93611, -0.23559], grooveRadius: 0.05191 },
  { centre: [0.00512, 0.28931, 0.06294], normal: [-0.18226, 0.9452, -0.27088], grooveRadius: 0.04968 },
  { centre: [-0.00933, 0.39726, 0.03092], normal: [-0.09232, 0.94962, -0.29951], grooveRadius: 0.04764 },
  { centre: [-0.01194, 0.51052, -0.00342], normal: [0.00635, 0.9495, -0.31372], grooveRadius: 0.04626 },
  { centre: [-0.0067, 0.62676, -0.04044], normal: [0.09847, 0.9461, -0.30855], grooveRadius: 0.04311 },
  { centre: [0.00961, 0.74395, -0.07737], normal: [0.168, 0.94221, -0.28987], grooveRadius: 0.03962 },
  { centre: [0.0332, 0.8607, -0.11352], normal: [0.20192, 0.9403, -0.27399], grooveRadius: 0.0386 },
  { centre: [0.06006, 0.95322, -0.14201], normal: [0.1956, 0.93995, -0.27969], grooveRadius: 0.03961 },
];

export const HERO_DESKTOP: CameraLook = {
  position: [-0.23997, 0.2119, 1.59776], target: [0, 0.46554, 0], rollDeg: -3.3982,
  lensMm: 34.3189, sensorMm: 36, full: [1920, 1080],
};

export const HERO_PHONE: CameraLook = {
  position: [-0.23997, 0.2119, 1.59776], target: [0, 0.46554, 0], rollDeg: -3.3982,
  lensMm: 68, sensorMm: 36, full: [1290, 2796],
};
