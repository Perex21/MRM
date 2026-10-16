/*
 * The realm, rendered with three.js. Loaded on demand by RealmExplorer, so
 * the library never weighs on the first screen.
 *
 * Everything is generated: the terrain from realm.ts's height function, the
 * stone pillars as rough lathed columns, forests as instanced trees, the sea
 * of clouds as two noise-shaded layers with clearings over the destinations,
 * the sky with its moon and stars, the three destinations' architecture, the
 * golden routes between them, and the ginkgo leaves the guiding wind carries.
 *
 * One ink-wash shading model runs through all of it: tone from slope and
 * height, vertical texture strokes (cun) on rock, moonlit rims, and fog that
 * thickens with depth and lies low in the valley, tinted by whichever
 * destination the camera is nearest, so each place keeps its own mood inside
 * one world.
 */

import * as THREE from "three";
import {
  CLOUD_SEA,
  DESCENT,
  DESTINATIONS,
  EXTENT,
  GATE,
  LAKE,
  LOOK,
  VANTAGE,
  fbm,
  heightAt,
  makePillars,
  seeded,
  type Pillar,
  type Vec3,
} from "@/lib/realm";

export type Palette = Record<"ink" | "jade" | "silver" | "parchment" | "cinnabar" | "gold", string>;

export type RealmOptions = {
  /** "low" for small or weak devices: fewer trees and pillars, coarser land. */
  quality: "high" | "low";
  /** Reduced motion: time stands still and the camera cuts instead of flying. */
  still: boolean;
  palette: Palette;
};

export type Anchor = { slug: string; x: number; y: number; visible: boolean; depth: number };

export type Realm = {
  resize(width: number, height: number, dpr: number): void;
  /** How far the visitor has descended into the realm (0 above it, 1 on the terrace). */
  setDescent(p: number): void;
  /** Looking around from wherever the camera rests, -1…1 on each axis. */
  setLook(x: number, y: number): void;
  /** Light the route to a destination and send the guiding wind along it (null: none). */
  setFocus(slug: string | null): void;
  /** Fly to a destination, or home to the terrace. Resolves on arrival. */
  travel(to: string | "home"): Promise<void>;
  /**
   * Shift the picture by a fraction of the screen, so what the camera looks at
   * stays clear of a panel beside or below it. Eases there.
   */
  setFrame(x: number, y: number): void;
  /** Where the camera currently is: the terrace, a destination, or in flight. */
  readonly at: string | "home" | "flight" | "descent";
  render(now: number): void;
  anchors(): Anchor[];
  dispose(): void;
};

/* ------------------------------------------------------------------ */
/* Shared shader code                                                  */
/* ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }
`;

const ATMOSPHERE = /* glsl */ `
uniform float uTime;
uniform vec3 uMoonDir;
uniform vec3 uFog;
uniform vec3 uGlow;
uniform float uFogDensity;
uniform float uFogFalloff;
uniform float uHaze;
uniform float uVeil;
uniform float uMistY;
uniform vec3 uInk;
uniform vec3 uJade;
uniform vec3 uSilver;
uniform vec3 uParch;
uniform vec3 uGold;
uniform vec3 uCinnabar;

vec3 skyFog(vec3 dir) {
  float m = pow(max(dot(dir, uMoonDir), 0.0), 5.0);
  float horizon = 1.0 - smoothstep(-0.05, 0.35, dir.y);
  return uFog * (0.75 + 0.35 * horizon) + uGlow * m;
}

vec3 veilColor(vec3 dir) {
  vec3 q = cameraPosition + dir * 30.0;
  float wisp = fbm(q.xz * 0.06 + vec2(q.y * 0.05, uTime * 0.06));
  return skyFog(dir) * (0.4 + 1.25 * smoothstep(0.25, 0.75, wisp));
}

vec3 atmosphere(vec3 col, vec3 wp) {
  vec3 d = wp - cameraPosition;
  float dist = length(d);
  vec3 dir = d / max(dist, 0.001);
  float k = uFogFalloff;
  float h0 = max(cameraPosition.y, -5.0);
  float h1 = max(wp.y, -5.0);
  float dh = h1 - h0;
  float avg = abs(dh) > 0.5 ? (exp(-h0 * k) - exp(-h1 * k)) / (k * dh) : exp(-h0 * k);
  float fog = 1.0 - exp(-dist * uFogDensity * avg);
  fog = max(fog, 1.0 - exp(-dist * uHaze));
  // Mist lying low over the water and the fields, drifting.
  float mist = (1.0 - smoothstep(0.0, uMistY, wp.y)) * (0.45 + 0.55 * vnoise(wp.xz * 0.011 + vec2(uTime * 0.025, uTime * 0.01)));
  fog = max(fog, mist * (1.0 - exp(-dist * 0.006)) * 0.9);
  vec3 outc = mix(col, skyFog(dir), clamp(fog, 0.0, 1.0));
  // Inside cloud: everything but the nearest dissolves into moving wisps.
  return mix(outc, veilColor(dir), clamp(uVeil * (1.0 - exp(-dist * 0.035)), 0.0, 1.0));
}
`;

const SOLID_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
  model = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = model * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(model) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/** Land, rock and trees: ink-wash tone from slope and height, cun strokes on rock, moonlit rims. */
