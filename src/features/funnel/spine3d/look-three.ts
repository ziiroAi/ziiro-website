/**
 * (C) W14-B: LOOK (./look.ts) mapped onto three.js objects, copied from worker-3's lookdev/scene.ts as is. W14-C adds
 * the camera and the bloom chain from lookdev/main.ts at the end, with worker-3's two three gotchas kept: MSAA samples
 * set when the render target is made, and a NaN/Inf clamp before bloom.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { baseFraming, type Framing } from "./camera";
import type { CameraLook, Gap, ThemeLook, Vec3 } from "./look";
import { LOOK } from "./look";
import type { MeshSize } from "./rules";

const v3 = (a: Vec3): THREE.Vector3 => new THREE.Vector3(a[0], a[1], a[2]);
const col = (a: Vec3): THREE.Color => new THREE.Color(a[0], a[1], a[2]);  // linear, as stored

export const TONE: Record<ThemeLook["toneMapping"], THREE.ToneMapping> = {
  neutral: THREE.NeutralToneMapping, aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping,
};

/** The reflection world: a vertical gradient plus soft panels, prefiltered once. Returns the render target, which owns
 *  the framebuffer behind the texture, so a theme change frees both (W14-V T4). */
export function makeEnvironment(
  renderer: THREE.WebGLRenderer,
  t: ThemeLook,
  makePmrem = (r: THREE.WebGLRenderer) => new THREE.PMREMGenerator(r),
): THREE.WebGLRenderTarget {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: col(t.env.top) }, horizon: { value: col(t.env.horizon) }, bottom: { value: col(t.env.bottom) } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 top, horizon, bottom; varying vec3 vDir;
        void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(horizon, top, pow(y, 0.6)) : mix(horizon, bottom, pow(-y, 0.5));
        gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(sky);
  for (const p of t.env.panels) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(p.size[0], p.size[1]),
      new THREE.MeshBasicMaterial({ color: col(p.colour).multiplyScalar(p.intensity), side: THREE.DoubleSide }),
    );
    panel.position.copy(v3(p.dir).normalize().multiplyScalar(6));
    panel.lookAt(0, 0, 0);
    scene.add(panel);
  }
  const pmrem = makePmrem(renderer);
  const target = pmrem.fromScene(scene, t.env.blur);
  pmrem.dispose();
  scene.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  });
  return target;
}

/** The background as a GLSL function of the screen point p (fractions, origin top left), so the body and the rings can
 *  fade into exactly the pixel behind them. Its uniforms all start with bg. */
const BG_GLSL = `uniform vec3 bgBase, bgShaftCol, bgBokehCol; uniform float bgVignette, bgAspect, bgShaftWidth; uniform int bgBokehCount;
  uniform vec2 bgShaftFrom, bgShaftTo, bgOffset; uniform vec4 bgBokeh[BG_BOKEH];
  vec3 bgColour(vec2 screen){
    vec2 d = (screen - 0.5) * vec2(bgAspect, 1.0);
    vec3 c = bgBase * (1.0 - bgVignette * smoothstep(0.2, 1.1, length(d)));
    vec2 p = screen - bgOffset;
    // W15-A: the shaft and the bokeh fade out before the canvas's own edges (screen, not the shifted p), so every edge
    // is the page colour exactly and no page-side fade (or the canvas's edge) can show as a line.
    vec2 e = smoothstep(vec2(0.0), vec2(BG_EDGE), screen) * smoothstep(vec2(0.0), vec2(BG_EDGE), 1.0 - screen); float edge = e.x * e.y;
    vec3 glow = vec3(0.0);
    vec2 ab = bgShaftTo - bgShaftFrom; float k = clamp(dot(p - bgShaftFrom, ab) / dot(ab, ab), 0.0, 1.0);
    float off = length((p - (bgShaftFrom + ab * k)) * vec2(bgAspect, 1.0));
    glow += bgShaftCol * exp(-off * off / (bgShaftWidth * bgShaftWidth)) * (1.0 - k);
    for (int i = 0; i < BG_BOKEH; i++) { if (i >= bgBokehCount) break;
      float r = length((p - bgBokeh[i].xy) * vec2(bgAspect, 1.0));
      glow += bgBokehCol * bgBokeh[i].w * (1.0 - smoothstep(bgBokeh[i].z * 0.8, bgBokeh[i].z, r)); }
    return c + glow * edge;
  }`;

