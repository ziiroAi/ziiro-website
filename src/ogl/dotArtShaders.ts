export const dotArtVertex = /* glsl */ `
precision highp float;

attribute vec2 position;

// Instanced
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aSizeFrom;
attribute float aSizeTo;
attribute float aFlowFrom;
attribute float aFlowTo;
attribute float aSeed;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uMorph;
uniform float uDotSize;    // base dot RADIUS in CSS pixels
uniform vec2 uResolution;  // CSS pixels
uniform vec3 uMouse;       // xy in 0..1; parked far off-screen when idle
uniform float uRipple;
uniform vec3 uRippleOrigin;
uniform float uPulse;      // traveling-signal strength for current scene
uniform float uCloth;      // cloth-wave displacement for current scene
uniform float uBreath;     // breathing strength for current scene
uniform float uCollapse;   // 1 on the collapse-into-a-point segment
uniform vec3 uWind;        // inherited momentum direction for this transition
uniform float uWindRadial; // radial expand (+) / converge (-) during transition

varying float vAlpha;
varying vec2 vUv;
varying float vSizePx;

void main() {
  // Long stagger: dots depart in a bottom-to-top sweep (seed follows the
  // spatial sort), so each shape sheds into the next instead of swapping
  float lm = clamp((uMorph - aSeed * 0.45) / 0.55, 0.0, 1.0);
  lm = lm * lm * (3.0 - 2.0 * lm);

  vec3 pos = mix(aFrom, aTo, lm);
  float size = mix(aSizeFrom, aSizeTo, lm);
  float flow = mix(aFlowFrom, aFlowTo, lm);

  // Inherited momentum: travelling dots ride the transition's wind and
  // expand/converge radially, then a small personal arc keeps it organic
  float travel = sin(lm * 3.14159265);
  pos += uWind * (0.6 + 0.4 * fract(aSeed * 13.7)) * travel;
  vec2 rdir = normalize(pos.xy + vec2(0.001));
  pos.xy += rdir * uWindRadial * travel;
  pos += vec3(sin(aSeed * 17.0), cos(aSeed * 23.0), sin(aSeed * 29.0)) * 1.2 * travel;
  size *= 1.0 + 0.15 * travel;

  // Anticipation: energy builds and parts stir before they separate
  float antic = smoothstep(0.0, 0.15, uMorph) * smoothstep(0.35, 0.15, uMorph);
  pos += uWind * 0.12 * antic;
  size *= 1.0 + 0.18 * antic * fract(aSeed * 9.7);

  // Collapse beat: the whole field streams into one point mid-morph,
  // then bursts outward into the next formation
  if (uCollapse > 0.001) {
    float pull = sin(lm * 3.14159265) * uCollapse;
    pos = mix(pos, vec3(0.0), pull * 0.985);
    size = mix(size, max(size, 0.55), pull);
  }

  // Traveling energy pulse along flow paths (filament, exhaust,
  // network links, circuit traces). flow==0 means no path.
  if (flow >= 0.5 && uPulse > 0.001) {
    float ph = fract(flow * 0.045 - uTime * 0.28);
    float band = smoothstep(0.0, 0.14, ph) * smoothstep(0.34, 0.14, ph);
    size *= 1.0 + uPulse * band * 1.1;
  }

  // Cloth wave: the lattice folds into slow rolling fabric
  if (uCloth > 0.001) {
    pos.z += uCloth * sin(pos.x * 0.12 + uTime * 0.5) * cos(pos.y * 0.09 + uTime * 0.32);
    pos.y += uCloth * 0.25 * sin(pos.x * 0.07 - uTime * 0.4);
  }

  // Breathing: sculpture/bulb gently swells
  if (uBreath > 0.001) {
    float br = sin(uTime * 0.9);
    pos *= 1.0 + uBreath * 0.5 * br;
    size *= 1.0 + uBreath * br;
  }

  // ---- Living world: layered idle motion — nothing is ever still ----
  // Oscillating twist wave torques the whole structure without smearing it
  float r2d = length(pos.xz);
  float tw = 0.08 * sin(uTime * 0.15 + r2d * 0.04 + pos.y * 0.02);
  float twc = cos(tw);
  float tws = sin(tw);
  pos.xz = mat2(twc, -tws, tws, twc) * pos.xz;

  // Breathing wave propagating outward from the core
  pos *= 1.0 + 0.008 * sin(uTime * 0.5 - length(pos) * 0.035);

  // Slow ripple travelling across every surface
  float rip = sin(r2d * 0.14 - uTime * 0.9);
  pos.y += rip * 0.3;
  size *= 1.0 + 0.05 * rip;

  // Local orbit: every dot floats around its home; a few drift far
  // like satellite motes circling the sculpture
  float orbR = 0.14 + 0.1 * fract(aSeed * 7.7);
  if (fract(aSeed * 23.3) > 0.96) orbR *= 6.0;
  float th = uTime * (0.5 + fract(aSeed * 5.1) * 0.7) + aSeed * 6.283;
  pos += vec3(sin(th), cos(th * 0.9 + 1.0) * 0.7, sin(th * 0.8 + 2.0)) * orbR;

  // Gentle spatial turbulence
  pos += 0.12 * vec3(
    sin(pos.y * 0.35 + uTime * 0.7),
    sin(pos.z * 0.30 + uTime * 0.6),
    sin(pos.x * 0.32 + uTime * 0.8));

  // Per-dot heartbeat
  size *= 1.0 + 0.06 * sin(uTime * 1.7 + aSeed * 40.0);

  // Click ripple: a soft radial wave through the field
  if (uRipple > 0.001) {
    float rd = length(pos.xy - uRippleOrigin.xy);
    float wave = sin(rd * 0.55 - uTime * 6.0) * exp(-rd * 0.06);
    pos.z += wave * uRipple * 2.5;
    size *= 1.0 + wave * uRipple * 0.3;
  }

  size = min(size, 1.4);

  vec4 mvPos = viewMatrix * vec4(pos, 1.0);
  float depth = -mvPos.z;

  // Mouse proximity in screen space -> magnetic grow
  vec4 clip = projectionMatrix * mvPos;
  vec2 screen = clip.xy / max(clip.w, 0.0001);
  vec2 mouseN = uMouse.xy * 2.0 - 1.0;
  float aspect = uResolution.x / uResolution.y;
  float md = length((screen - mouseN) * vec2(aspect, 1.0));
  float hover = smoothstep(0.22, 0.0, md);
  float grow = 1.0 + hover * 0.45;

  // Constant screen-space sizing: dot radius stays uDotSize*size CSS px
  // regardless of camera distance — depth reads through spacing only.
  float fovFactor = projectionMatrix[1][1];
  float worldPerPixel = (2.0 * depth) / (fovFactor * uResolution.y);
  float worldSize = uDotSize * size * grow * worldPerPixel;

  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 billboardPos = pos + (camRight * position.x + camUp * position.y) * worldSize;

  gl_Position = projectionMatrix * viewMatrix * vec4(billboardPos, 1.0);

  // Parked particles are clipped away entirely
  if (size < 0.02) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }

  vAlpha = 0.94 + hover * 0.06;
  vSizePx = uDotSize * size * grow;
  vUv = position;
}
`;

export const dotArtFragment = /* glsl */ `
precision highp float;

varying float vAlpha;
varying vec2 vUv;
varying float vSizePx;

uniform vec3 uColor;

void main() {
  // Perfect flat disc — no shading, no gradient, no glow.
  float dist = length(vUv);
  if (dist > 1.0) discard;

  // AA band scales with dot size so tiny dots stay smooth
  float aa = clamp(1.2 / max(vSizePx, 1.0), 0.06, 0.5);
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, dist);

  // Premultiplied output — composites correctly over the page
  float a = edge * vAlpha;
  gl_FragColor = vec4(uColor * a, a);
}
`;
