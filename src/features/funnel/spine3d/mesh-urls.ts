// (C) W15-M6: the meshes' addresses on their own, so the funnel can warm one without loading the viewer's code.
import type { MeshSize } from "./rules";

/** The full spine's crunched meshes: 1.5 MB or less on a phone, 3 MB or less on desktop. /spine is cached immutable
 *  for a year (vercel.json, tests/media/immutable.json), so a re-crunched mesh goes in a new folder. m3 is worker-3's
 *  mended m1 (W16-C: 31 holes closed, his bone blade cut) with the orange smears taken out of its base colour (W16-C2).
 *  m4 is m3 with the close-up's machined black-titanium finish baked onto its own UVs (W17-M): metal 0.92, roughness
 *  0.12, machining marks, scratches, speckle; look.ts body.maps makes the viewer read these maps.
 *  m5 is the owner's own Tripo "Futuristic Coil" (W19): his mesh and PBR maps, his painted disc glow moved out of the
 *  base colour into the emissive disc mask, the base colour darkened as he asked, placed on m4's column. */
export const MESH_URLS: Readonly<Record<MeshSize, string>> = {
  phone: "/spine/3d/m5/spine-phone.glb",
  desktop: "/spine/3d/m5/spine-desktop.glb",
};

/** W15-M6: every mesh the plan's 3D loads, in the order it needs them; the funnel downloads them during the
 *  questions (plan-warm.ts). W17-S: the big spine only; the close-up's files stay in public/ (immutable cache), unused. */
export const PLAN_MESHES: readonly Readonly<Record<MeshSize, string>>[] = [MESH_URLS];
