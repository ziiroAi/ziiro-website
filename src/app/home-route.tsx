import { lazy, type ComponentType } from "react";

/**
 * (C) `/` stays a lazy route, so no other page downloads the funnel. On `/`, main.tsx waits for
 * this chunk before React mounts (preloadHome). createRoot throws the prerendered DOM away at its
 * first commit (spec §13.9: hydrateRoot comes in phase 3), so a Suspense fallback there would
 * blank the prerendered greeting until the chunk arrived.
 */
const loadHome = () => import("@/pages/Index");
const LazyHome = lazy(loadHome);
let loadedHome: ComponentType | null = null;

export async function preloadHome(): Promise<void> {
  loadedHome = (await loadHome()).default;
}

export function HomeRoute() {
  const Home = loadedHome ?? LazyHome;
  return <Home />;
}