const LAND_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform float uKind;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float slope = 1.0 - clamp(n.y, 0.0, 1.0);
  float ndl = dot(n, uMoonDir);

  vec3 col;
  if (uKind > 1.5) {
    // Trees: dark jade, a little lighter where the moon touches the crowns.
    col = mix(uInk * 1.2, uJade * 0.5, 0.35 + 0.4 * smoothstep(-0.3, 0.8, ndl));
    col *= 0.85 + 0.3 * vnoise(vWorld.xz * 0.3);
  } else {
    float growth = (1.0 - smoothstep(0.3, 0.55, slope)) * smoothstep(-1.0, 5.0, vWorld.y);
    if (uKind > 0.5) growth *= smoothstep(0.85, 0.97, n.y);
    // Texture strokes run down the rock faces, as a brush would lay them.
    float stroke = vnoise(vec2((vWorld.x + vWorld.z) * 0.22 + vWorld.y * 0.02, vWorld.y * 0.03));
    stroke = smoothstep(0.2, 0.8, stroke) * smoothstep(0.25, 0.7, slope);
    vec3 rock = mix(uInk * 1.6, uSilver * 0.26, 0.18 + 0.25 * vnoise(vWorld.xz * 0.02 + vWorld.y * 0.01));
    rock *= 1.0 - stroke * 0.45;
    vec3 veg = mix(uInk * 1.15, uJade * 0.38, 0.5 + 0.5 * vnoise(vWorld.xz * 0.04));
    vec3 shore = uSilver * 0.22;
    col = mix(rock, veg, growth);
    col = mix(shore, col, smoothstep(0.5, 3.5, vWorld.y));
  }

  float light = 0.4 + 0.75 * smoothstep(-0.25, 0.85, ndl);
  col *= light;
  // Moonlit rim on silhouettes.
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * smoothstep(-0.2, 0.6, ndl);
  col += uSilver * 0.2 * rim;
  // Crests catch the light above the clouds.
  col = mix(col, uSilver * 0.4, smoothstep(0.9, 1.0, n.y) * smoothstep(${CLOUD_SEA.toFixed(1)}, ${(CLOUD_SEA + 90).toFixed(1)}, vWorld.y) * 0.55);
  gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
}
`;

/** Built things: painted surfaces with a light rim, and lanterns that glow. */
const BUILT_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec3 uColor;
uniform float uEmit;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 col;
  if (uEmit > 0.5) {
    col = uColor * (0.9 + 0.1 * sin(uTime * 3.0 + vWorld.x));
  } else {
    float ndl = dot(n, uMoonDir);
    col = uColor * (0.35 + 0.65 * smoothstep(-0.3, 0.9, ndl));
    col += uSilver * 0.14 * pow(1.0 - max(dot(n, v), 0.0), 3.0);
  }
  gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
}
`;

const WATER_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec2 uEcho;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 q = vWorld.xz * 0.05;
  float a = vnoise(q + vec2(0.0, -uTime * 0.5));
  float b = vnoise(q * 2.4 + vec2(uTime * 0.25, uTime * 0.18));
  vec3 n = normalize(vec3((a - 0.5) * 0.22, 1.0, (b - 0.5) * 0.22));
  // The echo: rings spreading from beneath the orb.
  vec2 e = vWorld.xz - uEcho;
  float de = length(e);
  float ring = sin(de * 0.3 - uTime * 1.4) * exp(-de * 0.016) * smoothstep(5.0, 16.0, de);
  n.xz += ring * 0.16 * (e / max(de, 0.001));
  n = normalize(n);
  vec3 r = reflect(-v, n);
  float fres = 0.05 + 0.95 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 col = mix(uInk * 0.5, skyFog(r) * 1.15, fres);
  col += uGlow * pow(max(dot(r, uMoonDir), 0.0), 160.0) * 1.6;
  col += uParch * 0.3 * exp(-pow(de / 16.0, 2.0)) * (0.5 + 0.5 * fres);
  gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
}
`;

const CLOUD_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec2 uClear[3];
uniform float uLayer;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec2 p = vWorld.xz * 0.0032 + vec2(uTime * 0.005, uTime * 0.0018) + uLayer * 7.3;
  vec2 w = vec2(fbm(p * 1.6 + 3.1), fbm(p * 1.6 - 2.3));
  float n = fbm(p + w * 0.7);
  float n2 = fbm(p + vec2(0.035, 0.025) + w * 0.7);
  float shade = clamp(0.5 + (n - n2) * 7.0, 0.0, 1.0);
  float d = smoothstep(0.38 + uLayer * 0.06, 0.7, n);
  d *= 1.0 - smoothstep(0.55, 1.0, length(vWorld.xz) / ${(EXTENT * 1.6).toFixed(1)});
  for (int i = 0; i < 3; i++) d *= smoothstep(55.0, 125.0, length(vWorld.xz - uClear[i]));
  bool above = cameraPosition.y > vWorld.y;
  vec3 lit = mix(uSilver * 0.3, uParch * 0.66, smoothstep(0.45, 0.9, n)) * (0.7 + 0.6 * shade) + uGlow * 0.15;
  vec3 col = above ? lit : uInk * 2.4 + uSilver * 0.04;
  float alpha = d * (above ? 0.88 : 0.8) * (1.0 - uLayer * 0.35);
  gl_FragColor = vec4(atmosphere(col, vWorld), alpha);
}
`;

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const SKY_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(skyFog(d), uInk * 0.55, smoothstep(0.02, 0.6, d.y));
  float md = dot(d, uMoonDir);
  col += uParch * 0.95 * smoothstep(0.99935, 0.99962, md);
  col += uGlow * (pow(max(md, 0.0), 40.0) * 0.5 + pow(max(md, 0.0), 400.0) * 0.6);
  vec2 sp = vec2(atan(d.z, d.x) * 160.0, asin(clamp(d.y, -1.0, 1.0)) * 160.0);
  float s = hash12(floor(sp));
  float point = smoothstep(0.22, 0.0, length(fract(sp) - 0.5));
  col += uSilver * step(0.994, s) * point * smoothstep(0.1, 0.45, d.y) * (0.5 + 0.3 * sin(uTime * 1.1 + s * 90.0));
  col = mix(col, veilColor(d), uVeil * 0.9);
  gl_FragColor = vec4(col, 1.0);
}
`;

const LEAF_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/** A ginkgo leaf: a fan with a notch at its crown and a short stem, in antique gold. */
const LEAF_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec2 p = vUv - vec2(0.5, 0.18);
  float r = length(p);
  float a = atan(p.x, p.y);
  float fan = step(abs(a), 1.05) * step(r, 0.72 - 0.16 * smoothstep(0.0, 0.1, 0.1 - abs(a)) + 0.04 * cos(a * 9.0));
  float stem = step(abs(vUv.x - 0.5 - (0.18 - vUv.y) * 0.3), 0.012) * step(vUv.y, 0.18) * step(0.02, vUv.y);
  float shape = max(fan * step(0.05, r), stem);
  if (shape < 0.5) discard;
  float veins = 0.85 + 0.15 * sin(a * 28.0);
  vec3 col = mix(uGold * 0.55, uGold * 1.15, smoothstep(0.1, 0.7, r)) * veins;
  gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
}
`;