/** What the body and rings share with the background and with each other: the background's uniforms, the end fade, and
 *  the canvas size in device px. Call update() after posing the model and on resize. */
export interface Shared {
  uniforms: Record<string, THREE.IUniform>;
  defines: Record<string, number>;
  update(model: THREE.Object3D, widthPx: number, heightPx: number): void;
}

/** Where the column fades into the background, along its own axis (metres from LOOK.model.pivot): his model is cut flat
 *  just below gap 0 and just above gap 8, and the cut faces must never show while it turns. Derived from the end gaps. */
const axisOf = (c: Vec3): number => {
  const a = v3(LOOK.model.axis).normalize();
  return v3(c).sub(v3(LOOK.model.pivot)).dot(a);
};
const END_FADE = new THREE.Vector4(
  axisOf(LOOK.gaps[0].centre) - 0.06, axisOf(LOOK.gaps[0].centre) - 0.035,      // bottom: invisible -> full
  axisOf(LOOK.gaps[LOOK.gaps.length - 1].centre) - 0.035, axisOf(LOOK.gaps[LOOK.gaps.length - 1].centre) + 0.03,   // top: full -> invisible; gap 8 sits on the top cut, so it fades too
);

/** GLSL for the end fade: vS is the axis coordinate, endFade() is 1 on the column and 0 past its ends. */
const FADE_GLSL = `uniform mat4 uToModel; uniform vec4 uFade; uniform vec2 uRes;
  float axisCoord(vec3 world){ vec3 m = (uToModel * vec4(world, 1.0)).xyz;
    return dot(m - vec3(${LOOK.model.pivot.join(", ")}), normalize(vec3(${LOOK.model.axis.join(", ")}))); }
  float endFade(float s){ return smoothstep(uFade.x, uFade.y, s) * (1.0 - smoothstep(uFade.z, uFade.w, s)); }`;
/** Fragment only: this pixel as a screen point for bgColour(). */
const SCREEN_GLSL = "vec2 screenP(){ return vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y); }";
/** The gaps' light leaking onto his metal: the spill (look.ts ring.spill) as emission on the body, falling off with the
 *  distance to each gap's rim in model space, so the 9 glow positions still read when the rings hide behind the processes
 *  at the side angles. Point lights did this badly: on this metal they only made specks. */
/** W19-GHOST: the leak lights a face by how squarely it looks along the column, |normal . gap normal|, from nothing at
 *  FROM to full at TO: the rims facing into a slit, never the outward faces of bone in front of the ring. */
export const LEAK_FACING = { from: 0.55, to: 0.85 };
export const LEAK_GLSL = `#define LEAK_FACING_FROM ${LEAK_FACING.from.toFixed(2)}
#define LEAK_FACING_TO ${LEAK_FACING.to.toFixed(2)}
uniform vec3 uLeakCol; uniform float uLeakRange; uniform float uGapLevel[${LOOK.gaps.length}];
  float leakOne(vec3 m, vec3 nm, vec3 c, vec3 n, float r, float level){
    vec3 d = m - c; float ax = dot(d, n); float rad = length(d - n * ax);
    // a Gaussian band at the gap's level: lambda = r x range up and down the column, 2.5x that outwards, so it lands on
    // the rims at that level while the bodies between gaps stay dark
    vec2 q = vec2(ax, max(rad - r * 0.8, 0.0) / 2.5) / (r * uLeakRange);
    // W19-GHOST: only on faces that look into the slit (the rims, normal along the column). A lip or process standing
    // in front of the ring faces outwards, and lit there the band drew the hidden ring's arc across the bone.
    return level * exp(-dot(q, q)) * smoothstep(LEAK_FACING_FROM, LEAK_FACING_TO, abs(dot(nm, n)));
  }
  vec3 leak(vec3 m, vec3 nm){ float e = 0.0;
${LOOK.gaps.map((g, k) => `    e += leakOne(m, nm, vec3(${g.centre.join(", ")}), normalize(vec3(${g.normal.join(", ")})), ${g.radius}, uGapLevel[${k}]);`).join("\n")}
    return uLeakCol * e; }`;


