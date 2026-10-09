// (C) W15-M6: the meshes' addresses on their own, so the funnel can warm one without loading the viewer's code.
import type { MeshSize } from "./rules";

/** W14-A's crunched meshes: 1.5 MB or less on a phone, 3 MB or less on desktop. /spine is cached immutable for a
 *  year (vercel.json, tests/media/immutable.json), so a re-crunched mesh goes in a new folder: m2, m3… */
export const MESH_URLS: Readonly<Record<MeshSize, string>> = {
  phone: "/spine/3d/m1/spine-phone.glb",
  desktop: "/spine/3d/m1/spine-desktop.glb",
};
