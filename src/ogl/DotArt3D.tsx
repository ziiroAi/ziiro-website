import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Renderer, Camera, Transform, Geometry, Program, Mesh } from "ogl";
import { dotArtVertex, dotArtFragment } from "./dotArtShaders";
import {
  buildFormations,
  FORMATION_LABELS,
  SCENE_COUNT,
  SCENE_PULSE,
  SCENE_CLOTH,
  SCENE_BREATH,
  COLLAPSE_SEGMENT,
} from "./formations";

const SEGMENTS = SCENE_COUNT - 1; // one: sphere -> infinity
const FOV = 50;

function isMobile(): boolean {
  return window.innerWidth < 768;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

// A camera key per scene boundary, plus a spline tail. Length must stay
// SEGMENTS + 2, because camAt() treats the final key as tail rather than as a
// boundary it can land on.
// zf scales the fitted base distance; x/y are world offsets.
const CAM_KEYS = [
  { x: 0, y: 0, zf: 0.85 },   // face to face with the sphere
  { x: 0, y: 0, zf: 1.4 },    // wide on the burst universe
  { x: 0, y: 3, zf: 1.7 },    // spline tail: drifting further out
];

// Catmull-Rom through the keys: velocity stays continuous across scene
// boundaries, so the camera never stops: one uninterrupted travel.
function camAt(u: number): { x: number; y: number; zf: number } {
  const last = CAM_KEYS.length - 2; // last boundary index
  const uu = Math.max(0, Math.min(u, last - 0.0001));
  const i = Math.floor(uu);
  const t = uu - i;
  const p0 = CAM_KEYS[Math.max(i - 1, 0)];
  const p1 = CAM_KEYS[i];
  const p2 = CAM_KEYS[i + 1];
  const p3 = CAM_KEYS[Math.min(i + 2, CAM_KEYS.length - 1)];
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t);
  return {
    x: cr(p0.x, p1.x, p2.x, p3.x),
    y: cr(p0.y, p1.y, p2.y, p3.y),
    zf: cr(p0.zf, p1.zf, p2.zf, p3.zf),
  };
}

// Inherited momentum per transition segment: the direction dots ride
// while travelling, so each sculpture hands its energy to the next.
const WINDS: [number, number, number, number][] = [
  // [x, y, z, radial], one per transition. Length must equal SEGMENTS.
  [0, 0, 0, 26], // the sphere explodes into the universe
];