/** The page behind the spine, drawn in the canvas: base colour, vignette, and in dark mode r17's light shaft and bokeh. */
export function makeBackground(t: ThemeLook, aspect: number): { quad: THREE.Mesh; shared: Shared } {
  const b = t.background;
  const bokeh: number[] = [];
  if (b.bokeh) {
    let s = b.bokeh.seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < b.bokeh.count; i += 1) {
      const along = rnd();                                    // bokeh drift along the shaft, as in r17
      const from = b.shaft?.from ?? [0, 0];
      const to = b.shaft?.to ?? [1, 1];
      bokeh.push(from[0] + (to[0] - from[0]) * along + (rnd() - 0.5) * 0.25, from[1] + (to[1] - from[1]) * along + (rnd() - 0.5) * 0.25,
        b.bokeh.size[0] + rnd() * (b.bokeh.size[1] - b.bokeh.size[0]), 0.4 + rnd() * 0.6);
    }
  }
  const count = bokeh.length / 4;
  const uniforms: Record<string, THREE.IUniform> = {
    bgBase: { value: col(b.base) }, bgVignette: { value: b.vignette }, bgAspect: { value: aspect },
    bgShaftFrom: { value: new THREE.Vector2(...(b.shaft?.from ?? [0, 0])) },
    bgShaftTo: { value: new THREE.Vector2(...(b.shaft?.to ?? [0, 0])) },
    bgShaftWidth: { value: b.shaft?.width ?? 1 },
    bgShaftCol: { value: b.shaft ? col(b.shaft.colour).multiplyScalar(b.shaft.intensity) : new THREE.Color(0, 0, 0) },
    bgBokehCol: { value: b.bokeh ? col(b.bokeh.colour).multiplyScalar(b.bokeh.intensity) : new THREE.Color(0, 0, 0) },
    bgBokehCount: { value: count },
    bgBokeh: { value: count ? Array.from({ length: count }, (_, i) => new THREE.Vector4(...bokeh.slice(i * 4, i * 4 + 4))) : [new THREE.Vector4()] },
    bgOffset: { value: new THREE.Vector2(0, 0) },              // the shaft and bokeh follow the spine (backgroundOffsetX)
    uToModel: { value: new THREE.Matrix4() }, uFade: { value: END_FADE }, uRes: { value: new THREE.Vector2(1, 1) },
    uGapLevel: { value: LOOK.gaps.map(() => 1) },             // glow(level) per gap, written by Rings.setLevels
  };
  // BG_EDGE: how far in from each canvas edge (a share of its side) the shaft and the bokeh fade from nothing to full.
  const defines = { BG_BOKEH: Math.max(count, 1), BG_EDGE: 0.22 };
  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, defines, uniforms,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }",
    fragmentShader: `${BG_GLSL} varying vec2 vUv; void main(){ gl_FragColor = vec4(bgColour(vec2(vUv.x, 1.0 - vUv.y)), 1.0); }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  quad.renderOrder = -1;
  const shared: Shared = {
    uniforms, defines,
    update(model, w, h) {
      model.updateMatrixWorld(true);
      (uniforms.uToModel.value as THREE.Matrix4).copy(model.matrixWorld).invert();
      (uniforms.uRes.value as THREE.Vector2).set(w, h);
    },
  };
  return { quad, shared };
}

/** His body, in r17's metal. Keeps his normal map; his disc mask (emissive texture) becomes a weak fill. Past the
 *  column's ends it fades into the background pixel behind it, so the flat cuts never show. */
export function makeBody(t: ThemeLook, source: THREE.MeshStandardMaterial | null, mask: THREE.Texture | null, fill: number, shared: Shared): THREE.MeshPhysicalMaterial {
  const b = t.body;
  const maps = Boolean(b.maps && source?.map);   // W17-M: m4 carries its own machined colour, roughness and metalness
  const m = new THREE.MeshPhysicalMaterial({
    color: maps ? (b.mapTint ? col(b.mapTint) : new THREE.Color(1, 1, 1)) : col(b.colour),
    // W21: mapMetalness and mapRoughness stand in for his metalness map (median 0.05, so the bone read as glossy black
    // plastic) and his roughness map (median 0.22, mirror flecks down to 0.09), for the satin gunmetal the owner asked for.
    metalness: maps ? (b.mapMetalness ?? 1) : b.metalness, roughness: maps ? (b.mapRoughness ?? 1) : b.roughness,
    map: maps ? source!.map : null, roughnessMap: maps && b.mapRoughness === undefined ? source!.roughnessMap : null,
    metalnessMap: maps && b.mapMetalness === undefined ? source!.metalnessMap : null,
    clearcoat: b.clearcoat, clearcoatRoughness: b.clearcoatRoughness, envMapIntensity: b.envIntensity,
    normalMap: source?.normalMap ?? null, normalScale: new THREE.Vector2(b.normalScale, b.normalScale),
    emissive: col(t.maskFill.colour), emissiveMap: mask, // even 1 % orange on near-black metal reads as amber, so a quiet fill is fully off
    emissiveIntensity: mask && fill >= LOOK.discLevels.lit ? t.maskFill.intensity : 0,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared.uniforms, {
      uLeakCol: { value: col(t.ring.spill.colour).multiplyScalar(t.ring.spill.intensity) },
      uLeakRange: { value: t.ring.spill.distanceK },
    });
    sh.defines = { ...sh.defines, ...shared.defines };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${FADE_GLSL}\nvarying float vS; varying vec3 vM; varying vec3 vNm;`)
      .replace("#include <project_vertex>", "#include <project_vertex>\nvec3 fw = (modelMatrix * vec4(transformed, 1.0)).xyz; vS = axisCoord(fw); vM = (uToModel * vec4(fw, 1.0)).xyz;\nvNm = mat3(uToModel) * mat3(modelMatrix) * objectNormal;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${FADE_GLSL}\n${SCREEN_GLSL}\n${BG_GLSL}\n${LEAK_GLSL}\nvarying float vS; varying vec3 vM; varying vec3 vNm;`)
      // W21: the base map is lossy webp, so its near-black texels carry a little colour noise; lifted to gunmetal on a metal
      // that noise is the reflection's colour, and the bloom's luminance threshold picked out its green texels as a
      // rainbow glint on the brightest lips. mapGrey reads the map's luminance only, capped at a metal's 0.85 reflectance.
      .replace("#include <map_fragment>", b.mapEven !== undefined
        // W21 r2: one even tone on bodies and processes (the map's own darker processes read two-tone once lifted).
        ? `#include <map_fragment>\ndiffuseColor.rgb = diffuse * ${b.mapEven.toFixed(4)};`
        : b.mapGrey ? "#include <map_fragment>\ndiffuseColor.rgb = vec3(min(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.85));" : "#include <map_fragment>")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += leak(vM, normalize(vNm));")
      .replace("#include <opaque_fragment>", "#include <opaque_fragment>\ngl_FragColor.rgb = mix(bgColour(screenP()), gl_FragColor.rgb, endFade(vS));");
  };
  return m;
}

