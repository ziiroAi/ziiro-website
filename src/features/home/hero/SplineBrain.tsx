import { useEffect, useRef, useState } from "react";

// Type-only: erased at build time, so the runtime stays out of the entry chunk.
// The value comes in through the dynamic import below, in its own lazy chunk.
import type { Application } from "@splinetool/runtime";

import { SPLINE_BRAIN_SCENE } from "@/shared/lib/spline-brain";

import type { BrainPose } from "./brainMotion";
import { FIBRE_REACH } from "./orbit/loop";

/*
 * The live 3D brain, drawn by Spline into the hero stage's brain box, over the
 * still of the same pose (HeroBrain). Which scene it is, and its credit, are in
 * shared/lib/spline-brain.ts. It does not move itself: HeroBrain's clock turns
 * it through the handle passed to `onReady`, and moves the department orbit
 * by the same turn.
 */

/** What HeroBrain drives. */
export interface BrainScene {
  setPose(pose: BrainPose): void;
  /** Resume or pause the scene's own rendering (off screen, hidden tab). */
  play(): void;
  stop(): void;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * When the scene may load at all. Anything else keeps the still, which is the
 * fallback in every case and the only thing in the prerendered HTML:
 * - no URL;
 * - below lg, where ~700 KB of runtime plus a GPU context is a bad trade on a
 *   phone, and the brain is a small stacked image;
 * - no WebGL.
 * Reduced motion does load it: the brain stands still (no auto-turn), but it
 * can still be turned by hand.
 */
function mayLoad(): boolean {
  return (
    SPLINE_BRAIN_SCENE !== "" &&
    window.matchMedia("(min-width: 1024px)").matches &&
    hasWebGL()
  );
}

/**
 * Where the brain sits. Set through the runtime by scaling and moving the
 * scene's `Brain` group, because `setZoom` does not move this export's camera.
 *
 * The canvas is the brain box (index.css, `.cb-stage__brain`): centred on the
 * department loop and FIBRE_REACH of its radii to each side, which is as far
 * as the fibres may show before they would meet a department. The brain is
 * centred in it, BRAIN_HALF of the loop's radius to each side, so the fibres
 * wrap it the way the scene's preview has them and fade out (index.css) just
 * inside the loop.
 *
 * Measured for THIS export (6F-9Io7GmyXhEfJl). Re-measure if the scene changes.
 * - The camera is orthographic: 3.09px per unit at any canvas size, looking at
 *   (-7.59, 47.01), which lands on the canvas's centre.
 * - The brain is 340px wide per unit of group scale, whichever way it faces.
 *   The group's origin, the pivot it turns about, is low in the brain: the
 *   cerebrum's centre sits 106px per unit above it, the bounding box's centre
 *   (stem included) 78.4. `liftPx` centres the brain between the two, which is
 *   also where the fibre cage is centred, so the brain and its fibres sit in
 *   the middle of the loop together.
 */
/** Half the brain's width, in the loop's across-radius. The scene's fibre
 *  cage is about twice the brain's width, so at this size the whole cage, not
 *  just its middle, fits inside the fade: the strands read as the preview's
 *  loops round the brain rather than as cut hairs across it. */
const BRAIN_HALF = 0.45;
const FRAME = {
  /** Half the brain's width, as a fraction of the canvas's width. */
  half: BRAIN_HALF / (2 * FIBRE_REACH),
  halfPx: 170,
  liftPx: 92,
  zoom: 3.09,
  look: { x: -7.59, y: 47.01 },
};

/** The brain mesh's own centre sits 3.84 across and -4.72 deep of the group's
 *  origin, so it turned off-axis, swinging about ±17px a lap in a 460px square.
 *  Moving the mesh by the opposite puts its centre on the axis. */
const MODEL_CENTRE = { x: 3.84, z: -4.72 };

function frame(app: Application, width: number) {
  const brain = app.findObjectByName("Brain");
  if (!brain || width === 0) return;
  const s = (FRAME.half * width) / FRAME.halfPx;
  brain.scale.x = brain.scale.y = brain.scale.z = s;
  // Centred on the canvas: the look point, less the lift, since the pivot is
  // liftPx x s below the brain's middle. Screen y runs down, world y up.
  brain.position.x = FRAME.look.x;
  brain.position.y = FRAME.look.y - (FRAME.liftPx * s) / FRAME.zoom;
}

/** The runtime internals used below. None are public API, so every use is
 *  optional-chained: a runtime that renames one loses that one adjustment,
 *  never the scene. */
interface RuntimeInternals {
  _renderer?: { pipeline?: { setWatermark?: (texture: null) => void } };
  eventManager?: {
    handlers?: {
      LookAt?: { disconnect?: () => void };
      Start?: {
        eventsPerObject?: Map<
          { name?: string },
          { actions?: { Transition?: { pause?: () => void }[] } }[]
        >;
      };
    };
  };
}

/** The fibre cage: the fine dark strands the scene wraps round the brain
 *  (see quietScene). */
const FIBRES = true;

/**
 * Switch off what the export does by itself, so the only motion is ours.
 * - A LookAt event turns the whole brain toward the cursor, and it fights the
 *   drag.
 * - A Start event swings the brain mesh 42° and back over 40s. That is why it
 *   only ever showed one side, and it would pull the brain away from the orbit.
 * - The fibre cage stays, with its own Start animation (the strands slowly
 *   twisting), as a deliberate layer round the brain. The strands are cloned
 *   onto the brain mesh, so they take its scale and its visibility, and their
 *   size against the brain is the scene's. `FIBRES` hides them.
 * - The "Built with Spline" badge: the human's explicit decision to remove it.
 *   A free-plan export ships it and the runtime draws it into the canvas;
 *   Spline's free plan expects it to stay, and a paid-plan re-export drops it
 *   officially, at which point this line does nothing.
 */
function quietScene(app: Application) {
  const internals = app as unknown as RuntimeInternals;
  internals._renderer?.pipeline?.setWatermark?.(null);
  const handlers = internals.eventManager?.handlers;
  handlers?.LookAt?.disconnect?.();
  handlers?.Start?.eventsPerObject?.forEach((events, object) => {
    if (object.name === "Ellipse" && FIBRES) return;
    for (const event of events)
      for (const transition of event.actions?.Transition ?? []) transition.pause?.();
  });
  const fibres = app.findObjectByName("Ellipse");
  if (fibres) fibres.visible = FIBRES;
}

/** After the hero's entrance timeline (~1.8s) has played. */
const START_AFTER_MS = 1900;

/** `onReady` must be stable (a useCallback in the parent): it is an effect
 *  dependency, and a new identity would tear the scene down and reload it. */
export default function SplineBrain({ onReady }: { onReady: (scene: BrainScene) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mayLoad()) return;

    let cancelled = false;
    let app: Application | null = null;
    let resize: ResizeObserver | null = null;
    let idleId = 0;

    const start = async () => {
      try {
        const { Application } = await import("@splinetool/runtime");
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        // `none`: never layer the scene's own HTML over the hero. `webgl`: the
        // pipeline this was tuned and checked on. Left to itself the runtime
        // picks WebGPU wherever the browser offers it: a second pipeline, in a
        // second 430 KB chunk, that this was never checked on.
        app = new Application(canvas, { htmlContentMode: "none", renderer: "webgl" });
        await app.load(SPLINE_BRAIN_SCENE);
        if (cancelled) return;
        const loaded = app;
        // Opaque, in the page's own white: the glass refracts whatever the
        // scene clears to. Cleared to transparent it samples black and the
        // brain turns a heavy grey (mean luminance 129, against ~202 on white,
        // the clear glass of the preview). The brain is the stage's bottom
        // layer, on the same white, so it reads as no background at all.
        loaded.setBackgroundColor("#FFFFFF");
        quietScene(loaded);
        const brain = loaded.findObjectByName("Brain");
        if (!brain) return;
        const model = loaded.findObjectByName("Model");
        if (model) {
          model.position.x = MODEL_CENTRE.x;
          model.position.z = MODEL_CENTRE.z;
        }
        frame(loaded, canvas.clientWidth);
        resize = new ResizeObserver(() => frame(loaded, canvas.clientWidth));
        resize.observe(canvas);
        setReady(true);
        onReady({
          setPose({ yaw, pitch }) {
            if (cancelled) return;
            brain.rotation.y = yaw;
            brain.rotation.x = pitch;
            loaded.requestRender();
          },
          play: () => loaded.play(),
          stop: () => loaded.stop(),
        });
      } catch {
        // Any failure leaves the still in place, which is already correct.
      }
    };

    // The runtime must never compete with the first paint or the LCP image.
    // Wait for the entrance, then for the browser to be idle.
    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => void start(), { timeout: 2000 });
      } else {
        void start();
      }
    }, START_AFTER_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleId) window.cancelIdleCallback(idleId);
      resize?.disconnect();
      app?.dispose();
    };
  }, [onReady]);

  if (!SPLINE_BRAIN_SCENE) return null;

  // Same box as the still, so swapping one for the other cannot shift
  // anything. It fades in over 700ms while the still fades out: see
  // [data-live] in index.css. The box is a wrapper because the runtime sizes
  // the canvas to its parent with inline styles, which would override any
  // size set on the canvas itself.
  return (
    <div aria-hidden="true" className="glass-brain-canvas-box hidden lg:block">
      <canvas ref={canvasRef} className="glass-brain-canvas" style={{ opacity: ready ? 1 : 0 }} />
    </div>
  );
}