export default function DotArt3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [sceneIdx, setSceneIdx] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const section = sectionRef.current;
    if (!container || !section) return;

    const mobile = isMobile();
    const COUNT = mobile ? 6000 : 12000;
    const dotSize = mobile ? 1.6 : 2.2; // radius px -> diameters ~1.3-5.6px

    // --- Renderer (premultiplied pipeline for correct compositing) ---
    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas as HTMLCanvasElement);

    const camera = new Camera(gl, { fov: FOV, near: 0.1, far: 800 });
    const scene = new Transform();

    // --- Formations ---
    const formations = buildFormations(COUNT, mobile);

    // --- Billboard quad ---
    const quadVerts = new Float32Array([
      -1, -1, 1, -1, 1, 1,
      -1, -1, 1, 1, -1, 1,
    ]);

    // --- Instance buffers ---
    const fromPositions = new Float32Array(COUNT * 3);
    const toPositions = new Float32Array(COUNT * 3);
    const fromSizes = new Float32Array(COUNT);
    const toSizes = new Float32Array(COUNT);
    const fromFlows = new Float32Array(COUNT);
    const toFlows = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);

    fromPositions.set(formations[0].positions);
    toPositions.set(formations[0].positions);
    fromSizes.set(formations[0].sizes);
    toSizes.set(formations[0].sizes);
    fromFlows.set(formations[0].flows);
    toFlows.set(formations[0].flows);

    let s = 1234;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < COUNT; i++) {
      // ≈ index order (spatially coherent) with jitter, drives stagger
      seeds[i] = (i / COUNT) * 0.8 + rand() * 0.2;
    }

    const geometry = new Geometry(gl, {
      position: { size: 2, data: quadVerts },
      aFrom: { size: 3, data: fromPositions, instanced: 1 },
      aTo: { size: 3, data: toPositions, instanced: 1 },
      aSizeFrom: { size: 1, data: fromSizes, instanced: 1 },
      aSizeTo: { size: 1, data: toSizes, instanced: 1 },
      aFlowFrom: { size: 1, data: fromFlows, instanced: 1 },
      aFlowTo: { size: 1, data: toFlows, instanced: 1 },
      aSeed: { size: 1, data: seeds, instanced: 1 },
    });
    (geometry as unknown as { instancedCount: number }).instancedCount = COUNT;

    const program = new Program(gl, {
      vertex: dotArtVertex,
      fragment: dotArtFragment,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uDotSize: { value: dotSize },
        uResolution: { value: [container.clientWidth, container.clientHeight] },
        uMouse: { value: [-10, -10, 0] }, // parked off-screen until a real pointer moves
        uRipple: { value: 0 },
        uRippleOrigin: { value: [0, 0, 0] },
        uPulse: { value: 0 },
        uCloth: { value: 0 },
        uBreath: { value: 0 },
        uCollapse: { value: 0 },
        uWind: { value: [0, 0, 0] },
        uWindRadial: { value: 0 },
        uColor: { value: [0.95, 0.96, 0.98] },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.TRIANGLES });
    mesh.setParent(scene);

    // --- Camera distance that frames the artwork with margin ---
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
    let zBase = 90;

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
      program.uniforms.uResolution.value = [w, h];

      const aspect = w / h;
      const artH = 80; // world height the flat sculptures occupy
      const artW = 112;
      const fitH = (artH * 0.53) / tanHalf;
      const fitW = (artW * 0.53) / (tanHalf * aspect);
      zBase = Math.max(fitH, fitW);
    }
    resize();
    window.addEventListener("resize", resize);

    // --- Pointer ---
    let mouseX = 0.5; // parallax (neutral center default)
    let mouseY = 0.5;
    let hoverX = -10; // magnetic grow (off-screen default; touch stays off)
    let hoverY = -10;
    let rippleStrength = 0;

    function onMouseMove(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1 - (e.clientY - rect.top) / rect.height;
      hoverX = mouseX;
      hoverY = mouseY;
    }

    function onMouseLeave() {
      hoverX = -10;
      hoverY = -10;
      mouseX = 0.5;
      mouseY = 0.5;
    }

    function onClick() {
      rippleStrength = 1.0;
      program.uniforms.uRippleOrigin.value = [
        (mouseX * 2 - 1) * 45,
        (mouseY * 2 - 1) * 30,
        0,
      ];
    }

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("click", onClick);

    // --- Scroll ---
    let scrollProgress = 0;
    let scrollTarget = 0;

    function onScroll() {
      const rect = section!.getBoundingClientRect();
      const range = section!.offsetHeight - window.innerHeight;
      const raw = range > 0 ? -rect.top / range : 0;
      scrollTarget = Math.max(0, Math.min(1, raw));

      const idx = Math.max(
        0,
        Math.min(SCENE_COUNT - 1, Math.round(scrollTarget * SEGMENTS)),
      );
      setSceneIdx((prev) => (prev === idx ? prev : idx));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    scrollProgress = scrollTarget; // no fast-forward replay after reload

    // --- Formation buffer swapping ---
    let currentFrom = -1;
    let currentTo = -1;

    function updateBuffers(fromIdx: number, toIdx: number) {
      if (fromIdx === currentFrom && toIdx === currentTo) return;
      currentFrom = fromIdx;
      currentTo = toIdx;

      type Attr = { data: Float32Array; needsUpdate: boolean };
      const attrs = geometry.attributes as unknown as Record<string, Attr>;
      attrs.aFrom.data.set(formations[fromIdx].positions);
      attrs.aTo.data.set(formations[toIdx].positions);
      attrs.aSizeFrom.data.set(formations[fromIdx].sizes);
      attrs.aSizeTo.data.set(formations[toIdx].sizes);
      attrs.aFlowFrom.data.set(formations[fromIdx].flows);
      attrs.aFlowTo.data.set(formations[toIdx].flows);
      for (const k of ["aFrom", "aTo", "aSizeFrom", "aSizeTo", "aFlowFrom", "aFlowTo"]) {
        attrs[k].needsUpdate = true;
      }
    }

    // --- Animation loop ---
    let time = 0;
    let raf = 0;
    let lastInk = -1;

    function update() {
      time += 0.016;
      // Scroll only sets the destination; the world glides toward it
      scrollProgress += (scrollTarget - scrollProgress) * 0.035;

      const u = program.uniforms;
      u.uTime.value = time;
      u.uMouse.value = [hoverX, hoverY, 0];

      rippleStrength *= 0.96;
      u.uRipple.value = rippleStrength;

      // Scene segment + local progress
      const sceneFloat = scrollProgress * SEGMENTS;
      const seg = Math.max(0, Math.min(Math.floor(sceneFloat), SEGMENTS - 1));
      const t = Math.max(0, Math.min(1, sceneFloat - seg));

      updateBuffers(seg, seg + 1);

      // Wide morph window with heavy per-dot stagger: the previous shape
      // is always evolving into the next: no dead dwell, no hard cut
      const morphT = smooth01((t - 0.16) / 0.68);
      u.uMorph.value = morphT;
      u.uCollapse.value = seg === COLLAPSE_SEGMENT ? 1 : 0;

      const wind = WINDS[seg];
      u.uWind.value = [wind[0], wind[1], wind[2]];
      u.uWindRadial.value = wind[3];

      // Per-scene living effects, blended across the morph
      u.uPulse.value = lerp(SCENE_PULSE[seg], SCENE_PULSE[seg + 1], morphT);
      u.uCloth.value = lerp(SCENE_CLOTH[seg], SCENE_CLOTH[seg + 1], morphT);
      u.uBreath.value = lerp(SCENE_BREATH[seg], SCENE_BREATH[seg + 1], morphT);

      // Camera rides a spline through all boundary keys, and it never stops
      const cam = camAt(sceneFloat);
      let camX = cam.x;
      let camY = cam.y;
      // ...and keeps breathing: perpetual dolly, orbit, tilt and zoom
      const camZ = cam.zf * zBase * (1 + 0.025 * Math.sin(time * 0.09));

      camX += (mouseX - 0.5) * 2.5;
      camY += (mouseY - 0.5) * 1.5;
      camX += Math.sin(time * 0.05) * 2.0;
      camY += Math.cos(time * 0.04) * 1.2;

      camera.position.set(camX, camY, camZ);
      camera.lookAt([
        Math.sin(time * 0.045) * 2.0,
        Math.cos(time * 0.06) * 1.4,
        0,
      ]);

      // The whole cloud slowly sways: the world itself never holds still
      scene.rotation.y = Math.sin(time * 0.07) * 0.07;
      scene.rotation.x = Math.cos(time * 0.055) * 0.025;

      // The dots blend from ink to light as the story begins; the canvas
      // itself never stops. Nothing here paints a ground: this section used to
      // lay an opaque near-black over PageAtmosphere, which is fixed behind the
      // whole site, so the journey read as a flat black hole in a page that is
      // warm everywhere else. Transparent, the same duotone carries through.
      const ink = smooth01(scrollProgress / 0.035);
      if (Math.abs(ink - lastInk) > 0.005) {
        lastInk = ink;
        const c = u.uColor.value as number[];
        c[0] = lerp(0.075, 0.95, ink);
        c[1] = lerp(0.085, 0.96, ink);
        c[2] = lerp(0.12, 0.98, ink);
      }

      renderer.render({ scene, camera });
      raf = requestAnimationFrame(update);
    }

    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("click", onClick);
      if (container.contains(gl.canvas as HTMLCanvasElement)) {
        container.removeChild(gl.canvas as HTMLCanvasElement);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: "300vh" }}
    >
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Scene caption */}
        <div className="pointer-events-none absolute bottom-10 left-8 z-10 select-none md:left-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={sceneIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="font-mono text-[11px] uppercase tracking-[0.35em]"
              style={{ color: "rgba(235, 238, 245, 0.5)" }}
            >
              {String(sceneIdx + 1).padStart(2, "0")} / {FORMATION_LABELS[sceneIdx]}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