/** Glow response to a disc level: cubic, so D28's quiet 12 % gives ~0.2 % of the light and reads as off on black metal
 *  (square law left a visible amber band). The shaders use the same curve. */
export const glow = (level: number): number => level * level * level;

/** W22-RING: the band is drawn this far nearer the camera, along each pixel's own ray, so it covers the same pixels
 *  but a thin bone lip hanging across its slit (the owner's 16:24 wedge on Operations) no longer cuts it. The processes
 *  and bodies in front stand much further out, so they still hide it. Model units (a body is about 0.07 across). */
export const RING_DEPTH_PULL = 0.02;
const RING_VERT = `uniform float depthPull; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
  void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz;
  w.xyz += normalize(cameraPosition - w.xyz) * depthPull;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
/** Final review L3: a ring fragment facing the camera less than this (about 72 degrees off) is dropped. Those are the
 *  band's edge-on ends, which poked 2-3 px past the column's silhouette as specks; the lit arc faces far nearer. */
export const RING_EDGE_FACING = 0.3;
/** W22-RING: where a band's end has faded fully in. */
export const RING_END_SOFT = 0.45;
const RING_FRAG = `#define RING_EDGE_FACING ${RING_EDGE_FACING.toFixed(2)}
#define RING_END_SOFT ${RING_END_SOFT.toFixed(2)}
uniform vec3 edge, mid, core; uniform float intensity, level, facingPower, facingBase, coreSharpness;
  varying vec2 vUv; varying vec3 vN; varying vec3 vP;
  ${FADE_GLSL}
  ${SCREEN_GLSL}
  ${BG_GLSL}
  void main(){
    float h = 1.0 - abs(vUv.y * 2.0 - 1.0);                                   // 0 at the band's edges, 1 on its centre line
    vec3 c = mix(edge, mid, smoothstep(0.0, 0.55, h));
    c = mix(c, core, pow(h, coreSharpness));
    float facing = max(dot(normalize(vN), normalize(cameraPosition - vP)), 0.0);
    if (facing < RING_EDGE_FACING) discard;
    // W22-RING: the band's ends fade out over RING_EDGE_FACING..RING_END_SOFT, so no arc ends in a hard cut or a speck
    float a = smoothstep(RING_EDGE_FACING, RING_END_SOFT, facing);
    float g = facingBase + (1.0 - facingBase) * pow(facing, facingPower);
    vec3 lit = c * intensity * level * level * level * g * smoothstep(0.0, 0.35, h);
    gl_FragColor = vec4(mix(bgColour(screenP()), lit, endFade(axisCoord(vP))), a);
  }`;

const CAP_VERT = `varying vec3 vP; varying vec2 vUv;
  void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const CAP_FRAG = `uniform vec3 edge, mid, core, centre; uniform float intensity, level, facingPower, facingBase;
  varying vec3 vP; varying vec2 vUv;
  ${FADE_GLSL}
  void main(){
    float r = length(vUv - 0.5) * 2.0;                                       // 0 at the disc's centre, 1 at its rim
    vec3 out_ = normalize(vP - centre);
    float facing = max(dot(out_, normalize(cameraPosition - centre)), 0.0);
    float g = facingBase + (1.0 - facingBase) * pow(facing, facingPower);
    float k = smoothstep(0.35, 1.0, r);
    vec3 c = mix(edge, mid, k); c = mix(c, core, pow(k, 6.0) * facing);
    gl_FragColor = vec4(c * intensity * level * level * level * g * k * (1.0 - smoothstep(0.97, 1.0, r)) * endFade(axisCoord(vP)), 1.0);
  }`;

