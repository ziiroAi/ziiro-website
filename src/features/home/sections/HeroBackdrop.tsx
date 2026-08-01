import { lazy, Suspense, useEffect, useRef, useState } from "react";

const CinematicParticles = lazy(() => import("@/ogl/CinematicParticles"));

/**
 * The starfield behind the hero.
 *
 * CinematicParticles is a fixed, full-viewport field whose particles stretch
 * as page scroll advances. Left running down the whole page that stretch turns
 * into long spiral trails that crossed the content sections and competed with
 * the headlines. So the field is kept for the hero, where it reads as a
 * starfield, and faded out over the first viewport: past the fold the content
 * sits on a clean background.
 *
 * The GL loop is also unmounted once it's fully faded, so nothing renders
 * offscreen for the remaining ten-plus screens of page.
 */
export default function HeroBackdrop() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const fadeOver = window.innerHeight * 0.9;
        const t = Math.min(1, window.scrollY / fadeOver);
        const opacity = 1 - t;
        if (wrapRef.current) wrapRef.current.style.opacity = String(opacity);
        // Drop the renderer entirely once it can no longer be seen.
        setPast(opacity <= 0.01);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // A continuously animating particle field is exactly what this preference
  // asks us not to render, and it is purely decorative here.
  if (reduced || past) return null;

  return (
    <div ref={wrapRef} className="pointer-events-none" style={{ opacity: 1 }}>
      <Suspense fallback={null}>
        <CinematicParticles />
      </Suspense>
    </div>
  );
}
