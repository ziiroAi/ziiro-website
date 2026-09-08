/**
 * The intelligence core: a luminous ring, drawn by one fragment shader.
 *
 * PROVENANCE. The ring's construction — the noise-perturbed radius, the two
 * light falloff functions, the orbiting highlight, the pair of smoothstep
 * masks that carve the annulus, and the sine domain-warp that makes it go
 * wavy — is adapted from the public hero shader on lancemart.org, which the
 * site owner supplied as the reference to match (as an extracted kit, in the
 * conversation that produced this file). The palette here is Ziiro's own
 * amber/violet duotone rather than the source's green and gold, and the
 * activation model is different: the source ripples on pointer *proximity*,
 * this ripples on a discrete click or tap and then settles. Worth knowing
 * before anyone treats this as original work.
 *
 * WHY A QUAD AND NOT A MESH. An earlier version of this file displaced a
 * 12k-vertex sphere and rebuilt its normals every frame — three noise
 * evaluations per vertex — to get a rim that deformed. It worked, and it was
 * roughly two orders of magnitude more expensive than it needed to be. A ring
 * seen face-on has no back and no silhouette worth simulating: every pixel of
 * it can be solved directly from the fragment's distance and angle from
 * centre. This draws three vertices.
 *
 * THE RIPPLE. `uv.x += hover * amp * 0.06 * sin(uv.y * 10 + iTime)`, and the
 * same for y. Warping the *domain* rather than the shape means the ring's
 * whole construction — its radius, its light, its highlight — is evaluated at
 * displaced coordinates, so silhouette, thickness and highlight all deform
 * together and stay consistent with each other for free. Deforming a shape and
 * separately animating its lighting is how these things end up looking like a
 * texture sliding over a static object.
 */

export const coreOrbVertex = /* glsl */ `
precision highp float;

attribute vec2 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const coreOrbFragment = /* glsl */ `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;

uniform float uHover;         // 0..1 activation energy — drives the ripple
uniform float uHoverAmp;      // ripple amplitude multiplier
uniform float uRot;           // accumulated rotation, radians
uniform float uPulse;         // heartbeat, 0..1
uniform float uGlow;          // overall brightness
uniform float uColorStrength; // 0 = greyscale, 1 = full saturation
uniform float uInnerRadius;   // higher = thinner ring
uniform float uOpacity;       // scroll handoff fade
uniform float uScroll;        // 0..1, recedes the ring as the hero leaves

uniform vec3 uColorA;         // violet — the cool half of the duotone
uniform vec3 uColorB;         // amber — the warm half
uniform vec3 uCore;           // the near-black the ring sits on

varying vec2 vUv;

/* Value noise. Cheap, and smooth enough that the ring's radius wanders rather
   than jitters. */
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

/* Premultiplied-alpha extraction: the ring's own brightness becomes its
   coverage, so the dark centre and everything outside it stay genuinely
   transparent and the CSS halo behind the canvas shows through untouched. */
vec4 extractAlpha(vec3 c) {
  float a = max(max(c.r, c.g), c.b);
  return vec4(c / (a + 1e-5), a);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}
float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

const float NOISE_SCALE = 0.35;

vec4 draw(vec2 uv) {
  float ang = atan(uv.y, uv.x);
  float len = length(uv);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;

  // The ring's radius wanders slowly with noise, so its thickness is never
  // even the whole way round — which is most of what stops it reading as a
  // drawn circle.
  float n0 = snoise3(vec3(uv * NOISE_SCALE, iTime * 0.35)) * 0.5 + 0.5;
  float r0 = mix(mix(uInnerRadius, 1.0, 0.5), mix(uInnerRadius, 1.0, 0.62), n0);

  // Distance from this fragment to the ring's contour, and the light on it.
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0, d0);
  v0 *= (1.0 - smoothstep(r0, r0 * 1.05, len));

  // A bright point orbiting the ring — the highlight that travels.
  float a = iTime * -0.7;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = distance(uv, pos);
  float v1 = light2(1.5, 5.0, d);
  v1 *= light1(1.0, 50.0, d0);

  // The two masks that carve the annulus: outer falloff, inner hole.
  float v2 = (1.0 - smoothstep(mix(uInnerRadius, 1.0, n0 * 0.5), 1.0, len));
  float v3 = smoothstep(uInnerRadius, mix(uInnerRadius, 1.0, 0.5), len);

  // The duotone, cycling around the ring so the warm and cool halves trade
  // places slowly rather than being painted on at fixed angles.
  float cl = cos(ang + iTime * 1.4) * 0.5 + 0.5;
  vec3 col = mix(uColorA, uColorB, cl * 0.55);
  col = mix(uCore, col, v0);
  col = (col + v1 * vec3(1.0, 0.95, 0.75)) * v2 * v3;

  col *= (1.0 + uPulse * 0.15) * uGlow;
  col = clamp(col, 0.0, 1.0);

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(luma), col, uColorStrength), 0.0, 1.0);

  return extractAlpha(col);
}

void main() {
  vec2 fragCoord = vUv * iResolution.xy;
  vec2 center = iResolution.xy * 0.5;
  float size = min(iResolution.x, iResolution.y);
  vec2 uv = (fragCoord - center) / size * 2.0;

  // Scroll handoff: the ring recedes and rises as the hero leaves, so the
  // section hands over to the next rather than simply scrolling away.
  uv *= 1.0 + uScroll * 0.42;
  uv.y -= uScroll * 0.30;

  // Accumulated rotation. Only turns while the surface has energy in it, so
  // the object is still at rest and turns a little when you disturb it.
  float s = sin(uRot);
  float c = cos(uRot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  // The ripple. Domain warp, so shape and light deform together.
  uv.x += uHover * uHoverAmp * 0.06 * sin(uv.y * 10.0 + iTime);
  uv.y += uHover * uHoverAmp * 0.06 * sin(uv.x * 10.0 + iTime);

  vec4 col = draw(uv);
  float a = col.a * uOpacity;
  gl_FragColor = vec4(col.rgb * a, a);
}
`;

/**
 * The reference's heartbeat: two beats inside a 1.6s cycle, the second at 70%
 * of the first, then a rest. It is what keeps the ring feeling alive while
 * nothing is happening — a single sine reads as a machine breathing, and a
 * steady glow reads as a static image.
 */
export function heartbeatAt(time: number): number {
  const phase = time % 1.6;
  if (phase < 0.18) return Math.sin((phase / 0.18) * Math.PI);
  if (phase > 0.32 && phase < 0.5)
    return 0.7 * Math.sin(((phase - 0.32) / 0.18) * Math.PI);
  return 0;
}