export interface Rings { group: THREE.Group; setLevels(levels: readonly number[]): void }

/** A band at or below this level (quiet is 0.12) is hidden: it would draw black. */
const BAND_SHOWS_ABOVE = 0.2;

/** One emissive band per gap, a full ring: the rims hide its back, and its facing term makes the camera-side arc. */
export function makeRings(t: ThemeLook, gaps: readonly Gap[], shared: Shared): Rings {
  const R = LOOK.ring;
  const group = new THREE.Group();
  const mats: THREE.ShaderMaterial[] = [];
  const bands: THREE.Mesh[] = [];
  gaps.forEach((g) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        edge: { value: col(t.ring.edge) }, mid: { value: col(t.ring.mid) }, core: { value: col(t.ring.core) },
        intensity: { value: t.ring.intensity }, level: { value: 1 }, facingPower: { value: R.facingPower },
        facingBase: { value: R.facingBase }, coreSharpness: { value: R.coreSharpness }, depthPull: { value: RING_DEPTH_PULL },
        ...shared.uniforms,
      },
      defines: shared.defines,
      transparent: true, depthWrite: false,                  // W22-RING: the soft ends blend over the bone behind them
      vertexShader: RING_VERT, fragmentShader: RING_FRAG,
    });
    const r = g.grooveRadius * R.radiusK;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, g.width * R.heightK, R.segments, 1, true), mat);
    ring.position.copy(v3(g.centre));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3(g.normal).normalize());
    group.add(ring);
    bands.push(ring);
    if (R.capK > 0) {                                         // the disc's own face, glowing towards the camera-side rim
      const capMat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { ...mat.uniforms, intensity: { value: t.ring.intensity * R.capK }, centre: { value: v3(g.centre) } },
        vertexShader: CAP_VERT, fragmentShader: CAP_FRAG,
      });
      const cap = new THREE.Mesh(new THREE.CircleGeometry(g.radius * R.capRadiusK, R.segments), capMat);
      cap.position.copy(v3(g.centre));
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v3(g.normal).normalize());
      group.add(cap);                                         // shares the ring's level uniform, so setLevels drives it too
    }
    mats.push(mat);
  });
  return {
    group,
    setLevels(levels) {
      levels.forEach((l, k) => {
        mats[k].uniforms.level.value = l;
        // W19 r2 (review M1): a quiet band (level 0.12, cubed in the shader) draws black, and at the stage's top fade
        // its edges showed through as a dotted dark arc in light mode, so a band shows only above the quiet level.
        bands[k].visible = l > BAND_SHOWS_ABOVE;
        (shared.uniforms.uGapLevel.value as number[])[k] = glow(l);
      });
    },
  };
}

