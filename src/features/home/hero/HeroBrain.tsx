import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { createBrainMotion } from "./brainMotion";
import DepartmentRing, { RING_RX, RING_RY, type DepartmentRingHandle } from "./DepartmentRing";
import SplineBrain, { type BrainScene } from "./SplineBrain";

/**
 * The hero's object: a glass brain in a sphere of fibres, with the seven
 * departments on a ring around it.
 *
 * Three states, one square, so moving between them shifts nothing:
 * - The still. A render of the Spline scene at the start pose, on white. It is
 *   what the prerendered HTML shows and what a phone, a browser without
 *   WebGL, or a failed load keeps.
 * - The live scene (SplineBrain). From lg up it loads after the entrance, then
 *   crossfades in over the still at the same pose.
 * - The ring (DepartmentRing), over both.
 *
 * One clock (brainMotion) turns the live brain and the ring in the same
 * animation frame, so they cannot drift apart. It runs only while it can be
 * seen: the hero on screen, the tab visible, the desktop layout. Until the
 * live scene is up, nothing turns, because the still cannot.
 *
 * Size lives in index.css under `[data-brain-stage]`: `--stage` is the square.
 * Beside the copy it is solved from the column's width, so the department
 * labels at the ring's sides stay inside the page at every desktop width.
 *
 * To re-render the still after a scene or pose change, render the scene the
 * way SplineBrain sets it up, at START_YAW, into a 598px canvas (the canvas of
 * a 460px square) at 2x, on white and without the badge. Then save it as AVIF
 * and WebP at quality 80, at 1196px and at 800px for phones. Lower qualities
 * break up the faint strands.
 */

/** The start pose: a three-quarter view of the front of the brain, turned
 *  toward the copy. In the scene's own frame, where 0 shows the back. The
 *  still is rendered at exactly this angle. */
const START_YAW = (190 * Math.PI) / 180;

/** The still covers the canvas, 1.3 squares across: up to 598px beside the
 *  copy, and at most 390px stacked (index.css). Two widths for its srcset. */
const STILL = { width: 1196, height: 1196 };
const SIZES = "(min-width: 1024px) 598px, min(calc(130vw - 125px), 390px)";

export default function HeroBrain() {
  const stageRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<DepartmentRingHandle>(null);
  const holdRef = useRef<(on: boolean) => void>(() => {});
  // The live scene's handle. Null wherever the scene declines to load (below
  // lg, no WebGL, no URL, a failed load), so the still is the hero there.
  const [scene, setScene] = useState<BrainScene | null>(null);
  const onReady = useCallback((s: BrainScene) => setScene(s), []);
  const onHold = useCallback((on: boolean) => holdRef.current(on), []);

  useEffect(() => {
    const stage = stageRef.current;
    const surface = surfaceRef.current;
    if (!scene || !stage || !surface) return;

    const motion = createBrainMotion({
      surface,
      stage,
      startYaw: START_YAW,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onFrame(pose) {
        scene.setPose(pose);
        ringRef.current?.update(pose.yaw);
      },
    });
    scene.setPose({ yaw: START_YAW, pitch: 0 });
    holdRef.current = motion.hold;

    let onScreen = true;
    const wide = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (onScreen && !document.hidden && wide.matches) {
        scene.play();
        motion.start();
      } else {
        motion.stop();
        scene.stop();
      }
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(stage);
    document.addEventListener("visibilitychange", sync);
    wide.addEventListener("change", sync);
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      wide.removeEventListener("change", sync);
      motion.dispose();
      holdRef.current = () => {};
    };
  }, [scene]);

  return (
    <div
      ref={stageRef}
      data-hero-reveal
      data-hero-orb
      data-brain-stage
      data-live={scene ? "" : undefined}
      className="select-none"
      style={{ "--ring-rx": RING_RX, "--ring-ry": RING_RY } as CSSProperties}
    >
      <div className="brain-square">
        <picture className="contents">
          <source
            type="image/avif"
            srcSet="/media/hero-brain-800.avif 800w, /media/hero-brain.avif 1196w"
            sizes={SIZES}
          />
          <img
            src="/media/hero-brain.webp"
            srcSet="/media/hero-brain-800.webp 800w, /media/hero-brain.webp 1196w"
            sizes={SIZES}
            width={STILL.width}
            height={STILL.height}
            alt=""
            decoding="async"
            draggable={false}
            className="brain-still"
          />
        </picture>
        <SplineBrain onReady={onReady} />
        {/* The brain's hit area, over the fibre sphere. Only once the live
            scene is up: the still cannot be turned. */}
        {scene && <div ref={surfaceRef} aria-hidden="true" className="brain-drag" />}
      </div>
      <DepartmentRing ref={ringRef} startYaw={START_YAW} onHold={onHold} />
    </div>
  );
}
