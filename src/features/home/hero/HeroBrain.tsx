import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { createBrainMotion } from "./brainMotion";
import { LAP_S, type OrbitHandle } from "./orbit";
import SplineBrain, { type BrainScene } from "./SplineBrain";

/**
 * The hero's brain: the Spline glass brain, as HeroStage's brain layer.
 *
 * It fills the stage's brain box (`.cb-stage__brain`, centred on the
 * department loop) and draws the brain centred in it, with the scene's fine
 * dark fibres wrapped round it, fading out just inside the loop.
 *
 * - The still. A render of the scene at the start pose, on white. It is in the
 *   prerendered HTML and usually the page's LCP element, so it is treated the
 *   way the orange raster it replaces was: no `decoding="async"`, high fetch
 *   priority, and a preload in HeroStage. It is what a phone, a browser
 *   without WebGL, or a failed load keeps.
 * - The live scene (SplineBrain). From lg up it loads after the entrance, then
 *   crossfades in over the still at the same pose.
 *
 * ONE CLOCK. brainMotion turns the live brain, and the departments follow
 * the same turn (through the orbit's handle): one full turn of the brain is
 * one lap of the departments (LAP_S, 40s), so the auto-turn keeps the orbit's
 * pace, and dragging the brain by an eighth of a turn moves every department
 * on one place, forwards or back. Without the live brain the orbit keeps its
 * own clock at the same pace; under reduced motion it rests.
 *
 * To re-render the still after a scene, pose or framing change: render the
 * scene the way SplineBrain sets it up, fibres and all, at START_YAW, into a
 * box 584 x 613 css px (the brain box at a loop radius of 584 / 1.76) at 2x,
 * so 1168 x 1226, on white and without the badge, and leave the fade to the
 * CSS. Save it at 1168px wide and at 700px, as AVIF at quality 60 and WebP at
 * 80. Below AVIF 60 the finest strands start to break up.
 */

/** The start pose: the brain turned three-quarters toward the page, in the
 *  scene's own frame, where 0 shows its back. The still is rendered at exactly
 *  this angle. */
const START_YAW = (190 * Math.PI) / 180;

const STILL_AVIF_SRCSET = "/media/hero-brain-700.avif 700w, /media/hero-brain.avif 1168w";
const STILL_WEBP_SRCSET = "/media/hero-brain-700.webp 700w, /media/hero-brain.webp 1168w";
/** The brain box's width (index.css): about 28vw beside the copy, at most
 *  440px on a stacked tablet, and about 70vw on a phone. */
const STILL_SIZES = "(min-width: 1024px) and (min-aspect-ratio: 1/1) 28vw, (min-width: 660px) 440px, 70vw";

/** For HeroStage's preload: the same files and sizes, so the preload is the
 *  request the <img> makes. Strings, because react-refresh only lets a
 *  component file export primitives alongside the component. */
export const BRAIN_STILL_AVIF_SRCSET = STILL_AVIF_SRCSET;
export const BRAIN_STILL_SIZES = STILL_SIZES;

/** React 18 has no `fetchPriority` prop and warns on the camelCase form; the
 *  lowercase attribute passes straight through to the DOM and to SSR. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

export default function HeroBrain({ orbitRef }: { orbitRef?: RefObject<OrbitHandle> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  // The live scene's handle. Null wherever the scene declines to load (below
  // lg, no WebGL, no URL, a failed load), so the still is the brain there.
  const [scene, setScene] = useState<BrainScene | null>(null);
  const onReady = useCallback((s: BrainScene) => setScene(s), []);

  useEffect(() => {
    const root = rootRef.current;
    const surface = surfaceRef.current;
    if (!scene || !root || !surface) return;

    const orbit = orbitRef?.current ?? null;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Under reduced motion nothing may move unless the visitor moves it, and
    // the glass's own material shimmers over time. So the renderer draws the
    // pose, then sleeps; a drag wakes it, and it sleeps again once the drag has
    // settled. (Time enough for its anti-aliasing to converge.)
    let sleep = 0;
    const settle = () => {
      if (animate) return;
      scene.play();
      window.clearTimeout(sleep);
      sleep = window.setTimeout(() => scene.stop(), 1200);
    };

    const motion = createBrainMotion({
      surface,
      stage: root,
      startYaw: START_YAW,
      lapS: LAP_S,
      // The orbit is already flowing when the brain arrives, and it now
      // follows the brain: easing in from rest would stall it.
      startMoving: true,
      animate,
      onFrame(pose) {
        scene.setPose(pose);
        orbit?.setTurn(pose.turn);
        settle();
      },
    });
    scene.setPose({ yaw: START_YAW, pitch: 0, turn: START_YAW });

    // Run only while it can be seen: the stage on screen, the tab visible,
    // the desktop layout. Off screen the orbit waits where it is with the
    // brain; below lg it goes back to its own clock.
    let onScreen = true;
    const wide = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (onScreen && !document.hidden && wide.matches) {
        orbit?.drive(true);
        scene.play();
        motion.start();
        settle();
      } else {
        motion.stop();
        scene.stop();
        if (!wide.matches) orbit?.drive(false);
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    wide.addEventListener("change", sync);
    sync();

    return () => {
      window.clearTimeout(sleep);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      wide.removeEventListener("change", sync);
      motion.dispose();
      orbit?.drive(false);
    };
  }, [scene, orbitRef]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="glass-brain"
      data-live={scene ? "" : undefined}
    >
      <picture className="contents">
        <source type="image/avif" srcSet={STILL_AVIF_SRCSET} sizes={STILL_SIZES} />
        <img
          src="/media/hero-brain.webp"
          srcSet={STILL_WEBP_SRCSET}
          sizes={STILL_SIZES}
          width={1168}
          height={1226}
          alt=""
          draggable={false}
          className="glass-brain-still"
          {...HIGH_PRIORITY}
        />
      </picture>
      <SplineBrain onReady={onReady} />
      {/* The brain's hit area. Only once the live scene is up: the still
          cannot be turned. */}
      {scene && <div ref={surfaceRef} className="glass-brain-drag" />}
    </div>
  );
}