/** Key and rim lights plus a little ambient, from the theme. Directions are in model space, like the env panels. */
export function makeLights(t: ThemeLook): THREE.Object3D[] {
  const L = t.lights;
  const key = new THREE.DirectionalLight(col(L.key.colour), L.key.intensity);
  key.position.copy(v3(L.key.dir).normalize().multiplyScalar(5));
  const rim = new THREE.DirectionalLight(col(L.rim.colour), L.rim.intensity);
  rim.position.copy(v3(L.rim.dir).normalize().multiplyScalar(5));
  return [new THREE.AmbientLight(col(L.ambient.colour), L.ambient.intensity), key, rim];
}

/**
 * r17's Blender camera on the canvas, at a framing (lookdev/main.ts makeCamera). Desktop: the canvas is the whole
 * frame. Phone: the canvas shows the lens's view window of its portrait frame, as the shipped band does.
 */
/**
 * How far the spine's target has moved across the screen from where r17's own framing puts it, as a fraction of the
 * canvas width, from a framing's sideways lens shift (applyCamera's view offset). The background's shaft and bokeh move
 * by this, so they stay beside the spine when the plan's stage slides it left, off the text (W15-B2). Zero at r17's
 * framing, so S0 and the plan's hero keep their look.
 */
/** r17's own sideways shift per size: where backgroundOffsetX is zero. */
const BASE_SHIFT_X: Readonly<Record<MeshSize, number>> = { desktop: baseFraming("desktop").shift[0], phone: baseFraming("phone").shift[0] };

export function backgroundOffsetX(lens: CameraLook, size: MeshSize, w: number, h: number, shiftX: number): number {
  const full: readonly [number, number] = size === "desktop" ? [w, h] : lens.full;
  const viewWidth = size === "desktop" ? full[0] : lens.view[2];
  const long = Math.max(full[0], full[1]);
  const base = BASE_SHIFT_X[size];
  return viewWidth > 0 ? (-(shiftX - base) * long) / viewWidth : 0;
}

