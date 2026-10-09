/**
 * (C) The live spine's look (wave 14, W14-B): every value the real-time viewer needs, as plain data.
 * It aims at r17, the path-traced still the owner approved on 7 Oct (funnel/proto/look/A/r17-*).
 * No three.js imports: the viewer maps these onto its own objects. Colours are linear RGB, 0-1.
 * Coordinates are the glTF model space of owner-spine-full-clean.glb (Y up). worker-2's meshes keep it:
 * their node transform undoes the quantisation.
 */

import { PAGE_RGB, baseForPage } from "./page-match";

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Theme = "light" | "dark";

/** A Blender camera, converted: position and target in model space, roll about the line of sight. */
export interface CameraLook {
  position: Vec3;
  target: Vec3;
  rollDeg: number;         // after lookAt with world up +Y, turn the camera about its line of sight by this
  lensMm: number;
  sensorMm: number;        // across the frame's longer side (Blender's sensor fit "auto")
  /** The frame the lens and shift belong to, in px. The viewer sets aspect = full[0] / full[1]. */
  full: Vec2;
  /** Blender's lens shift, in units of full's longer side: +x moves the frame right, +y moves it up. */
  shift: Vec2;
  /** The part of the full frame on screen: [x, y, w, h] px, origin top left (three's setViewOffset). */
  view: readonly [number, number, number, number];
}

export interface EnvPanel {
  dir: Vec3;               // from the model towards the panel, model space (the camera stays put, the model turns)
  size: Vec2;              // width, height at distance 6
  colour: Vec3;
  intensity: number;
}

export interface ThemeLook {
  background: {
    base: Vec3;            // the page colour, drawn in the canvas so bloom and edges blend with it. W15-A: worked out
                           // backwards through the tone mapping (page-match.ts), so it comes out as the page exactly
    vignette: number;      // 0-1, darkening towards the corners. W15-A: 0, or the edges sit darker than the page
    shaft: { from: Vec2; to: Vec2; width: number; colour: Vec3; intensity: number } | null;  // screen fractions
    bokeh: { count: number; seed: number; size: Vec2; colour: Vec3; intensity: number } | null;
  };
  body: {
    colour: Vec3;
    metalness: number;
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    normalScale: number;   // his normal map (panel lines, cracks)
    envIntensity: number;
  };
  /** His painted disc mask (the GLB's emissive texture) as a weak warm fill, scaled by the disc level. */
  maskFill: { colour: Vec3; intensity: number };
  env: {
    top: Vec3;
    horizon: Vec3;
    bottom: Vec3;
    panels: readonly EnvPanel[];
    blur: number;          // PMREM sigma
  };
  lights: {
    ambient: { colour: Vec3; intensity: number };
    key: { dir: Vec3; colour: Vec3; intensity: number };
    rim: { dir: Vec3; colour: Vec3; intensity: number };
  };
  ring: {
    edge: Vec3;            // the band's top and bottom edge
    mid: Vec3;
    core: Vec3;            // the hot centre line
    intensity: number;     // HDR multiplier before tone mapping
    /** The gap's light leaking onto the neighbouring metal (emission on the body, falling off with the distance to the
     *  gap's rim band; Gaussian, lambda = distanceK x body radius along the column, 2.5x outwards), times the disc level. It keeps the 9 positions alive at side angles. */
    spill: { colour: Vec3; intensity: number; distanceK: number };
  };
  toneMapping: "neutral" | "aces" | "agx";
  exposure: number;        // light 1, dark 0.95 (W15-C3): dark mode comes from the materials and the world; exposure only trims the glare
  bloom: { strength: number; radius: number; threshold: number };
}

export interface Gap {
  centre: Vec3;
  normal: Vec3;            // unit, up the column
  radius: number;          // body radius at the gap
  width: number;           // gap height along the normal
  grooveRadius: number;
}

/** Each theme's exposure, shared with its page-matched background, which divides it out (W15-S). */
const LIGHT_EXPOSURE = 1;
const DARK_EXPOSURE = 0.95;  // W15-C3: dark mode comes from the materials and the world; exposure only trims the glare

