// (C) W15-M6: the meshes' addresses on their own, so the funnel can warm one without loading the viewer's code.
import type { MeshSize } from "./rules";

/** W14-A's crunched meshes: 1.5 MB or less on a phone, 3 MB or less on desktop. /spine is cached immutable for a
 *  year (vercel.json, tests/media/immutable.json), so a re-crunched mesh goes in a new folder: m2, m3… */
export const MESH_URLS: Readonly<Record<MeshSize, string>> = {
  phone: "/spine/3d/m1/spine-phone.glb",
  desktop: "/spine/3d/m1/spine-desktop.glb",
};

/** W16-C: the owner's close-up model, web-ready (worker-3, ziiroai/feat/w16c-closeup eb7ea83): phone 1.14 MB,
 *  desktop 1.96 MB. The plan dives from the full spine into it (W16-A). One copy of this constant: here. */
export const CLOSEUP_MESH_URLS: Readonly<Record<MeshSize, string>> = {
  phone: "/spine/3d/closeup/phone.glb",
  desktop: "/spine/3d/closeup/desktop.glb",
};

/** W15-M6: every mesh the plan's 3D loads, in the order it needs them; the funnel downloads them during the
 *  questions (plan-warm.ts), one after another, so the hero's full spine arrives first. */
export const PLAN_MESHES: readonly Readonly<Record<MeshSize, string>>[] = [MESH_URLS, CLOSEUP_MESH_URLS];
