import { useEffect, useRef } from "react";
import { Renderer, Camera, Transform, Geometry, Program, Mesh } from "ogl";
import { dotVertex, dotFragment } from "./shaders";

const PARTICLE_COUNT = 100000;

function smoothstep(min: number, max: number, v: number): number {
  const x = Math.max(0, Math.min(1, (v - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function CinematicParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Renderer ---
    const renderer = new Renderer({
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio, 1.5),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas as HTMLCanvasElement);

    // --- Camera ---
    const camera = new Camera(gl, { fov: 60, near: 0.5, far: 150 });
    camera.position.set(0, 0, 40);

    const scene = new Transform();

    // --- Generate particles in a volumetric sphere ---
    const offsets = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    const seeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spherical distribution with bias toward center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.4) * 50;

      offsets[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      offsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      offsets[i * 3 + 2] = r * Math.cos(phi);

      scales[i] = 0.5 + Math.random() * 1.5;
      seeds[i] = Math.random();
    }

    // Billboard quad (two triangles)
    const quadVerts = new Float32Array([
      -1, -1,
       1, -1,
       1,  1,
      -1, -1,
       1,  1,
      -1,  1,
    ]);

    const geometry = new Geometry(gl, {
      position: { size: 2, data: quadVerts },
      offset: { size: 3, data: offsets, instanced: 1 },
      aScale: { size: 1, data: scales, instanced: 1 },
      aSeed: { size: 1, data: seeds, instanced: 1 },
    });
    (geometry as any).instancedCount = PARTICLE_COUNT;

    const program = new Program(gl, {
      vertex: dotVertex,
      fragment: dotFragment,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uMorphProgress: { value: 0 },
        uFlowStrength: { value: 0 },
        uRibbonStrength: { value: 0 },
        uWaveStrength: { value: 0 },
        uTunnelStrength: { value: 0 },
        uGridStrength: { value: 0 },
        uNetworkStrength: { value: 0 },
        uSideTravel: { value: 0 },
        uGlow: { value: 0.2 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new Mesh(gl, { geometry, program, mode: gl.TRIANGLES });
    mesh.setParent(scene);

    // --- Resize ---
    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      renderer.setSize(w, h);
      camera.perspective({ aspect: w / h });
    }
    resize();
    window.addEventListener("resize", resize);

    // --- Scroll ---
    let scroll = 0;
    let scrollTarget = 0;

    function onScroll() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      scrollTarget = docH > 0 ? window.scrollY / docH : 0;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // --- Animation Loop ---
    let time = 0;
    let raf: number;

    function update() {
      time += 0.016;
      // Smooth scroll interpolation
      scroll += (scrollTarget - scroll) * 0.04;

      const s = scroll;
      const u = program.uniforms;
      u.uTime.value = time;
      u.uScroll.value = s;

      // --- Scene timeline ---
      // Scene 1 (0–0.15): Infinite cloud, camera drifts forward
      // Scene 2 (0.15–0.3): Flow field — dots organize
      // Scene 3 (0.3–0.5): Network morph — abstract business structures
      // Scene 4 (0.5–0.7): Horizontal camera travel through dot wall
      // Scene 5 (0.7–1.0): Final convergence — intelligent structure

      u.uFlowStrength.value = smoothstep(0.12, 0.25, s) * (1 - smoothstep(0.4, 0.55, s));
      u.uNetworkStrength.value = smoothstep(0.28, 0.45, s) * (1 - smoothstep(0.55, 0.7, s));
      u.uRibbonStrength.value = smoothstep(0.6, 0.75, s) * (1 - smoothstep(0.85, 0.95, s));
      u.uWaveStrength.value = smoothstep(0.85, 0.95, s);
      u.uSideTravel.value = smoothstep(0.5, 0.7, s) * (1 - smoothstep(0.7, 0.75, s));
      u.uMorphProgress.value = smoothstep(0.3, 0.5, s);
      u.uGlow.value = lerp(0.15, 0.6, smoothstep(0.4, 0.9, s));

      // --- Camera ---
      // Start: looking at the cloud from a distance
      // Mid: drift forward and orbit
      // Scene 4: dramatic sideways travel
      // End: pull back to see final structure

      let camX = 0;
      let camY = 0;
      let camZ = 40;

      // Forward drift (scene 1-2)
      camZ -= smoothstep(0, 0.3, s) * 20;

      // Orbit (scene 2-3)
      const orbit = smoothstep(0.15, 0.4, s) * Math.PI * 0.4;
      camX += Math.sin(orbit) * 12;
      camY += Math.cos(orbit * 0.7) * 5 - 3;

      // Horizontal travel (scene 4)
      const sideProgress = smoothstep(0.5, 0.7, s);
      camX += sideProgress * 35;
      camZ = lerp(camZ, 15, sideProgress);

      // Return and elevate (scene 5)
      const returnProgress = smoothstep(0.72, 0.95, s);
      camX = lerp(camX, 0, returnProgress);
      camY = lerp(camY, 8, returnProgress);
      camZ = lerp(camZ, 30, returnProgress);

      camera.position.set(camX, camY, camZ);

      // Look target shifts with camera
      const lookX = lerp(0, camX * 0.4, smoothstep(0.1, 0.7, s));
      const lookY = lerp(0, camY * 0.3, smoothstep(0.1, 0.7, s));
      camera.lookAt([lookX, lookY, 0]);

      renderer.render({ scene, camera });
      raf = requestAnimationFrame(update);
    }

    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      if (container.contains(gl.canvas as HTMLCanvasElement)) {
        container.removeChild(gl.canvas as HTMLCanvasElement);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
