// (C) INTERIM look values (W14-C §5), aimed at r17 by eye from its description: black titanium in light mode,
// satin silver in dark, one orange ring per disc gap. worker-3's look-dev (W14-B) replaces this file with its
// $BUS/funnel/spine3d/look.ts. Plain data only, so the worker and the main thread read the same values.
import type { Theme } from "../data/contract";
import type { Framing } from "./camera";
import type { MeshSize } from "./rules";

export type { Framing };

export interface ThemeLook {
  body: { color: string; metalness: number; roughness: number; envIntensity: number };
  ring: { color: string; strength: number };
  key: { color: string; intensity: number; position: readonly [number, number, number] };
  hemi: { sky: string; ground: string; intensity: number };
  exposure: number;
}

export interface RingShape {
  /** Ring radius as a share of the body radius at the gap. */
  radiusScale: number;
  /** Ring tube radius as a share of the gap's height. */
  tubeScale: number;
  minTube: number;
}

export interface SpineLook {
  themes: Readonly<Record<Theme, ThemeLook>>;
  framing: Readonly<Record<MeshSize, Framing>>;
  ring: RingShape;
  /** The model's yaw at rest, radians: glTF front is the lateral view (owner-tripo-spine-models). */
  restYaw: number;
}

export const LOOK: SpineLook = {
  themes: {
    light: {
      body: { color: "#1d1e21", metalness: 1, roughness: 0.32, envIntensity: 1.1 },
      ring: { color: "#ff5a14", strength: 2.2 },
      key: { color: "#ffffff", intensity: 2.2, position: [1.5, 2, 2.5] },
      hemi: { sky: "#ffffff", ground: "#8a8f99", intensity: 0.6 },
      exposure: 1,
    },
    dark: {
      body: { color: "#c7ccd4", metalness: 1, roughness: 0.42, envIntensity: 0.9 },
      ring: { color: "#ff5a14", strength: 2.6 },
      key: { color: "#dfe7f5", intensity: 1.8, position: [1.5, 2, 2.5] },
      hemi: { sky: "#9fb2cc", ground: "#20242c", intensity: 0.5 },
      exposure: 1,
    },
  },
  framing: {
    // Matched to the r17 hero still: G05 at 28.7 % and G03 at 50.2 % down, the column about 76 % across (§6.7).
    desktop: { fovDeg: 22, visibleHeight: 1.07, centreY: 0.399, columnX: 0.765 },
    // The phone band: about four discs, centred.
    phone: { fovDeg: 22, visibleHeight: 0.52, centreY: 0.5, columnX: 0.5 },
  },
  ring: { radiusScale: 0.985, tubeScale: 0.42, minTube: 0.0035 },
  restYaw: 0,
};
