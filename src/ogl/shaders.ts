export const dotVertex = /* glsl */ `
precision highp float;

// Instanced attributes
attribute vec3 offset;
attribute float aScale;
attribute float aSeed;

// Billboard quad vertices
attribute vec2 position;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uScroll;
uniform float uMorphProgress;
uniform float uFlowStrength;
uniform float uRibbonStrength;
uniform float uWaveStrength;
uniform float uTunnelStrength;
uniform float uGridStrength;
uniform float uNetworkStrength;
uniform float uSideTravel;

varying float vAlpha;
varying vec2 vUv;

// --- Noise ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 curlNoise(vec3 p) {
  float e = 0.1;
  vec3 curl;
  curl.x = snoise(p + vec3(0,e,0)) - snoise(p - vec3(0,e,0));
  curl.y = snoise(p + vec3(0,0,e)) - snoise(p - vec3(0,0,e));
  curl.z = snoise(p + vec3(e,0,0)) - snoise(p - vec3(e,0,0));
  return curl / (2.0 * e);
}

void main() {
  float t = uTime * 0.15;
  vec3 pos = offset;

  // --- Scene 1: Infinite cloud with breathing ---
  float breath = snoise(pos * 0.08 + t * 0.3) * 1.5;
  pos += normalize(pos + 0.001) * breath * (1.0 - uMorphProgress * 0.5);

  // --- Scene 2: Flow field organization ---
  if (uFlowStrength > 0.0) {
    vec3 flow = curlNoise(pos * 0.06 + t * 0.1) * uFlowStrength * 4.0;
    pos += flow;
  }

  // --- Scene 3: Network morph ---
  if (uNetworkStrength > 0.0) {
    // Morph toward grid-like network nodes
    vec3 gridPos = floor(offset * 0.25 + 0.5) * 4.0;
    // Add organic offset
    gridPos += curlNoise(gridPos * 0.1 + t * 0.05) * 1.5;
    pos = mix(pos, gridPos, uNetworkStrength * 0.7);
  }

  // --- Ribbon formation ---
  if (uRibbonStrength > 0.0) {
    float ribbonId = floor(aSeed * 20.0);
    float ribbonT = fract(aSeed * 20.0);
    float angle = ribbonId * 0.31415 + t * 0.2;
    float radius = 8.0 + sin(ribbonId * 1.7) * 4.0;
    vec3 ribbonPos = vec3(
      cos(angle + ribbonT * 6.28) * radius,
      (ribbonT - 0.5) * 30.0 + sin(angle * 2.0 + ribbonT * 3.14) * 3.0,
      sin(angle + ribbonT * 6.28) * radius
    );
    pos = mix(pos, ribbonPos, uRibbonStrength);
  }

  // --- Wave surface ---
  if (uWaveStrength > 0.0) {
    vec3 wavePos = offset;
    wavePos.y = sin(wavePos.x * 0.3 + t) * 2.0 + cos(wavePos.z * 0.3 + t * 0.7) * 2.0;
    wavePos.y += snoise(vec3(wavePos.xz * 0.15, t * 0.3)) * 3.0;
    pos = mix(pos, wavePos, uWaveStrength);
  }

  // --- Tunnel formation ---
  if (uTunnelStrength > 0.0) {
    float tunnelAngle = atan(offset.y, offset.x);
    float tunnelDist = length(offset.xy);
    float tunnelRadius = 6.0 + sin(offset.z * 0.3 + t) * 1.5;
    vec3 tunnelPos = vec3(
      cos(tunnelAngle) * tunnelRadius,
      sin(tunnelAngle) * tunnelRadius,
      offset.z
    );
    pos = mix(pos, tunnelPos, uTunnelStrength);
  }

  // --- Grid formation ---
  if (uGridStrength > 0.0) {
    vec3 gridSnap = floor(offset * 0.15 + 0.5) * 6.667;
    pos = mix(pos, gridSnap, uGridStrength);
  }

  // --- Side travel offset (Scene 4) ---
  pos.x -= uSideTravel * 40.0;

  // --- Billboard: face camera ---
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  float scale = aScale * (0.02 + 0.01 * sin(aSeed * 50.0));
  vec3 worldPos = pos + camRight * position.x * scale + camUp * position.y * scale;

  vec4 mvPos = viewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Depth-based alpha
  float depth = -mvPos.z;
  vAlpha = smoothstep(100.0, 5.0, depth) * (0.2 + aSeed * 0.3);
  vAlpha *= smoothstep(2.0, 5.0, depth); // fade near camera

  vUv = position * 0.5 + 0.5;
}
`;

export const dotFragment = /* glsl */ `
precision highp float;

varying float vAlpha;
varying vec2 vUv;

uniform float uGlow;

void main() {
  // Circular anti-aliased dot
  float dist = length(vUv - 0.5) * 2.0;
  if (dist > 1.0) discard;

  float alpha = smoothstep(1.0, 0.6, dist) * vAlpha;

  // Soft core glow
  float core = smoothstep(0.5, 0.0, dist);
  alpha += core * 0.2 * uGlow;

  // White with very subtle blue shift
  vec3 color = mix(vec3(1.0), vec3(0.85, 0.92, 1.0), uGlow * 0.3);

  gl_FragColor = vec4(color, alpha);
}
`;