export function applyCamera(cam: THREE.PerspectiveCamera, lens: CameraLook, pose: Framing, size: MeshSize, w: number, h: number): void {
  const full: readonly [number, number] = size === "desktop" ? [w, h] : lens.full;
  const view = size === "desktop" ? [0, 0, full[0], full[1]] : lens.view;
  const long = Math.max(full[0], full[1]);
  const tanLong = lens.sensorMm / 2 / pose.lensMm;
  const tanV = full[1] >= full[0] ? tanLong : (tanLong * full[1]) / full[0];
  cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV));
  cam.aspect = full[0] / full[1];
  cam.near = 0.05;
  cam.far = 20;
  cam.position.set(...pose.position);
  cam.lookAt(...pose.target);
  const d = new THREE.Vector3(...pose.target).sub(cam.position).normalize();
  cam.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(d, THREE.MathUtils.degToRad(pose.rollDeg)));
  cam.setViewOffset(full[0], full[1], view[0] + pose.shift[0] * long, view[1] - pose.shift[1] * long, view[2], view[3]);
  cam.updateMatrixWorld();
}

/** Clamp HDR to a finite range and zero NaNs before bloom (gotcha 2: one bad pixel blooms into a black block). */
/**
 * W15-A: half a level of noise on the final sRGB colour, written into the output pass's own shader so it costs no extra
 * full-screen pass. The dark background's shaft is a slow gradient only a few levels deep; written to an 8-bit canvas
 * without this it comes out as visible steps. Interleaved gradient noise: grain, never a pattern.
 */
const DITHER_GLSL = `
      gl_FragColor.rgb += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0; // w15Dither
`;

function withDither(pass: OutputPass): OutputPass {
  const fs = pass.material.fragmentShader;
  const end = fs.lastIndexOf("}");
  pass.material.fragmentShader = fs.slice(0, end) + DITHER_GLSL + fs.slice(end);
  pass.material.needsUpdate = true;
  return pass;
}

const SANITISE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), 1.0); }`,
};

export interface ComposerOptions {
  /** MSAA samples on the scene's target. */
  samples: number;
  /** The bloom's working size as a multiple of the canvas (it halves that for its first mip). */
  bloomScale: number;
}

/**
 * Render, clamp, bloom, output, in device pixels. Gotcha 1: the samples go on the target when it is made, so a new
 * size means a new composer (resizes are rare).
 *
 * W14-K, GPU memory: only the scene's target is multisampled and has depth. The passes after it draw full-screen quads
 * into a plain one. Both are the canvas's size: the composer's pixel ratio is 1, because addPass multiplies every
 * pass's size by it and these sizes are already device pixels (the bloom used to run at twice the canvas).
 */
export function makeComposer(
  renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, t: ThemeLook, width: number, height: number,
  { samples, bloomScale }: ComposerOptions,
): EffectComposer {
  const sceneTarget = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples });
  const passTarget = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: false });
  const composer = new EffectComposer(renderer, passTarget);
  composer.setPixelRatio(1);
  // RenderPass draws into the read buffer. Sanitise and Output each swap, so it is the scene's target every frame.
  composer.renderTarget2.dispose();
  composer.renderTarget2 = sceneTarget;
  composer.readBuffer = sceneTarget;
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(SANITISE));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), t.bloom.strength, t.bloom.radius, t.bloom.threshold);
  composer.addPass(bloom);
  bloom.setSize(Math.round(width * bloomScale), Math.round(height * bloomScale));
  composer.addPass(withDither(new OutputPass()));
  return composer;
}

/** EffectComposer.dispose frees its two targets but not its passes' (the bloom's eleven). */
export function disposeComposer(composer: EffectComposer): void {
  composer.passes.forEach((pass) => pass.dispose());
  composer.dispose();
}