export const LOOK = {
  version: "w15c-1",
  source: "r17 (proto/look/A/r17-settings-{light,dark}.json, camera A/r13-cam-fit.json)",

  /** D28: the plan's discs light fully; every other disc keeps 12 % of its glow (ring, spill and mask fill). */
  discLevels: { lit: 1, quiet: 0.12 },

  /** The column, for turning: spin about axis through pivot (the gaps' fitted line). Yaw is free, pitch is the
   *  viewer's own clamp. Spinning about the column's own axis keeps it from wobbling: it leans 17 degrees back. */
  model: { pivot: [0.01907, 0.51183, -0.0066] as Vec3, axis: [-0.0033, 0.95847, -0.28518] as Vec3 },

  /** r17's camera (Blender (x, y, z) -> model (x, z, -y)). desktop: the landscape hero, 16:9. phone: the band
   *  under 600 px, a 1290 x 2796 portrait frame with a 68 mm lens, cropped to rows 282-1634 (1170 x 1230 shipped). */
  camera: {
    desktop: {
      position: [-0.23997, 0.2119, 1.59776], target: [0, 0.46554, 0], rollDeg: -3.3982,
      lensMm: 34.3189, sensorMm: 36, full: [1920, 1080], shift: [-0.23458, -0.01783], view: [0, 0, 1920, 1080],
    } as CameraLook,
    phone: {
      position: [-0.23997, 0.2119, 1.59776], target: [0, 0.46554, 0], rollDeg: -3.3982,
      lensMm: 68, sensorMm: 36, full: [1290, 2796], shift: [-0.05395, -0.0393], view: [0, 282, 1290, 1356],
    } as CameraLook,
  },

  ring: {
    radiusK: 1.04,         // the band's radius as a share of the groove radius: just proud of the groove
    heightK: 2.2,          // its height as a share of the gap width; the rims hide what overflows
    segments: 128,
    /** Glow by facing: a full ring, brightest where it faces the camera, so it reads as r17's camera-side arc at
     *  every angle as the model turns. base is the share left at the sides. */
    facingPower: 0.8,
    facingBase: 0.3,
    coreSharpness: 6,     // how thin the hot centre line is
    /** The disc's own face as a second emissive: brightest at its camera-side rim (r17's wide crescent). 0 = off. */
    capK: 0.5,
    capRadiusK: 0.94,     // its radius as a share of the body radius at the gap
  },

  themes: {
    light: {
      background: { base: baseForPage(PAGE_RGB.light, LIGHT_EXPOSURE), vignette: 0, shaft: null, bokeh: null },
      body: {
        colour: [0.06, 0.06, 0.062], metalness: 0.85, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.4,
        normalScale: 0.6, envIntensity: 0.7,
      },
      maskFill: { colour: [1, 0.25, 0.02], intensity: 0.8 },
      env: {
        top: [0.9, 0.9, 0.9], horizon: [0.45, 0.45, 0.45], bottom: [0.08, 0.08, 0.08],
        panels: [
          { dir: [-0.6, 0.55, 0.6], size: [3, 1.2], colour: [1, 1, 1], intensity: 6 },
          { dir: [0.8, 0.2, 0.3], size: [0.8, 5], colour: [1, 1, 1], intensity: 4 },
          { dir: [0, 1, 0], size: [4, 4], colour: [1, 1, 1], intensity: 1.5 },
        ],
        blur: 0.02,
      },
      lights: {
        ambient: { colour: [1, 1, 1], intensity: 0.2 },
        key: { dir: [-0.6, 0.7, 0.5], colour: [1, 1, 1], intensity: 0.1 },
        rim: { dir: [0.7, 0.3, -0.6], colour: [1, 1, 1], intensity: 0.1 },
      },
      ring: {
        edge: [1, 0.12, 0.004], mid: [1, 0.26, 0.015], core: [1, 0.42, 0.1], intensity: 4,
        spill: { colour: [1, 0.3, 0.03], intensity: 1.2, distanceK: 0.2 },
      },
      toneMapping: "neutral", exposure: LIGHT_EXPOSURE,
      // W15-A: 2, over the page-matched background (luminance 1.87), so the page itself never blooms; the rings sit far above
      bloom: { strength: 0.45, radius: 0.3, threshold: 2 },
    } as ThemeLook,
    dark: {
      background: {
        base: baseForPage(PAGE_RGB.dark, DARK_EXPOSURE), vignette: 0,
        shaft: { from: [0.12, -0.05], to: [0.62, 0.62], width: 0.16, colour: [0.25, 0.32, 0.55], intensity: 0.12 },
        bokeh: { count: 22, seed: 7, size: [0.006, 0.022], colour: [0.45, 0.55, 0.9], intensity: 0.08 },
      },
      /** W15-C3 (owner: "faded and bad", "the light is so bright"): glossy bronze-black metal, like the light theme's
       *  body and the owner's close-up GLB, in place of the washed light silver. */
      body: {
        colour: [0.13, 0.08, 0.05], metalness: 0.9, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.25,
        normalScale: 0.7, envIntensity: 1.1,
      },
      maskFill: { colour: [0.5, 0.65, 1], intensity: 0.8 },
      env: {
        top: [0.35, 0.4, 0.52], horizon: [0.09, 0.105, 0.14], bottom: [0.01, 0.012, 0.018],
        panels: [
          { dir: [-0.55, 0.6, 0.6], size: [3, 1.4], colour: [0.85, 0.9, 1], intensity: 2.2 },  // a narrow strip, not a wash
          { dir: [0.85, 0.15, -0.4], size: [0.8, 5], colour: [0.75, 0.85, 1], intensity: 1.4 },
        ],
        blur: 0.03,
      },
      lights: {
        ambient: { colour: [0.6, 0.7, 1], intensity: 0.03 },
        key: { dir: [-0.6, 0.7, 0.5], colour: [0.92, 0.95, 1], intensity: 0.25 },
        rim: { dir: [0.8, 0.2, -0.5], colour: [0.75, 0.85, 1], intensity: 0.45 },
      },
      ring: {
        edge: [0.15, 0.35, 1], mid: [0.4, 0.62, 1], core: [0.68, 0.8, 1], intensity: 5,      // still blue, softer
        spill: { colour: [0.5, 0.7, 1], intensity: 1, distanceK: 0.2 },
      },
      toneMapping: "neutral", exposure: DARK_EXPOSURE,
      bloom: { strength: 0.38, radius: 0.4, threshold: 6 },
    } as ThemeLook,
  },

  /** worker-3's full-gaps.json (funnel/proto/look/owner-models), bottom to top. Disc k is gap k. */
  gaps: [
    { centre: [0.06315, 0.05504, 0.12523], normal: [-0.30375, 0.927, -0.22001], radius: 0.07507, width: 0.008, grooveRadius: 0.05481 },
    { centre: [0.02844, 0.16972, 0.09831], normal: [-0.26114, 0.93611, -0.23559], radius: 0.07654, width: 0.016, grooveRadius: 0.05191 },
    { centre: [0.00512, 0.28931, 0.06294], normal: [-0.18226, 0.9452, -0.27088], radius: 0.07442, width: 0.011, grooveRadius: 0.04968 },
    { centre: [-0.00933, 0.39726, 0.03092], normal: [-0.09232, 0.94962, -0.29951], radius: 0.07203, width: 0.017, grooveRadius: 0.04764 },
    { centre: [-0.01194, 0.51052, -0.00342], normal: [0.00635, 0.9495, -0.31372], radius: 0.06969, width: 0.021, grooveRadius: 0.04626 },
    { centre: [-0.0067, 0.62676, -0.04044], normal: [0.09847, 0.9461, -0.30855], radius: 0.06746, width: 0.023, grooveRadius: 0.04311 },
    { centre: [0.00961, 0.74395, -0.07737], normal: [0.168, 0.94221, -0.28987], radius: 0.06471, width: 0.023, grooveRadius: 0.03962 },
    { centre: [0.0332, 0.8607, -0.11352], normal: [0.20192, 0.9403, -0.27399], radius: 0.06221, width: 0.03, grooveRadius: 0.0386 },
    { centre: [0.06006, 0.95322, -0.14201], normal: [0.1956, 0.93995, -0.27969], radius: 0.06149, width: 0.016, grooveRadius: 0.03961 },
  ] as readonly Gap[],
} as const;
