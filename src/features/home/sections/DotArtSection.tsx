import { lazy, Suspense } from "react";

const DotArt3D = lazy(() => import("@/ogl/DotArt3D"));

export default function DotArtSection() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <DotArt3D />
    </Suspense>
  );
}