/** The sentinel's beam: brightest at the lamp, fading along its length and at its edges. */
const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uSilver;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float soft = pow(abs(dot(normalize(vNormal), v)), 2.0);
  gl_FragColor = vec4(uSilver, pow(vUv.y, 3.0) * soft * 0.1);
}
`;

const ROUTE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/** A golden route: a thread of light with pulses travelling towards the destination. */
const ROUTE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform float uReveal;
uniform vec3 uGold;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  if (vUv.x > uReveal) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float core = pow(abs(dot(normalize(vNormal), v)), 1.4);
  float pulse = pow(fract(vUv.x * 9.0 - uTime * 0.3), 8.0);
  float a = core * (0.22 + 0.4 * uActive + pulse * (0.3 + 0.7 * uActive));
  float far = length(cameraPosition - vWorld);
  a *= (1.0 - smoothstep(700.0, 1500.0, far)) * smoothstep(25.0, 90.0, far);
  a *= smoothstep(0.0, 0.12, vUv.x);
  gl_FragColor = vec4(uGold * (1.1 + pulse * 0.8), a);
}
`;

/* ------------------------------------------------------------------ */
/* Textures drawn on canvas                                            */
/* ------------------------------------------------------------------ */

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.18, "rgba(255,255,255,0.55)");
  r.addColorStop(0.5, "rgba(255,255,255,0.12)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function puffTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const rand = seeded(11);
  for (let i = 0; i < 26; i++) {
    const x = 64 + (rand() - 0.5) * 60;
    const y = 64 + (rand() - 0.5) * 34;
    const rad = 18 + rand() * 30;
    const r = g.createRadialGradient(x, y, 0, x, y, rad);
    r.addColorStop(0, "rgba(255,255,255,0.22)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ */
/* The realm                                                           */
/* ------------------------------------------------------------------ */

const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Fog tints that give each destination its own light. */
const MOODS = {
  moon: { fog: [0.0, 0.012, 0.03], glow: [0.04, 0.06, 0.09] },
  jade: { fog: [0.0, 0.03, 0.012], glow: [0.0, 0.04, 0.02] },
  dusk: { fog: [0.05, 0.022, 0.0], glow: [0.16, 0.08, 0.02] },
} as const;

export function createRealm(canvas: HTMLCanvasElement, options: RealmOptions): Realm {
  const { quality, still, palette } = options;
  const low = quality === "low";

  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(palette.ink);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 6000);

  const col = (hex: string) => new THREE.Color(hex);
  const C = {
    ink: col(palette.ink),
    jade: col(palette.jade),
    silver: col(palette.silver),
    parchment: col(palette.parchment),
    cinnabar: col(palette.cinnabar),
    gold: col(palette.gold),
  };
  const baseFog = new THREE.Color(0.2, 0.214, 0.204);
  const baseGlow = new THREE.Color(0.27, 0.28, 0.26);

  // One set of atmosphere uniforms, shared by every material.
  const shared = {
    uTime: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(-0.42, 0.34, -0.84).normalize() },
    uFog: { value: baseFog.clone() },
    uGlow: { value: baseGlow.clone() },
    uFogDensity: { value: 0.0032 },
    uFogFalloff: { value: 0.011 },
    uHaze: { value: 0.0005 },
    uVeil: { value: 0 },
    uMistY: { value: 26 },
    uInk: { value: C.ink },
    uJade: { value: C.jade },
    uSilver: { value: C.silver },
    uParch: { value: C.parchment },
    uGold: { value: C.gold },
    uCinnabar: { value: C.cinnabar },
  };

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T) => {
    disposables.push(thing);
    return thing;
  };

  const solid = (fragment: string, extra: Record<string, THREE.IUniform> = {}, opts: Partial<THREE.ShaderMaterialParameters> = {}) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: SOLID_VERTEX,
        fragmentShader: fragment,
        uniforms: { ...shared, ...extra },
        ...opts,
      }),
    );
  const land = solid(LAND_FRAGMENT, { uKind: { value: 0 } });
  const rock = solid(LAND_FRAGMENT, { uKind: { value: 1 } });
  const foliage = solid(LAND_FRAGMENT, { uKind: { value: 2 } });
  const built = (color: THREE.Color, emit = false) =>
    solid(BUILT_FRAGMENT, { uColor: { value: color }, uEmit: { value: emit ? 1 : 0 } });

  const painted = built(C.ink.clone().multiplyScalar(1.5));
  const roofs = built(C.ink.clone().multiplyScalar(1.1));
  const timber = built(C.cinnabar.clone().multiplyScalar(0.55));
  const stone = built(C.silver.clone().multiplyScalar(0.45));
  const lantern = built(C.gold.clone().multiplyScalar(1.25), true);
  const beacon = built(C.cinnabar.clone().multiplyScalar(1.6), true);

  /* ---------- Land ---------- */
  {
    const size = EXTENT * 2.6;
    const segments = low ? 190 : 320;
    const geometry = keep(new THREE.PlaneGeometry(size, size, segments, segments));
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geometry.computeVertexNormals();
    scene.add(new THREE.Mesh(geometry, land));

    const water = keep(new THREE.PlaneGeometry(size, size, 1, 1));
    water.rotateX(-Math.PI / 2);
    const echo = DESTINATIONS[2].anchor;
    const waterMaterial = solid(WATER_FRAGMENT, { uEcho: { value: new THREE.Vector2(echo[0], echo[2]) } });
    scene.add(new THREE.Mesh(water, waterMaterial));
  }

  /* ---------- Pillars ---------- */
  const pillars = makePillars(low ? 34 : 58);
  {
    const radial = low ? 12 : 18;
    const rows = low ? 18 : 28;
    for (const p of pillars) scene.add(new THREE.Mesh(keep(pillarGeometry(p, radial, rows)), rock));
  }

  /* ---------- Forests ---------- */
  {
    // A pine of three tiers, as one lathed shape.
    const cone = keep(
      new THREE.LatheGeometry(
        [
          [0.08, 0], [0.08, 0.16], [0.62, 0.2], [0.24, 0.46], [0.48, 0.44], [0.16, 0.7], [0.32, 0.68], [0.0, 1.0],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        6,
      ),
    );
    const spots: THREE.Matrix4[] = [];
    const rand = seeded(77);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const t = new THREE.Vector3();
    const place = (x: number, y: number, z: number, scale: number) => {
      const h = (5 + rand() * 9) * scale;
      t.set(x, y - 0.5, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
      s.set(h * 0.28, h, h * 0.28);
      spots.push(m.compose(t, q, s).clone());
    };
    const want = low ? 1100 : 2600;
    for (let tries = 0; spots.length < want && tries < want * 12; tries++) {
      const x = (rand() * 2 - 1) * EXTENT * 0.85;
      const z = (rand() * 2 - 1) * EXTENT * 0.85;
      if (fbm(x * 0.006 + 40, z * 0.006) < 0.5) continue;
      const y = heightAt(x, z);
      if (y < 2.5 || y > 130) continue;
      const slope = Math.abs(heightAt(x + 3, z) - y) + Math.abs(heightAt(x, z + 3) - y);
      if (slope > 4) continue;
      if (Math.hypot(x - GATE.x, z - GATE.z) < 130) continue;
      if (pillars.some((p) => Math.hypot(p.x - x, p.z - z) < p.radius * 1.15)) continue;
      place(x, y, z, 1);
    }
    // Groves crown the pillars.
    for (const p of pillars) {
      const n = Math.round(p.radius / 2.5);
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.28;
        const r = Math.sqrt(rand()) * p.radius * 0.6;
        place(p.x + Math.cos(a) * r, p.height + 0.6, p.z + Math.sin(a) * r, 0.9 + rand() * 0.5);
      }
    }
    const trees = new THREE.InstancedMesh(cone, foliage, spots.length);
    spots.forEach((matrix, i) => trees.setMatrixAt(i, matrix));
    scene.add(trees);
  }

  /* ---------- The sea of clouds ---------- */
  const clear = DESTINATIONS.map((d) => new THREE.Vector2(d.anchor[0], d.anchor[2]));
  clear[0] = new THREE.Vector2(9999, 9999); // The spire rises above the clouds; no clearing needed.
  for (const layer of [0, 1]) {
    const geometry = keep(new THREE.PlaneGeometry(EXTENT * 3.2, EXTENT * 3.2, 1, 1));
    geometry.rotateX(-Math.PI / 2);
    const material = solid(
      CLOUD_FRAGMENT,
      { uClear: { value: clear }, uLayer: { value: layer } },
      { transparent: true, depthWrite: false, side: THREE.DoubleSide },
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = CLOUD_SEA + layer * 16;
    mesh.renderOrder = 2 + layer;
    scene.add(mesh);
  }

  // Puffs: cloud in the descent, banks of mist in the valley.
  const puffMap = keep(puffTexture());
  {
    const rand = seeded(5);
    const count = low ? 34 : 70;
    for (let i = 0; i < count; i++) {
      const valley = i % 3 === 0;
      const material = keep(
        new THREE.SpriteMaterial({
          map: puffMap,
          color: valley ? C.silver.clone().multiplyScalar(0.42) : C.silver.clone().multiplyScalar(0.62),
          transparent: true,
          depthWrite: false,
          opacity: valley ? 0.45 : 0.75,
        }),
      );
      const sprite = new THREE.Sprite(material);
      const angle = rand() * Math.PI * 2;
      const radius = valley ? 60 + rand() * 520 : rand() * 420;
      const x = valley ? Math.cos(angle) * radius : (rand() - 0.5) * 300;
      const z = valley ? Math.sin(angle) * radius - 120 : 420 - rand() * 380;
      const y = valley ? 14 + rand() * 26 : CLOUD_SEA - 30 + rand() * 70;
      sprite.position.set(x, y, z);
      const size = valley ? 110 + rand() * 120 : 90 + rand() * 120;
      sprite.scale.set(size * 1.8, size * 0.7, 1);
      sprite.renderOrder = 4;
      scene.add(sprite);
    }
  }

  /* ---------- Sky ---------- */
  const sky = new THREE.Mesh(
    keep(new THREE.SphereGeometry(4000, 32, 16)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: shared,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    ),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---------- The destinations ---------- */
  const glowMap = keep(glowTexture());
  const glow = (color: THREE.Color, size: number, opacity = 1) => {
    const sprite = new THREE.Sprite(
      keep(
        new THREE.SpriteMaterial({
          map: glowMap,
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    sprite.scale.setScalar(size);
    sprite.renderOrder = 5;
    return sprite;
  };

  // The Sentinel Spire: a watchtower on the tallest pillar, its beam sweeping the realm.
  const spire = pillars[0];
  const tower = pagoda(4, 15, { painted, roofs, timber, lantern, keep });
  tower.position.set(spire.x, spire.height - 1, spire.z);
  scene.add(tower);
  const towerTop = spire.height + 34;
  const towerBeacon = new THREE.Mesh(keep(new THREE.SphereGeometry(1.6, 12, 8)), beacon);
  towerBeacon.position.set(spire.x, towerTop, spire.z);
  scene.add(towerBeacon);
  const towerGlow = glow(C.cinnabar.clone().multiplyScalar(1.4), 46);
  towerGlow.position.copy(towerBeacon.position);
  scene.add(towerGlow);
  const beam = new THREE.Mesh(
    keep(new THREE.ConeGeometry(42, 420, 24, 1, true)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: ROUTE_VERTEX,
        fragmentShader: BEAM_FRAGMENT,
        uniforms: { uSilver: shared.uSilver },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
  );
  beam.geometry.translate(0, -210, 0);
  const beamPivot = new THREE.Group();
  beamPivot.position.set(spire.x, towerTop - 3, spire.z);
  beam.rotation.z = Math.PI / 2 - 0.12;
  beamPivot.add(beam);
  scene.add(beamPivot);

  // The Ledger Bridge: a stone arch joining two pillars, a gatehouse on each, lanterns along it.
  const [left, right] = [pillars[1], pillars[2]];
  const deck = Math.min(left.height, right.height) - 4;
  const bridge = archBridge(left.x + left.radius * 0.7, right.x - right.radius * 0.7, deck, (left.z + right.z) / 2, stone, keep);
  scene.add(bridge);
  for (const p of [left, right]) {
    const house = pagoda(1, 13, { painted, roofs, timber, lantern, keep });
    house.position.set(p.x + (p === left ? -4 : 4), p.height - 1, p.z);
    scene.add(house);
  }
  for (let i = 0; i <= 4; i++) {
    const x = THREE.MathUtils.lerp(left.x + left.radius * 0.7, right.x - right.radius * 0.7, i / 4);
    const arc = Math.sin((i / 4) * Math.PI) * 5;
    const g = glow(C.gold.clone().multiplyScalar(0.9), 9, 0.9);
    g.position.set(x, deck + arc + 4, (left.z + right.z) / 2 + 4);
    scene.add(g);
  }

  // The Echo Lake: a pavilion on the far shore, and a pale orb above its own ripples.
  const pavilion = hexPavilion({ painted, roofs, timber, lantern, keep });
  const shoreX = LAKE.x + 34;
  const shoreZ = LAKE.z - LAKE.radius * 0.95;
  pavilion.position.set(shoreX, Math.max(1, heightAt(shoreX, shoreZ)), shoreZ);
  scene.add(pavilion);
  const orb = new THREE.Mesh(
    keep(new THREE.SphereGeometry(9, 40, 24)),
    keep(
      new THREE.ShaderMaterial({
        vertexShader: SOLID_VERTEX,
        fragmentShader: /* glsl */ `
          ${NOISE}
          ${ATMOSPHERE}
          varying vec3 vWorld;
          varying vec3 vNormal;
          void main() {
            vec3 n = normalize(vNormal);
            vec3 v = normalize(cameraPosition - vWorld);
            float lit = 0.55 + 0.45 * dot(n, normalize(vec3(-0.3, 0.6, 0.6)));
            vec3 col = mix(uGold * 0.85, uParch, smoothstep(0.1, 0.9, lit));
            col += uGold * 0.5 * pow(1.0 - max(dot(n, v), 0.0), 2.5);
            gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
          }
        `,
        uniforms: shared,
      }),
    ),
  );
  orb.position.set(DESTINATIONS[2].anchor[0], 30, DESTINATIONS[2].anchor[2]);
  scene.add(orb);
  const orbGlow = glow(C.gold.clone().multiplyScalar(0.7), 70, 0.7);
  orbGlow.position.copy(orb.position);
  scene.add(orbGlow);

  // The terrace's stone balustrade and its two lanterns: the foreground the visitor looks out over.
  {
    const edge = (x: number) => VANTAGE.position[2] - 44 + x * x * 0.005;
    const post = keep(new THREE.BoxGeometry(0.5, 2.2, 0.5));
    const rail = keep(new THREE.BoxGeometry(4.4, 0.35, 0.45));
    for (let x = -34; x <= 34; x += 4.25) {
      const m = new THREE.Mesh(post, stone);
      m.position.set(x, GATE.height + 1.1, edge(x));
      scene.add(m);
      if (x + 4.25 <= 34) {
        const r = new THREE.Mesh(rail, stone);
        r.position.set(x + 2.125, GATE.height + 2.1, (edge(x) + edge(x + 4.25)) / 2);
        r.rotation.y = -Math.atan2(edge(x + 4.25) - edge(x), 4.25);
        scene.add(r);
      }
    }
    for (const side of [-1, 1]) {
      const lamp = stoneLantern({ painted, roofs, timber, lantern, keep }, stone);
      lamp.position.set(side * 40, GATE.height, edge(side * 40) + 2);
      scene.add(lamp);
      const g = glow(C.gold.clone().multiplyScalar(0.9), 10, 0.9);
      g.position.set(side * 40, GATE.height + 5.2, edge(side * 40) + 2);
      scene.add(g);
    }
  }

  // A beacon over each destination, seen from far off and from above the clouds.
  const beacons = DESTINATIONS.map((d) => {
    const b = glow(C.gold.clone(), 30, 0.85);
    b.position.copy(v3(d.anchor));
    scene.add(b);
    return b;
  });

  /* ---------- Golden routes ---------- */
  const start = new THREE.Vector3(GATE.x, GATE.height + 10, VANTAGE.position[2] - 110);
  const routes = DESTINATIONS.map((d) => {
    const points = [start, ...d.via.map(v3), v3(d.view.position).lerp(v3(d.anchor), 0.55), v3(d.anchor)];
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const material = keep(
      new THREE.ShaderMaterial({
        vertexShader: ROUTE_VERTEX,
        fragmentShader: ROUTE_FRAGMENT,
        uniforms: { uTime: shared.uTime, uGold: shared.uGold, uActive: { value: 0 }, uReveal: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const mesh = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 220, 0.3, 6, false)), material);
    mesh.renderOrder = 6;
    scene.add(mesh);
    return { slug: d.slug, curve, material, active: 0 };
  });

  /* ---------- The guiding wind: ginkgo leaves ---------- */
  const leafCount = low ? 36 : 72;
  const leafPlane = keep(new THREE.PlaneGeometry(2.2, 2.2));
  const leafMaterial = keep(
    new THREE.ShaderMaterial({
      vertexShader: LEAF_VERTEX,
      fragmentShader: LEAF_FRAGMENT,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const leaves = new THREE.InstancedMesh(leafPlane, leafMaterial, leafCount);
  leaves.frustumCulled = false;
  leaves.renderOrder = 7;
  scene.add(leaves);
  const leafSeeds = Array.from({ length: leafCount }, (_, i) => {
    const r = seeded(900 + i);
    return { u: r(), speed: 0.05 + r() * 0.06, radius: 2 + r() * 14, angle: r() * 6.28, spin: (r() - 0.5) * 6, flip: 2 + r() * 5 };
  });
  let leafPath: THREE.Curve<THREE.Vector3> | null = null;
  let leafStrength = 0;
  let leafTarget = 0;

  /* ---------- Camera ---------- */
  const descent = new THREE.CatmullRomCurve3(DESCENT.map((k) => v3(k.position)), false, "centripetal");
  const descentLook = new THREE.CatmullRomCurve3(DESCENT.map((k) => v3(k.target)), false, "centripetal");
  // Map the keyframes' `at` onto the curve's own parameter.
  const keyAt = DESCENT.map((k) => k.at);
  const curveU = (p: number) => {
    const n = keyAt.length - 1;
    for (let i = 0; i < n; i++) {
      if (p <= keyAt[i + 1]) return (i + (p - keyAt[i]) / (keyAt[i + 1] - keyAt[i])) / n;
    }
    return 1;
  };

  let descentP = 0;
  let at: Realm["at"] = "descent";
  const look = { x: 0, y: 0, sx: 0, sy: 0 };
  const rest = { position: v3(VANTAGE.position), target: v3(VANTAGE.target) };
  let flight: {
    path: THREE.CatmullRomCurve3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    start: number;
    duration: number;
    to: string;
    resolve: () => void;
  } | null = null;
  let focus: string | null = null;
  let width = 1;
  let height = 1;
  let baseFov = 54;
  const frame = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = 0;
  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const placeCamera = (now: number) => {
    if (flight) {
      const t = Math.min(1, Math.max(0, (now - flight.start) / flight.duration));
      const u = easeInOut(t);
      flight.path.getPointAt(u, camera.position);
      const ahead = flight.path.getPointAt(Math.min(1, u + 0.06), tmp);
      target.copy(flight.fromTarget).lerp(ahead, smoothstep(0, 0.25, t));
      target.lerp(flight.toTarget, smoothstep(0.5, 0.95, t));
      camera.fov = baseFov + Math.sin(Math.PI * t) * 9;
      camera.updateProjectionMatrix();
      if (t >= 1) {
        const done = flight;
        flight = null;
        at = done.to;
        rest.position.copy(camera.position);
        rest.target.copy(done.toTarget);
        done.resolve();
      }
    } else if (at === "descent") {
      const u = curveU(descentP);
      descent.getPoint(u, camera.position);
      descentLook.getPoint(u, target);
    } else {
      camera.position.copy(rest.position);
      target.copy(rest.target);
    }

    // Looking around: the gaze turns about the camera; a breath of drift keeps it alive.
    const free = at !== "descent" && !flight ? 1 : at === "descent" ? smoothstep(0.92, 1, descentP) : 0;
    look.sx += (look.x - look.sx) * 0.08;
    look.sy += (look.y - look.sy) * 0.08;
    const reach = at === "home" || at === "descent" ? 1 : 0.35;
    const yaw = -look.sx * LOOK.yaw * reach * free;
    const pitch = look.sy * LOOK.pitch * reach * free;
    tmp.copy(target).sub(camera.position);
    tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const flat = Math.hypot(tmp.x, tmp.z);
    tmp.y += flat * Math.tan(pitch);
    if (!still) {
      camera.position.y += Math.sin(clock * 0.4) * 0.35 * free;
      tmp.x += Math.sin(clock * 0.23) * flat * 0.004 * free;
    }
    camera.lookAt(tmp.add(camera.position));
  };

  const updateAtmosphere = () => {
    // Inside the cloud layer, and at the very start of the descent, the world dissolves.
    const inCloud = 1 - smoothstep(10, 34, Math.abs(camera.position.y - (CLOUD_SEA + 8)));
    const dark = at === "descent" ? 1 - smoothstep(0.02, 0.14, descentP) : 0;
    shared.uVeil.value = Math.max(inCloud * 0.92, dark);
    // Each destination tints the air around it.
    const fog = shared.uFog.value.copy(baseFog);
    const glowColor = shared.uGlow.value.copy(baseGlow);
    for (const d of DESTINATIONS) {
      const w = 1 - smoothstep(60, 320, camera.position.distanceTo(v3(d.view.position)));
      const mood = MOODS[d.mood];
      fog.r += mood.fog[0] * w;
      fog.g += mood.fog[1] * w;
      fog.b += mood.fog[2] * w;
      glowColor.r += mood.glow[0] * w;
      glowColor.g += mood.glow[1] * w;
      glowColor.b += mood.glow[2] * w;
    }
    if (dark > 0) fog.multiplyScalar(1 - dark * 0.55);
  };

  const updateLife = (dt: number) => {
    // The sentinel's beam sweeps slowly round.
    beamPivot.rotation.y = still ? 0.6 : clock * 0.22;
    // The orb breathes above the water.
    orb.position.y = 30 + (still ? 0 : Math.sin(clock * 0.6) * 1.4);
    orbGlow.position.y = orb.position.y;

    // Routes glow when focused or travelled.
    for (const r of routes) {
      const want = r.slug === focus || (flight && flight.to === r.slug) ? 1 : 0;
      r.active += (want - r.active) * Math.min(1, dt * 4);
      r.material.uniforms.uActive.value = r.active;
    }
    beacons.forEach((b, i) => {
      const d = DESTINATIONS[i];
      const near = camera.position.distanceTo(b.position);
      const hot = d.slug === focus ? 1.5 : 1;
      b.scale.setScalar(Math.max(18, near * 0.05) * hot);
      (b.material as THREE.SpriteMaterial).opacity = (at === d.slug ? 0.25 : 0.85) * (1 - shared.uVeil.value * 0.8);
    });

    // The guiding wind: leaves stream along the focused route, or with the camera in flight.
    leafTarget = flight ? 1 : focus ? 0.55 : 0;
    leafStrength += (leafTarget - leafStrength) * Math.min(1, dt * 2.5);
    if (flight) leafPath = flight.path;
    else if (focus) leafPath = routes.find((r) => r.slug === focus)?.curve ?? leafPath;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const camU = flight ? easeInOut(Math.min(1, Math.max(0, (performance.now() - flight.start) / flight.duration))) : 0;
    leafSeeds.forEach((seed, i) => {
      if (!leafPath || leafStrength < 0.01 || still) {
        s.setScalar(0);
        leaves.setMatrixAt(i, m.compose(p.set(0, -999, 0), q, s));
        return;
      }
      seed.u = (seed.u + seed.speed * dt * (flight ? 1.6 : 1)) % 1;
      const u = flight ? Math.min(1, camU + 0.02 + seed.u * 0.22) : seed.u;
      leafPath.getPointAt(u, p);
      const a = seed.angle + clock * 0.8;
      const r = seed.radius * (flight ? 0.8 : 1);
      p.x += Math.cos(a) * r;
      p.y += Math.sin(a * 1.3) * r * 0.5;
      p.z += Math.sin(a) * r;
      e.set(clock * seed.spin * 0.3, clock * seed.spin * 0.2 + i, Math.sin(clock * seed.flip) * 1.2);
      q.setFromEuler(e);
      const fade = Math.sin(Math.PI * (flight ? (u - camU) / 0.24 : u));
      s.setScalar(leafStrength * Math.max(0, fade) * (flight ? 0.8 : 1.4));
      leaves.setMatrixAt(i, m.compose(p, q, s));
    });
    leaves.instanceMatrix.needsUpdate = true;
  };

  let last = 0;
  const realm: Realm = {
    get at() {
      return flight ? "flight" : at;
    },
    resize(w, h, dpr) {
      width = w;
      height = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Narrow screens see the realm through a wider lens.
      baseFov = w < h ? 64 : 54;
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    },
    setDescent(p) {
      descentP = p;
      if (p < 0.999 && at !== "descent") {
        // Scrolling back up out of the realm returns the camera to the path.
        flight?.resolve();
        flight = null;
        at = "descent";
      } else if (p >= 0.999 && at === "descent") {
        at = "home";
        rest.position.copy(v3(VANTAGE.position));
        rest.target.copy(v3(VANTAGE.target));
      }
    },
    setLook(x, y) {
      look.x = Math.max(-1, Math.min(1, x));
      look.y = Math.max(-1, Math.min(1, y));
    },
    setFocus(slug) {
      focus = slug;
    },
    setFrame(x, y) {
      frame.tx = x;
      frame.ty = y;
      if (still) {
        frame.x = x;
        frame.y = y;
      }
    },
    travel(to) {
      const toHome = to === "home";
      const dest = toHome ? null : DESTINATIONS.find((d) => d.slug === to);
      if (!toHome && !dest) return Promise.resolve();
      const end = toHome ? v3(VANTAGE.position) : v3(dest!.view.position);
      const endTarget = toHome ? v3(VANTAGE.target) : v3(dest!.view.target);
      flight?.resolve();
      if (still) {
        flight = null;
        at = to;
        rest.position.copy(end);
        rest.target.copy(endTarget);
        look.x = look.y = look.sx = look.sy = 0;
        return Promise.resolve();
      }
      const from = camera.position.clone();
      const fromTarget = target.clone();
      const current = at === "home" || at === "descent" ? null : DESTINATIONS.find((d) => d.slug === at);
      let points: THREE.Vector3[];
      if (toHome) points = [from, ...(current ? [...current.via].reverse().map(v3) : []), end];
      else if (!current) points = [from, ...dest!.via.map(v3), end];
      else {
        const mid = from.clone().lerp(end, 0.5);
        mid.y = Math.max(from.y, end.y) + 70;
        points = [from, mid, end];
      }
      const path = new THREE.CatmullRomCurve3(points, false, "centripetal");
      const duration = Math.min(4600, Math.max(2600, path.getLength() * 7.5));
      look.x = look.y = 0;
      return new Promise<void>((resolve) => {
        flight = { path, fromTarget, toTarget: endTarget, start: performance.now(), duration, to, resolve };
      });
    },
    render(now) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      if (!still) clock += dt;
      shared.uTime.value = clock;
      placeCamera(now);
      frame.x += (frame.tx - frame.x) * Math.min(1, dt * 3);
      frame.y += (frame.ty - frame.y) * Math.min(1, dt * 3);
      if (Math.abs(frame.x) > 0.001 || Math.abs(frame.y) > 0.001) camera.setViewOffset(width, height, frame.x * width, frame.y * height, width, height);
      else camera.clearViewOffset();
      sky.position.copy(camera.position);
      updateAtmosphere();
      updateLife(dt);
      renderer.render(scene, camera);
    },
    anchors() {
      return DESTINATIONS.map((d) => {
        tmp.copy(v3(d.anchor)).project(camera);
        const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15;
        return {
          slug: d.slug,
          x: (tmp.x * 0.5 + 0.5) * width,
          y: (-tmp.y * 0.5 + 0.5) * height,
          visible,
          depth: camera.position.distanceTo(v3(d.anchor)),
        };
      });
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
  return realm;
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

/**
 * A stone pillar: a lathed column, flared at the foot, banded with strata
 * where softer rock has weathered back, flat on top, roughened by noise.
 */
function pillarGeometry(p: Pillar, radial: number, rows: number): THREE.BufferGeometry {
  const rand = seeded(p.seed);
  const profile: THREE.Vector2[] = [];
  const strata = 10 + rand() * 8;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = -10 + t * (p.height + 10);
    const flare = 1 + 0.55 * Math.pow(1 - t, 4);
    const taper = 1 - 0.22 * t;
    const band = 1 + 0.07 * Math.abs(Math.sin((y / strata) * Math.PI)) + (rand() - 0.5) * 0.08;
    profile.push(new THREE.Vector2(p.radius * flare * taper * band, y));
  }
  profile.push(new THREE.Vector2(p.radius * 0.55, p.height + 0.8));
  profile.push(new THREE.Vector2(0.01, p.height + 1.4));
  const geometry = new THREE.LatheGeometry(profile, radial);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Noise read around the column's circumference, so it closes without a seam.
    const len = Math.hypot(x, z) || 1;
    const n = fbm((x / len) * 1.6 + y * 0.022 + (p.seed % 97), (z / len) * 1.6 + y * 0.031, 3) - 0.5;
    const k = 1 + n * 0.55;
    pos.setXYZ(i, x * k + p.x, y, z * k + p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

type Materials = {
  painted: THREE.Material;
  roofs: THREE.Material;
  timber: THREE.Material;
  lantern?: THREE.Material;
  keep: <T extends { dispose(): void }>(thing: T) => T;
};

/** A roof: a shallow four-sided frustum with wide eaves. */
function roof(width: number, rise: number, keep: Materials["keep"]): THREE.BufferGeometry {
  const g = keep(new THREE.CylinderGeometry(width * 0.16, width * 0.82, rise, 4, 1));
  g.rotateY(Math.PI / 4);
  return g;
}

/** A pagoda of `levels` tiers, `base` wide, standing on y = 0 of its group. */
function pagoda(levels: number, base: number, m: Materials): THREE.Group {
  const group = new THREE.Group();
  let y = 0;
  let w = base;
  const plinth = new THREE.Mesh(m.keep(new THREE.BoxGeometry(w * 1.25, 2.4, w * 1.25)), m.painted);
  plinth.position.y = 1.2;
  group.add(plinth);
  y = 2.4;
  for (let i = 0; i < levels; i++) {
    const h = i === 0 ? 7 : 5.2;
    const body = new THREE.Mesh(m.keep(new THREE.BoxGeometry(w * 0.72, h, w * 0.72)), i % 2 ? m.painted : m.timber);
    body.position.y = y + h / 2;
    group.add(body);
    if (m.lantern) {
      // Lit windows on every face.
      for (const [sx, sz] of [
        [0.4, 0.75],
        [0.75, 0.4],
      ]) {
        const lamp = new THREE.Mesh(m.keep(new THREE.BoxGeometry(w * sx, h * 0.32, w * sz)), m.lantern);
        lamp.position.y = y + h * 0.5;
        group.add(lamp);
      }
    }
    y += h;
    const r = new THREE.Mesh(roof(w * 1.55, 2.6, m.keep), m.roofs);
    r.position.y = y + 1.1;
    group.add(r);
    y += 2.2;
    w *= 0.82;
  }
  const spire = new THREE.Mesh(m.keep(new THREE.ConeGeometry(0.6, 9, 6)), m.roofs);
  spire.position.y = y + 4.5;
  group.add(spire);
  return group;
}

/** A hexagonal pavilion on six posts. */
function hexPavilion(m: Materials): THREE.Group {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(m.keep(new THREE.CylinderGeometry(11, 12, 2.2, 6)), m.painted);
  floor.position.y = 1.1;
  group.add(floor);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(m.keep(new THREE.CylinderGeometry(0.5, 0.5, 9, 6)), m.timber);
    post.position.set(Math.cos(a) * 8.5, 6.6, Math.sin(a) * 8.5);
    group.add(post);
  }
  const top = new THREE.Mesh(m.keep(new THREE.CylinderGeometry(1, 14, 5, 6)), m.roofs);
  top.position.y = 13.4;
  group.add(top);
  const finial = new THREE.Mesh(m.keep(new THREE.ConeGeometry(0.6, 5, 6)), m.roofs);
  finial.position.y = 18;
  group.add(finial);
  if (m.lantern) {
    const lamp = new THREE.Mesh(m.keep(new THREE.BoxGeometry(2, 2.6, 2)), m.lantern);
    lamp.position.y = 8;
    group.add(lamp);
  }
  return group;
}

/** A stone lantern: base, shaft, a lit light-box and a small roof. */
function stoneLantern(m: Materials, stone: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const parts: [THREE.BufferGeometry, number, THREE.Material][] = [
    [m.keep(new THREE.BoxGeometry(2.6, 0.8, 2.6)), 0.4, stone],
    [m.keep(new THREE.CylinderGeometry(0.45, 0.6, 3, 6)), 2.3, stone],
    [m.keep(new THREE.BoxGeometry(2, 0.5, 2)), 4, stone],
    [m.keep(new THREE.BoxGeometry(1.5, 1.5, 1.5)), 5, m.lantern ?? stone],
  ];
  for (const [geometry, y, material] of parts) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    group.add(mesh);
  }
  const top = new THREE.Mesh(roof(3.4, 1.4, m.keep), m.roofs);
  top.position.y = 6.4;
  group.add(top);
  return group;
}

/** A stone arch bridge from x0 to x1 at deck height y, across z. */
function archBridge(x0: number, x1: number, y: number, z: number, material: THREE.Material, keep: Materials["keep"]): THREE.Group {
  const group = new THREE.Group();
  const span = x1 - x0;
  const shape = new THREE.Shape();
  const steps = 24;
  shape.moveTo(0, 0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    shape.lineTo(t * span, 2.6 + Math.sin(t * Math.PI) * 5);
  }
  shape.lineTo(span, -12);
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    shape.lineTo(t * span, -12 + Math.sin(t * Math.PI) * 9.5);
  }
  shape.lineTo(0, -12);
  shape.closePath();
  const geometry = keep(new THREE.ExtrudeGeometry(shape, { depth: 7, bevelEnabled: false }));
  geometry.translate(x0, y - 2, z - 3.5);
  group.add(new THREE.Mesh(geometry, material));
  // Rails.
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const post = new THREE.Mesh(keep(new THREE.BoxGeometry(0.5, 2.2, 0.5)), material);
      post.position.set(x0 + t * span, y + 1.7 + Math.sin(t * Math.PI) * 5, z + side * 3.2);
      group.add(post);
    }
  }
  return group;
}

