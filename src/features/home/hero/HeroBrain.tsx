import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { createBrainMotion } from "./brainMotion";
import { PERIOD_S, SATELLITE_PERIOD_S } from "./orbit/motion";
import SplineBrain, { type BrainScene } from "./SplineBrain";

/**
 * The hero's brain: the Spline glass brain, as HeroStage's brain layer.
 *
 * It fills the stage's brain box (`.cb-stage__brain`, 860 stage units square,
 * centred on the core) and draws the brain centred on the core, 480 su across,
 * so its far half runs off the page, with its dark fibres wrapped round it
 * inside the orbit's rings.
 *
 * - The still. A render of the scene at the start pose, on white. It is in the
 *   prerendered HTML and usually the page's LCP element, so it is treated the
 *   way the orange raster it replaces was: no `decoding="async"`, high fetch
 *   priority, and a preload in HeroStage. It is what a phone, a browser
 *   without WebGL, or a failed load keeps.
 * - The live scene (SplineBrain). From lg up it loads after the entrance, then
 *   crossfades in over the still at the same pose.
 *
 * ONE CLOCK. brainMotion turns the live brain, and the department orbit
 * follows the same turn: one full turn of the brain is one full cycle of the
 * departments (the orbit's own 40s), so the auto-turn keeps the orbit's pace,
 * and dragging the brain by an eighth of a turn moves every department on one
 * place, forwards or back. The orbit is CSS animations; while the live brain
 * is up they are paused and scrubbed from the turn (see orbitClock). Without
 * the live brain, and under reduced motion, the orbit runs, or rests, exactly
 * as HeroStage built it.
 *
 * To re-render the still after a scene or pose change: render the scene the
 * way SplineBrain sets it up, fibres and all, at START_YAW, into a canvas
 * 552 x 860 su at 1.0584px per su (a 1920 x 1080 stage) at 2x, on white and
 * without the badge. Save it at 1168px wide and at 700px, as AVIF at quality
 * 60 and WebP at 80. Below AVIF 60 the finest strands start to break up.
 */

/** The start pose: the brain turned three-quarters toward the page, in the
 *  scene's own frame, where 0 shows its back. The still is rendered at exactly
 *  this angle. */
const START_YAW = (190 * Math.PI) / 180;

const STILL_AVIF_SRCSET = "/media/hero-brain-700.avif 700w, /media/hero-brain.avif 1168w";
const STILL_WEBP_SRCSET = "/media/hero-brain-700.webp 700w, /media/hero-brain.webp 1168w";
/** The still is 552 su wide: 36vw beside the copy (the stage unit is at most
 *  1/1536 of the width), and about 85vw stacked. */
const STILL_SIZES = "(min-width: 1024px) 36vw, 85vw";

/** For HeroStage's preload: the same files and sizes, so the preload is the
 *  request the <img> makes. Strings, because react-refresh only lets a
 *  component file export primitives alongside the component. */
export const BRAIN_STILL_AVIF_SRCSET = STILL_AVIF_SRCSET;
export const BRAIN_STILL_SIZES = STILL_SIZES;

/** React 18 has no `fetchPriority` prop and warns on the camelCase form; the
 *  lowercase attribute passes straight through to the DOM and to SSR. */
const HIGH_PRIORITY = { fetchpriority: "high" } as Record<string, string>;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * The orbit's CSS animations, driven by the brain's turn instead of the page's
 * clock. Every one of them is paused and set to the same time each frame, so
 * the choreography HeroStage built (the flow, the focus beat, the readout, the
 * satellites' drift) plays exactly as designed, only scrubbed.
 *
 * Its time is taken up where the orbit already is, so the handover shows no
 * jump, and wrapped over the loops' common period (the 40s cycle and the
 * satellites' 120s drift) so it never runs negative when the brain is dragged
 * backwards.
 */
function orbitClock(orbit: HTMLElement | null, startTurn: number) {
  const wrapMs = ((PERIOD_S * SATELLITE_PERIOD_S) / gcd(PERIOD_S, SATELLITE_PERIOD_S)) * 1000;
  const radPerMs = (2 * Math.PI) / (PERIOD_S * 1000);
  let animations: Animation[] = [];
  let t0: number | null = null;
  let frames = 0;

  const take = () => {
    animations = orbit ? orbit.getAnimations({ subtree: true }) : [];
    for (const a of animations) a.pause();
    if (t0 === null && animations.length) t0 = Number(animations[0].currentTime ?? 0);
  };

  return {
    take,
    follow(turn: number) {
      // Pick up any animation started since (a layout change can restart
      // one), about twice a second.
      if (++frames % 30 === 0) take();
      if (t0 === null) return;
      const t = t0 + (turn - startTurn) / radPerMs;
      const at = wrapMs + (((t % wrapMs) + wrapMs) % wrapMs);
      for (const a of animations) a.currentTime = at;
    },
    /** Back to the page's clock, from wherever the orbit is. */
    release() {
      for (const a of animations) a.play();
      animations = [];
    },
  };
}

export default function HeroBrain({ orbitRef }: { orbitRef?: RefObject<HTMLElement> }) {
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

    const orbit = orbitClock(
      orbitRef?.current?.querySelector<HTMLElement>(".zo-root") ?? null,
      START_YAW,
    );
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
      lapS: PERIOD_S,
      // The orbit is already flowing when the brain arrives, and it now
      // follows the brain: easing in from rest would stall it.
      startMoving: true,
      animate,
      onFrame(pose) {
        scene.setPose(pose);
        orbit.follow(pose.turn);
        settle();
      },
    });
    scene.setPose({ yaw: START_YAW, pitch: 0, turn: START_YAW });

    // Run only while it can be seen: the stage on screen, the tab visible,
    // the desktop layout. Off screen the orbit waits paused where it is, as
    // HeroStage would have it; below lg it goes back to its own clock.
    let onScreen = true;
    const wide = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (onScreen && !document.hidden && wide.matches) {
        orbit.take();
        scene.play();
        motion.start();
        settle();
      } else {
        motion.stop();
        scene.stop();
        if (!wide.matches) orbit.release();
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
      orbit.release();
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
          height={1820}
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
