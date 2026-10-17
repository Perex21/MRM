/*
 * The realm, rendered with three.js. Loaded on demand by RealmExplorer, so
 * the library never weighs on the first screen.
 *
 * The world is built from realm.ts: the land from its height function, the
 * waters, falls, landmarks and routes from its data. Everything is generated
 * here — no downloaded models or textures — and static architecture is merged
 * per material, so the whole world draws in a few dozen calls.
 *
 * Light: a low golden sun in the west, a cool sky from above, warm bounce from
 * below. Air: aerial perspective that fades distant ranges into the horizon's
 * own colour, patchy mist lying in the valleys, a lit sea of cloud with
 * clearings over the destinations. Each region tints the light as the camera
 * nears it — storm-cold at the Sentinel, golden at the Ledger, jade at the
 * Echo — so three moods share one world.
 *
 * Building the land takes a few hundred thousand height samples; the build is
 * spread over animation frames so it never freezes the page.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { perfProbe } from "@/lib/frames";
import {
  BRIDGE,
  CLOUD_BANK,
  CLOUD_SEA,
  DESCENT,
  DESTINATIONS,
  EXTENT,
  FALLS,
  FLOATING,
  FORTRESS,
  HORIZON,
  LAKE,
  LOOK,
  OVERLOOK,
  PLATEAU,
  SUMMIT,
  VANTAGE,
  fbm,
  heightAt,
  inLake,
  makePillars,
  riverX,
  seeded,
  type Pillar,
  type Vec3,
} from "@/lib/realm";

export type Palette = Record<"ink" | "jade" | "silver" | "parchment" | "cinnabar" | "gold", string>;

export type RealmOptions = {
  /** Reduced motion: time stands still and the camera cuts instead of flying. */
  still: boolean;
  palette: Palette;
};

export type Anchor = { slug: string; x: number; y: number; visible: boolean; depth: number };

export type Realm = {
  resize(width: number, height: number, dpr: number): void;
  /** How far the visitor has descended into the realm (0 above it, 1 on the Overlook). */
  setDescent(p: number): void;
  /** Looking around from wherever the camera rests, -1…1 on each axis. */
  setLook(x: number, y: number): void;
  /** Light the route to a destination and send the guiding wind along it (null: none). */
  setFocus(slug: string | null): void;
  /** Fly to a destination, or home to the Overlook. Resolves on arrival. */
  travel(to: string | "home"): Promise<void>;
  /**
   * Shift the picture by a fraction of the screen, so what the camera looks at
   * stays clear of the details beside or below it. Eases there.
   */
  setFrame(x: number, y: number): void;
  /** Where the camera currently is: the Overlook, a destination, or in flight. */
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
float fbm3(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; } return s; }
`;

/**
 * Sky, light and air, shared by every material. The fog's colour is the sky's
 * own colour at the horizon in that direction, so distant land dissolves into
 * the sky instead of into a flat grey.
 */
const ATMOSPHERE = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizonCool;
uniform vec3 uHorizonWarm;
uniform vec3 uAmbSky;
uniform vec3 uAmbGround;
uniform vec3 uFogTint;
uniform float uMood;
uniform float uHaze;
uniform float uVeil;
uniform vec3 uInk;
uniform vec3 uJade;
uniform vec3 uSilver;
uniform vec3 uParch;
uniform vec3 uGold;
uniform vec3 uCinnabar;

vec3 skyColor(vec3 dir) {
  float sunAmt = max(dot(dir, uSunDir), 0.0);
  float h = clamp(dir.y, -0.2, 1.0);
  vec3 horizon = mix(uHorizonCool, uHorizonWarm, pow(sunAmt, 2.2));
  vec3 col = mix(horizon, uZenith, smoothstep(0.0, 0.62, h));
  col = mix(col, horizon * 0.82, smoothstep(0.0, -0.2, h));
  return col + uSun * (pow(sunAmt, 9.0) * 0.32 + pow(sunAmt, 90.0) * 0.5);
}

vec3 fogColor(vec3 dir) {
  vec3 c = skyColor(normalize(vec3(dir.x, max(dir.y, 0.02) * 0.35, dir.z)));
  return mix(c, uFogTint, uMood * 0.55);
}

/** Lit by the sun, the sky above and the ground below. */
vec3 shade(vec3 albedo, vec3 n, float occlusion) {
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 ambient = mix(uAmbGround, uAmbSky, n.y * 0.5 + 0.5) * occlusion;
  return albedo * (ambient + uSun * ndl);
}

vec3 veilColor(vec3 dir) {
  vec3 q = cameraPosition + dir * 30.0;
  float wisp = fbm(q.xz * 0.05 + vec2(q.y * 0.04, uTime * 0.05));
  return mix(uHorizonCool * 1.05, uParch, 0.35) * (0.62 + 0.55 * smoothstep(0.25, 0.75, wisp));
}

/** Haze alone, for small things that never sit in valley mist or cloud: cheaper to compile and to run. */
vec3 haze(vec3 col, vec3 wp) {
  vec3 d = wp - cameraPosition;
  float dist = length(d);
  float h = 1.0 - exp(-dist * uHaze * (0.25 + exp(-max(wp.y, 0.0) * 0.0045)));
  return mix(col, fogColor(d / max(dist, 0.001)), clamp(h, 0.0, 1.0));
}

vec3 atmosphere(vec3 col, vec3 wp) {
  vec3 d = wp - cameraPosition;
  float dist = length(d);
  vec3 dir = d / max(dist, 0.001);
  // Haze thins with height: integrate an exponential falloff along the ray.
  float k = 0.0045;
  float h0 = max(cameraPosition.y, -5.0);
  float h1 = max(wp.y, -5.0);
  float dh = h1 - h0;
  float density = abs(dh) > 0.5 ? (exp(-h0 * k) - exp(-h1 * k)) / (k * dh) : exp(-h0 * k);
  float haze = 1.0 - exp(-dist * uHaze * (0.25 + density));
  vec3 fc = fogColor(dir) + uSun * pow(max(dot(dir, uSunDir), 0.0), 10.0) * 0.25;
  vec3 outc = mix(col, fc, clamp(haze, 0.0, 1.0));
  // Mist lying in the valleys: patchy banks that drift, never a flat wash.
  if (wp.y < 34.0) {
    float bank = smoothstep(0.42, 0.78, fbm3(wp.xz * 0.006 + vec2(uTime * 0.012, uTime * 0.006)));
    float low = 1.0 - smoothstep(4.0, 34.0, wp.y);
    float m = bank * low * (1.0 - exp(-dist * 0.005)) * 0.75;
    outc = mix(outc, mix(uHorizonCool, uParch, 0.4) + uSun * 0.08, m);
  }
  // Inside cloud: everything but the nearest dissolves into moving wisps.
  if (uVeil < 0.001) return outc;
  return mix(outc, veilColor(dir), clamp(uVeil * (1.0 - exp(-dist * 0.04)), 0.0, 1.0));
}
`;

const SOLID_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTint;
#ifdef USE_TINT
attribute vec3 tint;
#endif
void main() {
  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
  model = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = model * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(model) * normal);
  vTint = vec3(1.0);
  #ifdef USE_TINT
  vTint = tint;
  #endif
  #ifdef USE_INSTANCING_COLOR
  vTint *= instanceColor;
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/**
 * The land. Rock where it is steep — banded with strata, streaked with the
 * vertical strokes a brush would lay on a cliff; forest and grass where it is
 * gentle; snow above a snowline that drops around the Sentinel; pale shore at
 * the water. A little noise bends the normal so faces read as crags.
 */
const LAND_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec2 uSentinel;
uniform vec2 uLedger;
uniform vec2 uEcho;
uniform float uLakeLevel;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTint;
void main() {
  vec3 n = normalize(vNormal);
  float dist = length(vWorld - cameraPosition);
  // Crag detail: bend the normal by two noise slopes, fading with distance.
  float detail = 1.0 - smoothstep(250.0, 900.0, dist);
  vec2 p = vWorld.xz;
  // Noise sampled in a turned frame, so its lattice never lines up with the land's.
  vec2 r = mat2(0.8, -0.6, 0.6, 0.8) * p;
  if (detail > 0.0) {
    vec2 q = r * 0.07 + vWorld.y * 0.04;
    float a = fbm3(q) + 0.5 * vnoise(q * 3.1);
    float b = fbm3(q + vec2(5.3, 1.7)) + 0.5 * vnoise(q * 3.1 + 2.7);
    n = normalize(n + vec3(a - 0.75, 0.0, b - 0.75) * 0.9 * detail * (1.0 - n.y * 0.6));
  }
  float slope = 1.0 - clamp(n.y, 0.0, 1.0);

  // Rock: warm grey, with soft strata and the vertical strokes a brush lays on a cliff.
  float strata = fbm3(vec2(vWorld.y * 0.09, r.x * 0.004) + fbm3(r * 0.01) * 1.5);
  float strokes = fbm3(vec2(r.x * 0.09 + r.y * 0.05, vWorld.y * 0.012));
  vec3 rock = mix(uInk * 2.6, uSilver * 0.66, 0.3 + 0.4 * fbm3(r * 0.008 + vWorld.y * 0.003));
  rock *= 0.84 + 0.24 * smoothstep(0.35, 0.7, strata);
  rock *= 0.84 + 0.22 * smoothstep(0.25, 0.75, strokes);
  rock = mix(rock, rock * vec3(1.08, 0.98, 0.86), 0.5);

  // Growth: jade and pine on gentle ground; autumn reds near the Ledger valley and the Echo rim.
  float patches = fbm3(p * 0.01);
  vec3 grass = mix(vec3(0.11, 0.19, 0.12), uJade * 0.95, 0.3 + 0.55 * patches);
  float autumn = (1.0 - smoothstep(120.0, 300.0, length(p - uLedger))) * 0.7
               + (1.0 - smoothstep(170.0, 260.0, length(p - uEcho))) * 0.45;
  autumn *= smoothstep(0.45, 0.7, vnoise(p * 0.03));
  grass = mix(grass, mix(uCinnabar * 0.8, uGold * 0.75, vnoise(p * 0.07)), clamp(autumn, 0.0, 0.85));
  float growth = (1.0 - smoothstep(0.32, 0.52, slope)) * (1.0 - smoothstep(230.0, 320.0, vWorld.y));
  vec3 col = mix(rock, grass, growth);

  // Snow: lower around the Sentinel, high elsewhere.
  float storm = 1.0 - smoothstep(160.0, 420.0, length(p - uSentinel));
  float snowline = mix(340.0, 175.0, storm) + 40.0 * vnoise(p * 0.01);
  float snow = smoothstep(snowline - 25.0, snowline + 30.0, vWorld.y) * smoothstep(mix(0.35, 0.1, storm), mix(0.72, 0.45, storm), n.y);
  col = mix(col, uParch * 1.02, snow);

  // Shore and river bed.
  col = mix(mix(uSilver * 0.42, vec3(0.32, 0.28, 0.2), 0.4), col, smoothstep(0.3, 3.5, vWorld.y));

  // Light: crevices and valley floors hold a little less of it.
  float occlusion = mix(0.7, 1.0, smoothstep(-5.0, 80.0, vWorld.y)) * mix(0.75, 1.0, strokes);
  vec3 lit = shade(col, n, occlusion);
  // Snow and pale rock catch the sun at grazing angles.
  vec3 v = normalize(cameraPosition - vWorld);
  lit += uSun * 0.18 * pow(1.0 - max(dot(n, v), 0.0), 4.0) * max(dot(n, uSunDir) + 0.3, 0.0);
  gl_FragColor = vec4(atmosphere(lit, vWorld), 1.0);
}
`;

/** Trees: per-tree colour (instance) times per-part colour (trunk or crown). */
const TREE_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTint;
void main() {
  vec3 n = normalize(vNormal);
  vec3 albedo = vTint * (0.85 + 0.3 * vnoise(vWorld.xz * 0.6 + vWorld.y));
  vec3 lit = shade(albedo, n, mix(0.65, 1.0, smoothstep(-2.0, 20.0, vWorld.y)));
  gl_FragColor = vec4(atmosphere(lit, vWorld), 1.0);
}
`;

/** Built things: painted surfaces in sunlight, and lamps and windows that glow. */
const BUILT_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec3 uColor;
uniform float uEmit;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTint;
void main() {
  vec3 n = normalize(vNormal);
  vec3 col;
  if (uEmit > 0.5) {
    col = uColor * (0.92 + 0.08 * sin(uTime * 2.3 + vWorld.x * 0.7 + vWorld.z));
  } else {
    vec3 v = normalize(cameraPosition - vWorld);
    col = shade(uColor * vTint, n, 1.0) + uSun * 0.06 * pow(1.0 - max(dot(n, v), 0.0), 3.0);
  }
  gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
}
`;

const WATER_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec2 uCentre;
uniform float uRadius;
uniform vec2 uEchoAt;
uniform float uFlow;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTint;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 q = vWorld.xz * 0.045;
  float a = vnoise(q + vec2(0.0, uTime * 0.35 * uFlow));
  float b = vnoise(q * 2.3 + vec2(uTime * 0.2, uTime * 0.25 * uFlow));
  vec3 n = normalize(vec3((a - 0.5) * 0.2, 1.0, (b - 0.5) * 0.2));
  // The echo: rings spreading across the lake from beneath the orb.
  vec2 e = vWorld.xz - uEchoAt;
  float de = length(e);
  float ring = sin(de * 0.28 - uTime * 1.3) * exp(-de * 0.018) * smoothstep(6.0, 18.0, de);
  n.xz += ring * 0.14 * (e / max(de, 0.001));
  n = normalize(n);
  vec3 r = reflect(-v, n);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  // Clear and pale over the shallows, deep at the centre.
  float shallow = uRadius > 0.0 ? smoothstep(uRadius * 0.45, uRadius * 1.02, length(vWorld.xz - uCentre)) : 0.0;
  vec3 body = mix(uDeep, uShallow, shallow);
  body = shade(body, vec3(0.0, 1.0, 0.0), 0.9);
  vec3 col = mix(body, skyColor(r), fres * 0.85);
  col += uSun * pow(max(dot(r, uSunDir), 0.0), 220.0) * 2.0;
  gl_FragColor = vec4(atmosphere(col, vWorld), 1.0);
}
`;

/** The sea of cloud: patchy, lit gold on its sunward billows, with clearings over the destinations. */
const CLOUD_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
uniform vec2 uClear[3];
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTint;
void main() {
  float mask = 1.0 - smoothstep(0.5, 1.0, length(vWorld.xz) / ${(EXTENT * 1.7).toFixed(1)});
  for (int i = 0; i < 3; i++) mask *= smoothstep(70.0, 150.0, length(vWorld.xz - uClear[i]));
  if (mask < 0.004) discard;
  vec2 p = vWorld.xz * 0.0036 + vec2(uTime * 0.006, uTime * 0.0025);
  vec2 w = vec2(fbm3(p * 1.6 + 3.1), fbm3(p * 1.6 - 2.3));
  float n = fbm(p + w * 0.8);
  float d = smoothstep(0.5, 0.78, n) * mask;
  if (d < 0.004) discard;
  vec3 col;
  if (cameraPosition.y > vWorld.y) {
    float n2 = fbm(p + uSunDir.xz * 0.04 + w * 0.8);
    float lit = clamp(0.55 + (n - n2) * 9.0, 0.0, 1.0);
    col = mix(uHorizonCool * 0.8, uParch * 0.95, smoothstep(0.5, 0.85, n)) * (0.6 + 0.55 * lit) + uSun * 0.22 * lit;
  } else {
    col = mix(uHorizonCool * 0.55, uParch * 0.6, 0.3);
  }
  gl_FragColor = vec4(atmosphere(col, vWorld), d * 0.9);
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
  vec3 col = skyColor(d);
  // High cirrus, combed by the wind, lit gold towards the sun.
  if (d.y > 0.02) {
    vec2 c = vec2(d.x, d.z) / (d.y + 0.25);
    float streak = fbm(vec2(c.x * 1.6 + uTime * 0.004, c.y * 5.5)) * fbm3(c * 0.8 + 7.0);
    float cirrus = smoothstep(0.2, 0.42, streak) * smoothstep(0.02, 0.25, d.y) * (1.0 - smoothstep(0.55, 0.95, d.y));
    float sunAmt = pow(max(dot(d, uSunDir), 0.0), 3.0);
    col = mix(col, mix(uParch * 0.9, uGold * 1.15 + uSun * 0.2, sunAmt), cirrus * 0.55);
  }
  col = mix(col, fogColor(d), uMood * 0.35);
  if (uVeil > 0.001) col = mix(col, veilColor(d), uVeil * 0.92);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** A waterfall: water streaming down, whitening where it breaks, frayed at its edges. */
const FALL_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FALL_FRAGMENT = /* glsl */ `
${NOISE}
${ATMOSPHERE}
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  float x = vUv.x;
  float y = vUv.y;
  float streams = vnoise(vec2(x * 14.0, y * 2.0 + uTime * 1.6)) * 0.6 + vnoise(vec2(x * 33.0, y * 5.0 + uTime * 2.6)) * 0.4;
  float edge = smoothstep(0.0, 0.32, x) * smoothstep(1.0, 0.68, x);
  float a = edge * smoothstep(0.25, 0.85, streams) * smoothstep(0.0, 0.04, y);
  vec3 col = mix(uSilver * 0.9, uParch * 1.05, streams);
  col = shade(col, vec3(0.0, 0.3, 0.95), 1.0) * 0.8 + uParch * 0.25;
  // Foam where it lands.
  col = mix(col, uParch * 1.1, smoothstep(0.85, 1.0, y));
  gl_FragColor = vec4(atmosphere(col, vWorld), a * 0.8);
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

/** A golden route: a thread of light along the land, with pulses travelling towards the destination. */
const ROUTE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform float uBase;
uniform vec3 uGold;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float core = pow(abs(dot(normalize(vNormal), v)), 1.6);
  float pulse = pow(fract(vUv.x * 7.0 - uTime * 0.22), 10.0);
  float a = core * (uBase + 0.55 * uActive + pulse * (0.25 + 0.75 * uActive));
  float far = length(cameraPosition - vWorld);
  a *= (1.0 - smoothstep(1600.0, 2600.0, far)) * smoothstep(50.0, 200.0, far);
  gl_FragColor = vec4(uGold * (1.15 + pulse * 0.7), a);
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
  if (max(fan * step(0.05, r), stem) < 0.5) discard;
  vec3 col = mix(uGold * 0.6, uGold * 1.2, smoothstep(0.1, 0.7, r)) * (0.85 + 0.15 * sin(a * 28.0));
  gl_FragColor = vec4(haze(col + uSun * 0.12, vWorld), 1.0);
}
`;

/** Snow drifting through the Sentinel's storm: each flake falls and swirls on its own clock. */
const SNOW_VERTEX = /* glsl */ `
uniform float uTime;
uniform vec3 uCentre;
attribute vec4 seed;
varying float vFade;
void main() {
  float t = uTime * (0.6 + seed.w * 0.6) + seed.z * 50.0;
  float fall = fract(seed.y - t * 0.035);
  vec3 p = uCentre + vec3(
    (seed.x - 0.5) * 260.0 + sin(t * 0.9 + seed.z * 6.0) * 8.0 + t * 1.6,
    fall * 220.0 - 40.0,
    (seed.z - 0.5) * 260.0 + cos(t * 0.7 + seed.x * 6.0) * 8.0
  );
  p.x = uCentre.x + mod(p.x - uCentre.x + 130.0, 260.0) - 130.0;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vFade = smoothstep(0.0, 0.1, fall) * smoothstep(1.0, 0.85, fall) * smoothstep(900.0, 250.0, -mv.z);
  gl_PointSize = clamp(260.0 * (0.6 + seed.w) / -mv.z, 1.0, 5.0);
  gl_Position = projectionMatrix * mv;
}
`;

const SNOW_FRAGMENT = /* glsl */ `
uniform vec3 uParch;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uParch, vFade * smoothstep(0.5, 0.1, d) * 0.85);
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
  r.addColorStop(0.16, "rgba(255,255,255,0.5)");
  r.addColorStop(0.5, "rgba(255,255,255,0.1)");
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
  for (let i = 0; i < 30; i++) {
    const x = 64 + (rand() - 0.5) * 64;
    const y = 70 + (rand() - 0.5) * 30 - Math.abs(rand() - 0.5) * 20;
    const rad = 16 + rand() * 30;
    const r = g.createRadialGradient(x, y, 0, x, y, rad);
    r.addColorStop(0, "rgba(255,255,255,0.26)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Let the browser breathe between heavy build steps. */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The surface the camera and routes must stay above: land, or water where there is water. */
const surfaceAt = (x: number, z: number) => Math.max(heightAt(x, z), inLake(x, z) ? LAKE.level : 0);

type MaterialKey = "stone" | "darkStone" | "wood" | "lacquer" | "roof" | "trim" | "lamp" | "redLamp" | "window" | "banner";

/**
 * Collects static geometry per material and merges it, so a fortress of a
 * hundred parts is drawn in a handful of calls.
 */
class Builder {
  private parts = new Map<MaterialKey, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private t = new THREE.Vector3();

  add(key: MaterialKey, geometry: THREE.BufferGeometry, x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1, rotX = 0, rotZ = 0) {
    const g = (geometry.index ? geometry.toNonIndexed() : geometry.clone()) as THREE.BufferGeometry;
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    this.e.set(rotX, rotY, rotZ);
    this.q.setFromEuler(this.e);
    this.m.compose(this.t.set(x, y, z), this.q, this.s.set(sx, sy, sz));
    g.applyMatrix4(this.m);
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
  }

  box(key: MaterialKey, w: number, h: number, d: number, x: number, y: number, z: number, rotY = 0) {
    this.add(key, UNIT_BOX, x, y + h / 2, z, rotY, w, h, d);
  }

  build(materials: Record<MaterialKey, THREE.Material>, scene: THREE.Scene, keep: <T extends { dispose(): void }>(t: T) => T) {
    for (const [key, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      keep(merged);
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
    }
    this.parts.clear();
  }
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** A hip roof with upturned corners, `w` by `d`, rising `rise` from its eaves. */
function roofGeometry(w: number, d: number, rise: number, curl = 0.18): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.28, 1, rise, 4, 1, true);
  g.rotateY(Math.PI / 4);
  g.scale((w / 2) * Math.SQRT2, 1, (d / 2) * Math.SQRT2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) + curl * Math.min(w, d));
  }
  g.computeVertexNormals();
  return g;
}

/** A hall: stone base, lacquered columns, a wooden body with lit windows, one or two roofs. */
function hall(b: Builder, x: number, y: number, z: number, w: number, d: number, h: number, rot = 0, tiers = 1) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
  b.box("stone", w + 4, 1.6, d + 4, x, y - 0.4, z, rot);
  let base = y + 1.2;
  let ww = w;
  let dd = d;
  for (let t = 0; t < tiers; t++) {
    const hh = t === 0 ? h : h * 0.62;
    b.box("wood", ww * 0.9, hh, dd * 0.86, x, base, z, rot);
    // Windows on the long sides, glowing.
    for (const side of [-1, 1]) {
      const [wx, wz] = at(0, side * dd * 0.43);
      b.box("window", ww * 0.6, hh * 0.32, 0.4, wx, base + hh * 0.38, wz, rot);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const [px, pz] = at(sx * ww * 0.46, sz * dd * 0.43);
        b.add("lacquer", UNIT_CYL, px, base + hh / 2, pz, 0, 0.55, hh, 0.55);
      }
    }
    base += hh;
    const roofRise = Math.max(2.4, Math.min(ww, dd) * 0.32);
    b.add("roof", roofGeometry(ww * 1.32, dd * 1.4, roofRise), x, base + roofRise / 2 - 0.2, z, rot);
    b.box("trim", ww * 0.42, 0.7, 0.7, x, base + roofRise - 0.4, z, rot);
    base += roofRise * 0.55;
    ww *= 0.72;
    dd *= 0.72;
  }
}

const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 8);

/** A pagoda tower of `tiers`, `base` wide, from y upward. Returns the height of its finial. */
function pagoda(b: Builder, x: number, y: number, z: number, base: number, tiers: number, tierH: number, redLamps = false) {
  b.box("stone", base * 1.3, 2.4, base * 1.3, x, y - 0.6, z);
  let at = y + 1.8;
  let w = base;
  for (let i = 0; i < tiers; i++) {
    const hh = i === 0 ? tierH * 1.35 : tierH;
    b.box(i % 2 ? "wood" : "darkStone", w * 0.74, hh, w * 0.74, x, at, z);
    b.box("window", w * 0.5, hh * 0.3, w * 0.76, x, at + hh * 0.42, z);
    b.box("window", w * 0.76, hh * 0.3, w * 0.5, x, at + hh * 0.42, z);
    b.box("lacquer", w * 0.78, 0.5, w * 0.78, x, at + hh - 0.5, z);
    at += hh;
    const rise = w * 0.3;
    b.add("roof", roofGeometry(w * 1.42, w * 1.42, rise, 0.22), x, at + rise / 2 - 0.3, z);
    if (redLamps) {
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        b.box("redLamp", 0.9, 1.3, 0.9, x + sx * w * 0.66, at - 1.2, z + sz * w * 0.66);
      }
    }
    at += rise * 0.45;
    w *= 0.84;
  }
  b.add("trim", new THREE.ConeGeometry(0.7, 10, 6), x, at + 5, z);
  return at + 10;
}

/** A gate of two lacquered posts, two beams and a roof — a paifang. */
function gate(b: Builder, x: number, y: number, z: number, span: number, h: number, rot = 0) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const side of [-1, 1]) {
    b.add("lacquer", UNIT_CYL, x + side * (span / 2) * c, y + h / 2, z - side * (span / 2) * s, 0, 0.9, h, 0.9);
    b.box("stone", 2.4, 1.8, 2.4, x + side * (span / 2) * c, y - 0.6, z - side * (span / 2) * s, rot);
  }
  b.box("lacquer", span * 1.08, 1.1, 1.2, x, y + h * 0.72, z, rot);
  b.box("darkStone", span * 1.3, 1.4, 1.6, x, y + h * 0.92, z, rot);
  b.add("roof", roofGeometry(span * 1.45, 4.5, 2.6, 0.3), x, y + h * 0.92 + 2.6, z, rot);
}

/** A stone pillar: a lathed column, flared at the foot, banded with strata, flat on top. */
function pillarGeometry(p: Pillar): THREE.BufferGeometry {
  const rand = seeded(p.seed);
  const profile: THREE.Vector2[] = [];
  const rows = 24;
  const strata = 10 + rand() * 8;
  const bottom = heightAt(p.x, p.z) - 12;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = bottom + t * (p.height - bottom);
    const flare = 1 + 0.6 * Math.pow(1 - t, 3);
    const taper = 1 - 0.25 * t;
    const band = 1 + 0.07 * Math.abs(Math.sin((y / strata) * Math.PI)) + (rand() - 0.5) * 0.1;
    profile.push(new THREE.Vector2(p.radius * flare * taper * band, y));
  }
  profile.push(new THREE.Vector2(p.radius * 0.55, p.height + 0.8));
  profile.push(new THREE.Vector2(0.01, p.height + 1.4));
  const g = new THREE.LatheGeometry(profile, 16);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, z) || 1;
    const n = fbm((x / len) * 1.6 + y * 0.022 + (p.seed % 97), (z / len) * 1.6 + y * 0.031, 3) - 0.5;
    const k = 1 + n * 0.55;
    pos.setXYZ(i, x * k + p.x, y, z * k + p.z);
  }
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  return g;
}

/** A rock floating free: a jagged cone hanging point-down, flat on top. */
function floatingRockGeometry(radius: number, seed: number): THREE.BufferGeometry {
  const profile: THREE.Vector2[] = [];
  const rand = seeded(seed);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    profile.push(new THREE.Vector2(radius * Math.pow(t, 0.7) * (0.9 + rand() * 0.2), -radius * 2.4 * (1 - t)));
  }
  profile.push(new THREE.Vector2(0.01, 1.2));
  const g = new THREE.LatheGeometry(profile, 14);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, z) || 1;
    const k = 1 + (fbm((x / len) * 1.4 + seed, (z / len) * 1.4 + y * 0.05, 3) - 0.5) * 0.7;
    pos.setXYZ(i, x * k, y, z * k);
  }
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  return g;
}

/**
 * A waterfall draped down the real cliff: from its lip it steps outward until
 * the land below is lower than the water, all the way to the pool.
 */
function fallGeometry(from: Vec3, out: readonly [number, number], width: number): THREE.BufferGeometry | null {
  const len = Math.hypot(out[0], out[1]);
  const ox = out[0] / len;
  const oz = out[1] / len;
  const px = -oz;
  const pz = ox;
  const top = from[1];
  // Find where it lands: walk outward and down until the ground is near the falling water.
  const steps = 26;
  const spine: THREE.Vector3[] = [];
  let reach = 1;
  let y = top;
  for (let i = 0; i <= steps; i++) {
    const want = top - (i / steps) * (top + 2);
    const below = surfaceAt(from[0] + ox * (reach + 1.5), from[2] + oz * (reach + 1.5));
    if (want <= below + 0.5) {
      // Landed: one last point at the pool's surface.
      spine.push(new THREE.Vector3(from[0] + ox * (reach + 1.5), below + 0.3, from[2] + oz * (reach + 1.5)));
      break;
    }
    // The water hugs the cliff: the nearest point outward where the ground is below it.
    while (reach < 140 && surfaceAt(from[0] + ox * reach, from[2] + oz * reach) > want - 1.5) reach += 1;
    y = want;
    spine.push(new THREE.Vector3(from[0] + ox * (reach + 1.5), y, from[2] + oz * (reach + 1.5)));
  }
  if (spine.length < 3) return null;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  spine.forEach((p, i) => {
    const v = i / (spine.length - 1);
    const spread = width * (1 + v * 0.35);
    for (const side of [0, 1]) {
      const s = side ? 0.5 : -0.5;
      positions.push(p.x + px * spread * s, p.y, p.z + pz * spread * s);
      uvs.push(side, v);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/** A route along the land: the trail's points joined smoothly, lifted just above the ground (or the bridge). */
function trailCurve(points: readonly (readonly [number, number])[], lift: number, deckSpan: [number, number] | null): THREE.CatmullRomCurve3 {
  const flat = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "centripetal");
  const samples = 120;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    const p = flat.getPoint(i / samples);
    let y = surfaceAt(p.x, p.z) + lift;
    if (deckSpan && Math.abs(p.z - BRIDGE.z) < 12 && p.x > deckSpan[0] && p.x < deckSpan[1]) y = BRIDGE.deck + lift;
    pts.push(new THREE.Vector3(p.x, y, p.z));
  }
  // Ease over small bumps so the thread flows rather than jitters.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < pts.length - 1; i++) {
      const avg = (pts[i - 1].y + pts[i + 1].y) / 2;
      const floor = surfaceAt(pts[i].x, pts[i].z) + lift * 0.6;
      pts[i].y = Math.max(floor, (pts[i].y + avg) / 2);
    }
  }
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

/** The Echo's gate stands in the water facing the visitor's view; the orb hangs just behind it, inside its frame. */
const ECHO_GATE = { x: LAKE.x - 24, z: LAKE.z + 46, rot: -0.22 };
const ECHO_ORB = { x: ECHO_GATE.x + 2.2, z: ECHO_GATE.z - 9.8 };

/** Fog tints, sun strength and haze that give each region its own light. */
const MOODS = {
  storm: { tint: [0.42, 0.47, 0.55], sun: 0.75, haze: 1.15 },
  gold: { tint: [0.92, 0.72, 0.45], sun: 1.12, haze: 0.9 },
  jade: { tint: [0.52, 0.7, 0.64], sun: 1.0, haze: 0.85 },
} as const;

/* ------------------------------------------------------------------ */
/* The realm                                                           */
/* ------------------------------------------------------------------ */

export async function createRealm(canvas: HTMLCanvasElement, options: RealmOptions): Promise<Realm> {
  const { still, palette } = options;

  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(palette.ink);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 9000);

  const col = (hex: string) => new THREE.Color(hex);
  const C = {
    ink: col(palette.ink),
    jade: col(palette.jade),
    silver: col(palette.silver),
    parchment: col(palette.parchment),
    cinnabar: col(palette.cinnabar),
    gold: col(palette.gold),
  };

  const sunBase = new THREE.Color(1.0, 0.84, 0.6).multiplyScalar(1.05);
  const shared = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.8, 0.27, 0.2).normalize() },
    uSun: { value: sunBase.clone() },
    uZenith: { value: new THREE.Color(0.1, 0.14, 0.2) },
    uHorizonCool: { value: new THREE.Color(0.66, 0.66, 0.62) },
    uHorizonWarm: { value: new THREE.Color(1.0, 0.78, 0.5) },
    uAmbSky: { value: new THREE.Color(0.34, 0.39, 0.44) },
    uAmbGround: { value: new THREE.Color(0.17, 0.14, 0.1) },
    uFogTint: { value: new THREE.Color(0.6, 0.65, 0.67) },
    uMood: { value: 0 },
    uHaze: { value: 0.00085 },
    uVeil: { value: 0 },
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

  const shader = (fragment: string, extra: Record<string, THREE.IUniform> = {}, opts: Partial<THREE.ShaderMaterialParameters> = {}) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: SOLID_VERTEX,
        fragmentShader: fragment,
        uniforms: { ...shared, ...extra },
        ...opts,
      }),
    );
  const v2 = (x: number, z: number) => new THREE.Vector2(x, z);
  const land = shader(LAND_FRAGMENT, {
    uSentinel: { value: v2(SUMMIT[0], SUMMIT[1]) },
    uLedger: { value: v2(riverX(-300), -300) },
    uEcho: { value: v2(PLATEAU.x, PLATEAU.z) },
    uLakeLevel: { value: LAKE.level },
  });
  const trees = shader(TREE_FRAGMENT);
  const built = (color: THREE.Color, emit = false, doubleSide = false) =>
    shader(BUILT_FRAGMENT, { uColor: { value: color } , uEmit: { value: emit ? 1 : 0 } }, doubleSide ? { side: THREE.DoubleSide } : {});
  const materials: Record<MaterialKey, THREE.Material> = {
    stone: built(C.silver.clone().multiplyScalar(0.58)),
    darkStone: built(C.ink.clone().multiplyScalar(2.6)),
    wood: built(new THREE.Color(0.22, 0.14, 0.1)),
    lacquer: built(C.cinnabar.clone().multiplyScalar(0.95)),
    roof: built(new THREE.Color(0.11, 0.12, 0.14), false, true),
    trim: built(C.gold.clone().multiplyScalar(0.75)),
    lamp: built(C.gold.clone().multiplyScalar(1.35), true),
    redLamp: built(C.cinnabar.clone().multiplyScalar(1.9), true),
    window: built(new THREE.Color(1.0, 0.72, 0.38), true),
    banner: built(C.cinnabar.clone().multiplyScalar(0.85), false, true),
  };

  /* ---------- The land: a detailed centre and a coarser surround to the horizon ---------- */
  type Rect = { x: number; z: number; half: number };
  const within = (r: Rect, x: number, z: number) => Math.abs(x - r.x) < r.half && Math.abs(z - r.z) < r.half;
  /**
   * One square of land centred on (cx, cz). Where a finer square covers it, its
   * vertices sink far below, out of sight under the finer one.
   */
  const buildTerrain = async (cx: number, cz: number, size: number, segments: number, finer: Rect[]) => {
    const geometry = keep(new THREE.PlaneGeometry(size, size, segments, segments));
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(cx, 0, cz);
    geometry.deleteAttribute("uv");
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, finer.some((r) => within(r, x, z)) ? -300 : heightAt(x, z));
      if (i % 24000 === 0) await breathe();
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, land);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  };
  const inner = EXTENT * 1.15;
  // The Sentinel's crags are seen from close by: they get the finest land.
  const crag: Rect = { x: -315, z: -325, half: 165 };
  await buildTerrain(crag.x, crag.z, (crag.half + 6) * 2, 220, []);
  await buildTerrain(0, 0, inner * 2, 400, [crag]);
  await buildTerrain(0, 0, HORIZON * 2, 180, [{ x: 0, z: 0, half: inner - 30 }]);

  /* ---------- Water: the river and valley, and the raised lake ---------- */
  const water = (deep: THREE.Color, shallow: THREE.Color, centre: THREE.Vector2, radius: number, flow: number) =>
    shader(WATER_FRAGMENT, {
      uDeep: { value: deep },
      uShallow: { value: shallow },
      uCentre: { value: centre },
      uRadius: { value: radius },
      uEchoAt: { value: v2(ECHO_ORB.x, ECHO_ORB.z) },
      uFlow: { value: flow },
    });
  {
    const plane = keep(new THREE.PlaneGeometry(HORIZON * 2, HORIZON * 2, 1, 1));
    plane.rotateX(-Math.PI / 2);
    scene.add(new THREE.Mesh(plane, water(new THREE.Color(0.05, 0.12, 0.12), new THREE.Color(0.12, 0.24, 0.22), v2(0, 0), 0, 1)));
    const disc = keep(new THREE.CircleGeometry(LAKE.radius * 1.12, 72));
    disc.rotateX(-Math.PI / 2);
    const lake = new THREE.Mesh(disc, water(new THREE.Color(0.05, 0.27, 0.27), new THREE.Color(0.24, 0.55, 0.5), v2(LAKE.x, LAKE.z), LAKE.radius, 0));
    lake.position.set(LAKE.x, LAKE.level, LAKE.z);
    scene.add(lake);
  }
  await breathe();

  /* ---------- Pillars, and rocks floating over the lake ---------- */
  const pillars = makePillars();
  {
    const geos = pillars.map(pillarGeometry);
    FLOATING.forEach((f, i) => {
      const g = floatingRockGeometry(f.radius, 50 + i);
      g.translate(f.x, f.y, f.z);
      geos.push(g);
    });
    const merged = keep(mergeGeometries(geos, false)!);
    geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, land);
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  }
  await breathe();

  /* ---------- Trees: pines everywhere they would grow, red maples in the warm valleys ---------- */
  {
    const pine = keep(
      mergeGeometries([
        tinted(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 5).translate(0, 0.15, 0), [0.25, 0.18, 0.13]),
        tinted(
          new THREE.LatheGeometry(
            [
              [0.0, 0.14], [0.6, 0.22], [0.26, 0.44], [0.5, 0.44], [0.18, 0.68], [0.36, 0.68], [0.0, 1.0],
            ].map(([x, y]) => new THREE.Vector2(x, y)),
            7,
          ),
          [1, 1, 1],
        ),
      ])!,
    );
    const maple = keep(
      mergeGeometries([
        tinted(new THREE.CylinderGeometry(0.06, 0.1, 0.5, 5).translate(0, 0.25, 0), [0.6, 0.45, 0.4]),
        tinted(new THREE.IcosahedronGeometry(0.42, 1).scale(1, 0.75, 1).translate(0, 0.78, 0), [1, 1, 1]),
        tinted(new THREE.IcosahedronGeometry(0.3, 1).scale(1, 0.8, 1).translate(0.34, 0.62, 0.12), [0.88, 0.88, 0.88]),
        tinted(new THREE.IcosahedronGeometry(0.28, 1).scale(1, 0.8, 1).translate(-0.3, 0.6, -0.16), [0.94, 0.94, 0.94]),
        tinted(new THREE.IcosahedronGeometry(0.24, 1).scale(1, 0.8, 1).translate(0.05, 0.56, 0.36), [0.82, 0.82, 0.82]),
      ])!,
    );
    const pines: THREE.Matrix4[] = [];
    const pineColors: THREE.Color[] = [];
    const maples: THREE.Matrix4[] = [];
    const mapleColors: THREE.Color[] = [];
    const rand = seeded(77);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const t = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const place = (list: THREE.Matrix4[], x: number, y: number, z: number, h: number, w: number) => {
      t.set(x, y - 0.4, z);
      q.setFromAxisAngle(up, rand() * 6.28);
      s.set(h * w, h, h * w);
      list.push(m.compose(t, q, s).clone());
    };
    const ledger = new THREE.Vector2(riverX(-300), -300);
    const echo = new THREE.Vector2(PLATEAU.x, PLATEAU.z);
    const overlook = new THREE.Vector2(OVERLOOK.x, OVERLOOK.z);
    const p2 = new THREE.Vector2();
    let tries = 0;
    while ((pines.length < 4200 || maples.length < 900) && tries++ < 90000) {
      const x = (rand() * 2 - 1) * inner;
      const z = (rand() * 2 - 1) * inner;
      if (fbm(x * 0.007 + 40, z * 0.007) < 0.46) continue;
      const y = heightAt(x, z);
      if (y < 2 || y > 300 || inLake(x, z)) continue;
      const slope = Math.abs(heightAt(x + 3, z) - y) + Math.abs(heightAt(x, z + 3) - y);
      if (slope > 3.4) continue;
      if (Math.hypot(x - FORTRESS.x, z - FORTRESS.z) < 70) continue;
      if (Math.abs(z - BRIDGE.z) < 14 && Math.abs(x - riverX(BRIDGE.z)) < 70) continue;
      p2.set(x, z);
      if (p2.distanceTo(overlook) < 26) continue;
      const warm = Math.max(1 - p2.distanceTo(ledger) / 260, 1 - Math.abs(p2.distanceTo(echo) - 190) / 70, 1 - p2.distanceTo(overlook) / 110, 0);
      if (maples.length < 900 && rand() < warm * 0.85) {
        place(maples, x, y, z, 7 + rand() * 7, 0.8 + rand() * 0.3);
        const r = rand();
        mapleColors.push(new THREE.Color().copy(C.cinnabar).lerp(C.gold, r * r * 0.7).multiplyScalar(0.95 + rand() * 0.25));
      } else if (pines.length < 4200 && y < 260) {
        const tall = 8 + rand() * 12;
        place(pines, x, y, z, tall, 0.34 + rand() * 0.1);
        pineColors.push(new THREE.Color(0.08 + rand() * 0.05, 0.17 + rand() * 0.07, 0.11 + rand() * 0.04).lerp(C.jade, rand() * 0.25));
      }
      if (tries % 6000 === 0) await breathe();
    }
    // Groves on the pillars and the floating rocks.
    for (const p of pillars) {
      for (let i = 0; i < Math.round(p.radius / 2.4); i++) {
        const a = rand() * 6.28;
        const r = Math.sqrt(rand()) * p.radius * 0.6;
        place(pines, p.x + Math.cos(a) * r, p.height + 0.6, p.z + Math.sin(a) * r, 7 + rand() * 6, 0.36);
        pineColors.push(new THREE.Color(0.09, 0.19, 0.12));
      }
    }
    for (const f of FLOATING) {
      for (let i = 0; i < Math.round(f.radius / 3); i++) {
        const a = rand() * 6.28;
        const r = Math.sqrt(rand()) * f.radius * 0.55;
        place(pines, f.x + Math.cos(a) * r, f.y + 0.8, f.z + Math.sin(a) * r, 6 + rand() * 6, 0.36);
        pineColors.push(new THREE.Color(0.1, 0.2, 0.13));
      }
    }
    // The Overlook's maple, off to one side of the terrace.
    place(maples, OVERLOOK.x - 40, OVERLOOK.height - 1, OVERLOOK.z - 22, 11, 1);
    mapleColors.push(C.cinnabar.clone());

    for (const [geometry, list, colors] of [
      [pine, pines, pineColors],
      [maple, maples, mapleColors],
    ] as const) {
      const mesh = new THREE.InstancedMesh(geometry, trees, list.length);
      list.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, colors[i]);
      });
      scene.add(mesh);
    }
  }
  await breathe();

  /* ---------- The Sentinel Spire: a fortress on the storm-bound shoulder ---------- */
  const b = new Builder();
  const keepTop = (() => {
    const { x, z, height: y } = FORTRESS;
    // Curtain wall with crenellations, ringing the shoulder.
    const ring = 10;
    const radius = 46;
    for (let i = 0; i < ring; i++) {
      const a0 = (i / ring) * Math.PI * 2;
      const a1 = ((i + 1) / ring) * Math.PI * 2;
      const mx = x + Math.cos((a0 + a1) / 2) * radius;
      const mz = z + Math.sin((a0 + a1) / 2) * radius;
      const len = 2 * radius * Math.sin(Math.PI / ring) + 1;
      const rot = -((a0 + a1) / 2) + Math.PI / 2;
      const ground = Math.min(heightAt(mx, mz), y) - 6;
      b.box("darkStone", len, y + 14 - ground, 4, mx, ground, mz, rot);
      for (let k = -2; k <= 2; k++) {
        const cx = mx + Math.cos(rot) * k * (len / 5);
        const cz = mz - Math.sin(rot) * k * (len / 5);
        b.box("darkStone", 2.2, 2.2, 4.4, cx, y + 14, cz, rot);
      }
      // Towers at every other corner.
      if (i % 2 === 0) {
        const tx = x + Math.cos(a0) * radius;
        const tz = z + Math.sin(a0) * radius;
        const tg = Math.min(heightAt(tx, tz), y) - 6;
        b.box("darkStone", 11, y + 16 - tg, 11, tx, tg, tz);
        pagoda(b, tx, y + 16, tz, 9, 2, 6, true);
      }
      // Banners on the wall.
      if (i % 2 === 1) {
        b.add("trim", UNIT_CYL, mx, y + 22, mz, 0, 0.25, 16, 0.25);
        b.add("banner", new THREE.PlaneGeometry(1, 1), mx + Math.cos(rot) * 2.2, y + 24, mz - Math.sin(rot) * 2.2, rot, 4, 9, 1);
      }
    }
    // The gatehouse, facing the valley.
    hall(b, x + 30, y + 14, z + 36, 22, 10, 8, -0.7);
    // Halls inside the walls.
    hall(b, x - 20, y, z + 14, 18, 10, 9, 0.2);
    hall(b, x + 18, y, z - 18, 16, 10, 8, -0.4);
    // The keep: a seven-tiered tower, red lanterns at every corner.
    return pagoda(b, x, y, z, 26, 7, 9, true);
  })();

  /* ---------- The Ledger Bridge: three arches across the gorge, a town below ---------- */
  const deckSpan: [number, number] = [riverX(BRIDGE.z) - 46, riverX(BRIDGE.z) + 48];
  {
    const [xa, xb] = deckSpan;
    const deck = BRIDGE.deck;
    const supports: [number, number][] = [
      [xa + 18, xa + 27],
      [xb - 27, xb - 18],
    ];
    const shape = new THREE.Shape();
    const arch = (xl: number, xr: number) => {
      const r = (xr - xl) / 2;
      const cx = (xl + xr) / 2;
      const spring = deck - 6 - r;
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI;
        shape.lineTo(cx + Math.cos(a) * r, spring + Math.sin(a) * r);
      }
      return spring;
    };
    shape.moveTo(xa, deck + 1.4);
    shape.lineTo(xb, deck + 1.4);
    shape.lineTo(xb, deck - 16);
    shape.lineTo(supports[1][1], deck - 16);
    arch(supports[1][1], xb);
    shape.lineTo(supports[1][1], -6);
    shape.lineTo(supports[1][0], -6);
    arch(supports[0][1], supports[1][0]);
    shape.lineTo(supports[0][1], -6);
    shape.lineTo(supports[0][0], -6);
    arch(xa, supports[0][0]);
    shape.lineTo(xa, deck - 16);
    shape.closePath();
    // Recut the outline in drawing order: the arches above were added right-to-left.
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 11, bevelEnabled: false });
    b.add("stone", geometry, 0, 0, BRIDGE.z - 5.5);
    geometry.dispose();
    // Parapets and lanterns.
    for (const side of [-1, 1]) {
      b.box("stone", xb - xa, 1.6, 0.9, (xa + xb) / 2, deck + 1.4, BRIDGE.z + side * 5.2);
      for (let x = xa + 6; x <= xb - 6; x += 11) {
        b.box("stone", 0.9, 4.2, 0.9, x, deck + 1.4, BRIDGE.z + side * 5.6);
        b.box("lamp", 0.9, 1.1, 0.9, x, deck + 5.6, BRIDGE.z + side * 5.6);
      }
    }
    // A pavilion at mid-span, and gates on both tablelands.
    hall(b, (xa + xb) / 2, deck + 1.4, BRIDGE.z, 12, 9, 6, 0);
    gate(b, xa - 4, heightAt(xa - 4, BRIDGE.z), BRIDGE.z, 10, 12, Math.PI / 2);
    gate(b, xb + 4, heightAt(xb + 4, BRIDGE.z), BRIDGE.z, 10, 12, Math.PI / 2);

    // The temple town on the river's banks below the gorge.
    const town: [number, number, number, number, number, number][] = [
      // [offset from river, z, width, depth, height, tiers]
      [-44, -330, 22, 13, 9, 2],
      [-62, -290, 16, 11, 7, 1],
      [-40, -255, 14, 10, 7, 1],
      [46, -322, 20, 12, 8, 2],
      [64, -286, 15, 10, 7, 1],
      [50, -248, 13, 9, 6, 1],
      [86, -310, 14, 10, 7, 1],
    ];
    for (const [off, z, w, d, h, tiers] of town) {
      const x = riverX(z) + off;
      hall(b, x, Math.max(2, heightAt(x, z)), z, w, d, h, Math.atan2(off, 60) * 0.4, tiers);
    }
    const px = riverX(-300) - 78;
    pagoda(b, px, Math.max(2, heightAt(px, -300)), -300, 13, 5, 7);
  }

  /* ---------- The Echo Lake: temples on its rocks, a gate in its water ---------- */
  {
    const lv = LAKE.level;
    const at = (dx: number, dz: number) => [LAKE.x + dx, Math.max(lv + 1, heightAt(LAKE.x + dx, LAKE.z + dz)), LAKE.z + dz] as const;
    const [tx, ty, tz] = at(14, -LAKE.radius - 12);
    hall(b, tx, ty, tz, 30, 16, 11, 0, 2);
    const [ex, ey, ez] = at(LAKE.radius + 10, -20);
    hall(b, ex, ey, ez, 12, 12, 6, Math.PI / 2);
    const [wx, wy, wz] = at(-LAKE.radius + 8, -46);
    pagoda(b, wx, wy, wz, 9, 3, 6);
    // The gate standing in the water, turned to the arriving visitor.
    gate(b, ECHO_GATE.x, lv - 2, ECHO_GATE.z, 18, 26, ECHO_GATE.rot);
  }

  /* ---------- The Overlook: a balustrade, two lanterns, and someone already there ---------- */
  {
    const { x, z, height: y } = OVERLOOK;
    const edge = (dx: number) => z - 30 + dx * dx * 0.006;
    // Paving: courses of stone slabs, each a little uneven, out to the balustrade.
    const pave = seeded(404);
    for (let row = 0; row < 12; row++) {
      const pz = z - 28 + row * 2.9;
      for (let dx = -30; dx < 30; dx += 3.3) {
        const px = x + dx + (row % 2) * 1.6;
        if (pz < edge(px - x) + 1.5) continue;
        b.box("stone", 3.1, 0.5, 2.7, px, y - 0.25, pz, (pave() - 0.5) * 0.02);
      }
    }
    for (let dx = -26; dx <= 26; dx += 4.3) {
      b.box("darkStone", 0.4, 1.9, 0.4, x + dx, y, edge(dx));
      if (dx + 4.3 <= 26) b.box("darkStone", 4.4, 0.22, 0.3, x + dx + 2.15, y + 1.8, (edge(dx) + edge(dx + 4.3)) / 2, -Math.atan2(edge(dx + 4.3) - edge(dx), 4.3));
    }
    for (const side of [-1, 1]) {
      const lx = x + side * 30;
      const lz = edge(side * 30) + 2;
      b.box("stone", 2.6, 0.8, 2.6, lx, y, lz);
      b.add("stone", UNIT_CYL, lx, y + 2.3, lz, 0, 0.5, 3, 0.5);
      b.box("lamp", 1.5, 1.5, 1.5, lx, y + 3.8, lz);
      b.add("roof", roofGeometry(3.6, 3.6, 1.4), lx, y + 6, lz);
    }
    // A lone figure in a broad hat, looking out over the realm.
    const fx = x + 5;
    const fz = z - 27;
    b.add("darkStone", new THREE.ConeGeometry(0.55, 1.7, 8), fx, y + 0.85, fz);
    b.add("darkStone", new THREE.SphereGeometry(0.2, 8, 6), fx, y + 1.8, fz);
    b.add("roof", new THREE.ConeGeometry(0.62, 0.28, 12), fx, y + 2.0, fz);
    b.add("darkStone", UNIT_CYL, fx + 0.42, y + 1.0, fz, 0, 0.05, 1.9, 0.05, 0, 0.25);
  }
  b.build(materials, scene, keep);
  await breathe();

  /* ---------- Waterfalls ---------- */
  const falls: THREE.Mesh[] = [];
  {
    const material = keep(
      new THREE.ShaderMaterial({
        vertexShader: FALL_VERTEX,
        fragmentShader: FALL_FRAGMENT,
        uniforms: shared,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    for (const f of FALLS) {
      const g = fallGeometry(f.from, f.out, f.width);
      if (!g) continue;
      keep(g);
      const mesh = new THREE.Mesh(g, material);
      mesh.renderOrder = 3;
      scene.add(mesh);
      falls.push(mesh);
    }
  }

  /* ---------- Glows: lamps that read from far off ---------- */
  const glowMap = keep(glowTexture());
  const glow = (color: THREE.Color, size: number, opacity = 1) => {
    const sprite = new THREE.Sprite(
      keep(new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })),
    );
    sprite.scale.setScalar(size);
    sprite.renderOrder = 5;
    scene.add(sprite);
    return sprite;
  };
  const keepGlow = glow(C.cinnabar.clone().multiplyScalar(1.6), 60);
  keepGlow.position.set(FORTRESS.x, keepTop - 6, FORTRESS.z);
  glow(new THREE.Color(1, 0.7, 0.4), 34, 0.6).position.set(riverX(BRIDGE.z), BRIDGE.deck + 8, BRIDGE.z);
  glow(new THREE.Color(1, 0.7, 0.4), 50, 0.45).position.set(riverX(-290), 14, -290);
  glow(new THREE.Color(1, 0.72, 0.42), 30, 0.5).position.set(LAKE.x + 14, LAKE.level + 18, LAKE.z - LAKE.radius - 12);
  for (const side of [-1, 1]) glow(C.gold.clone(), 7, 0.8).position.set(OVERLOOK.x + side * 30, OVERLOOK.height + 4.2, OVERLOOK.z - 28 + 5.4);

  // The orb hovering in the gate's frame, above its own ripples.
  const orb = new THREE.Mesh(
    keep(new THREE.SphereGeometry(6, 40, 24)),
    shader(/* glsl */ `
      ${NOISE}
      ${ATMOSPHERE}
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vTint;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(cameraPosition - vWorld);
        float lit = 0.5 + 0.5 * dot(n, uSunDir);
        vec3 c = mix(uGold * 0.8, uParch * 1.05, smoothstep(0.2, 0.9, lit));
        c += uGold * 0.45 * pow(1.0 - max(dot(n, v), 0.0), 2.5);
        gl_FragColor = vec4(atmosphere(c, vWorld), 1.0);
      }
    `),
  );
  const orbHome = new THREE.Vector3(ECHO_ORB.x, LAKE.level + 10, ECHO_ORB.z);
  orb.position.copy(orbHome);
  scene.add(orb);
  const orbGlow = glow(C.gold.clone().multiplyScalar(0.7), 44, 0.6);

  /* ---------- The sea of cloud, the descent's cloud bank, the storm over the Sentinel ---------- */
  const clear = DESTINATIONS.map((d) => v2(d.anchor[0], d.anchor[2]));
  {
    const plane = keep(new THREE.PlaneGeometry(EXTENT * 3.4, EXTENT * 3.4, 1, 1));
    plane.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(plane, shader(CLOUD_FRAGMENT, { uClear: { value: clear } }, { transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.position.y = CLOUD_SEA;
    mesh.renderOrder = 2;
    scene.add(mesh);
  }
  const puffMap = keep(puffTexture());
  const puffs: { sprite: THREE.Sprite; base: THREE.Vector3; drift: number; opacity: number; bank: boolean; size: number }[] = [];
  {
    const rand = seeded(5);
    const add = (x: number, y: number, z: number, size: number, color: THREE.Color, opacity: number, bank = false) => {
      const material = keep(new THREE.SpriteMaterial({ map: puffMap, color, transparent: true, depthWrite: false, opacity }));
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      sprite.scale.set(size * 1.9, size * 0.75, 1);
      sprite.renderOrder = 4;
      scene.add(sprite);
      puffs.push({ sprite, base: sprite.position.clone(), drift: 0.5 + rand(), opacity, bank, size });
    };
    // The bank the descent dives through, over the southern ridge. It shows only
    // while the camera is near its height: from far above it would hide the realm.
    for (let i = 0; i < 22; i++) {
      add(30 + (rand() - 0.5) * 420, CLOUD_BANK - 40 + rand() * 90, 420 + (rand() - 0.5) * 380, 120 + rand() * 130, new THREE.Color(0.95, 0.86, 0.72), 0.7, true);
    }
    // Storm cloud wrapped around the Sentinel's summit.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(SUMMIT[0] + Math.cos(a) * 120, 360 + rand() * 80, SUMMIT[1] + Math.sin(a) * 120, 110 + rand() * 90, new THREE.Color(0.42, 0.46, 0.52), 0.7);
    }
    // Wisps clinging to the gorge and the lake's cliffs.
    for (let i = 0; i < 10; i++) {
      add(riverX(BRIDGE.z) + (rand() - 0.5) * 140, 60 + rand() * 40, BRIDGE.z + (rand() - 0.5) * 120, 60 + rand() * 50, new THREE.Color(0.85, 0.8, 0.7), 0.5);
      add(PLATEAU.x + (rand() - 0.5) * 300, 40 + rand() * 60, PLATEAU.z + (rand() - 0.5) * 300, 60 + rand() * 60, new THREE.Color(0.8, 0.88, 0.85), 0.45);
    }
  }

  // Snow drifting through the Sentinel's storm.
  {
    const count = 1400;
    const seeds = new Float32Array(count * 4);
    const rand = seeded(31);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 4));
    const points = new THREE.Points(
      g,
      keep(
        new THREE.ShaderMaterial({
          vertexShader: SNOW_VERTEX,
          fragmentShader: SNOW_FRAGMENT,
          uniforms: { uTime: shared.uTime, uParch: shared.uParch, uCentre: { value: new THREE.Vector3(FORTRESS.x, FORTRESS.height, FORTRESS.z) } },
          transparent: true,
          depthWrite: false,
        }),
      ),
    );
    points.frustumCulled = false;
    points.renderOrder = 6;
    scene.add(points);
  }

  /* ---------- Sky ---------- */
  const sky = new THREE.Mesh(
    keep(new THREE.SphereGeometry(8000, 32, 16)),
    keep(new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms: shared, side: THREE.BackSide, depthWrite: false })),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  /* ---------- Golden routes along the land, from the Overlook and between the places ---------- */
  const routeMaterial = (base: number) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: ROUTE_VERTEX,
        fragmentShader: ROUTE_FRAGMENT,
        uniforms: { uTime: shared.uTime, uGold: shared.uGold, uActive: { value: 0 }, uBase: { value: base } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  const routes = DESTINATIONS.map((d) => {
    const curve = trailCurve(d.trail, 5, deckSpan);
    const material = routeMaterial(0.32);
    const mesh = new THREE.Mesh(keep(new THREE.TubeGeometry(curve, 360, 1.3, 6, false)), material);
    mesh.renderOrder = 6;
    scene.add(mesh);
    return { slug: d.slug, curve, material, active: 0 };
  });
  // Fainter threads joining the places to each other.
  for (const link of [
    [
      [FORTRESS.x + 40, FORTRESS.z + 30],
      [-170, -380],
      [-60, -430],
      [deckSpan[0] - 4, BRIDGE.z],
    ],
    [
      [deckSpan[1] + 4, BRIDGE.z],
      [140, -420],
      [210, -330],
      [LAKE.x - 70, LAKE.z - 40],
    ],
  ] as const) {
    const mesh = new THREE.Mesh(keep(new THREE.TubeGeometry(trailCurve(link, 4, deckSpan), 200, 0.9, 5, false)), routeMaterial(0.2));
    mesh.renderOrder = 6;
    scene.add(mesh);
  }

  /* ---------- The guiding wind: ginkgo leaves ---------- */
  const leafCount = 72;
  const leaves = new THREE.InstancedMesh(
    keep(new THREE.PlaneGeometry(2.4, 2.4)),
    keep(new THREE.ShaderMaterial({ vertexShader: LEAF_VERTEX, fragmentShader: LEAF_FRAGMENT, uniforms: shared, transparent: true, depthWrite: false, side: THREE.DoubleSide })),
    leafCount,
  );
  leaves.frustumCulled = false;
  leaves.renderOrder = 7;
  scene.add(leaves);
  const leafSeeds = Array.from({ length: leafCount }, (_, i) => {
    const r = seeded(900 + i);
    return { u: r(), speed: 0.05 + r() * 0.06, radius: 3 + r() * 16, angle: r() * 6.28, spin: (r() - 0.5) * 6, flip: 2 + r() * 5 };
  });
  let leafPath: THREE.Curve<THREE.Vector3> | null = null;
  let leafStrength = 0;

  /* ---------- Camera ---------- */
  const descent = new THREE.CatmullRomCurve3(DESCENT.map((k) => v3(k.position)), false, "centripetal");
  const descentLook = new THREE.CatmullRomCurve3(DESCENT.map((k) => v3(k.target)), false, "centripetal");
  const keyAt = DESCENT.map((k) => k.at);
  const curveU = (p: number) => {
    const n = keyAt.length - 1;
    for (let i = 0; i < n; i++) {
      if (p <= keyAt[i + 1]) return (i + (p - keyAt[i]) / (keyAt[i + 1] - keyAt[i])) / n;
    }
    return 1;
  };

  /** A flight path that keeps its distance from the land: lifted wherever it would come too close. */
  const clearPath = (points: THREE.Vector3[], clearance: number) => {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const samples = curve.getSpacedPoints(48);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < samples.length - 1; i++) {
        const floor = surfaceAt(samples[i].x, samples[i].z) + clearance * Math.min(1, Math.min(i, samples.length - 1 - i) / 6);
        if (samples[i].y < floor) samples[i].y = floor;
      }
    }
    return new THREE.CatmullRomCurve3(samples, false, "centripetal");
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
  let baseFov = 52;
  const frame = { x: 0, y: 0, tx: 0, ty: 0 };
  let clock = 0;
  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);

  const placeCamera = (now: number) => {
    if (flight) {
      const t = Math.min(1, Math.max(0, (now - flight.start) / flight.duration));
      const u = easeInOut(t);
      flight.path.getPointAt(u, camera.position);
      const ahead = flight.path.getPointAt(Math.min(1, u + 0.07), tmp);
      target.copy(flight.fromTarget).lerp(ahead, smoothstep(0, 0.22, t));
      target.lerp(flight.toTarget, smoothstep(0.5, 0.95, t));
      camera.fov = baseFov + Math.sin(Math.PI * t) * 8;
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
    tmp.copy(target).sub(camera.position);
    tmp.applyAxisAngle(yAxis, -look.sx * LOOK.yaw * reach * free);
    const flat = Math.hypot(tmp.x, tmp.z);
    tmp.y += flat * Math.tan(look.sy * LOOK.pitch * reach * free);
    if (!still) {
      camera.position.y += Math.sin(clock * 0.4) * 0.3 * free;
      tmp.x += Math.sin(clock * 0.23) * flat * 0.003 * free;
    }
    camera.lookAt(tmp.add(camera.position));
  };

  const fogTint = new THREE.Color();
  const updateAtmosphere = () => {
    // Inside the descent's cloud bank, and at the very start, the world dissolves.
    const p = camera.position;
    const inBank = (1 - smoothstep(30, 80, Math.abs(p.y - CLOUD_BANK))) * (1 - smoothstep(260, 380, Math.hypot(p.x - 30, p.z - 420)));
    const dark = at === "descent" ? 1 - smoothstep(0.02, 0.13, descentP) : 0;
    shared.uVeil.value = Math.max(inBank * 0.9, dark);
    // Each destination brings its own light as the camera nears it.
    let mood = 0;
    let sun = 1;
    let haze = 1;
    fogTint.setRGB(0, 0, 0);
    for (const d of DESTINATIONS) {
      const w = 1 - smoothstep(90, 420, p.distanceTo(v3(d.view.position)));
      if (w <= 0) continue;
      const m = MOODS[d.mood];
      mood += w;
      fogTint.r += m.tint[0] * w;
      fogTint.g += m.tint[1] * w;
      fogTint.b += m.tint[2] * w;
      sun += (m.sun - 1) * w;
      haze += (m.haze - 1) * w;
    }
    if (mood > 0) fogTint.multiplyScalar(1 / mood);
    shared.uFogTint.value.copy(fogTint);
    shared.uMood.value = Math.min(1, mood);
    shared.uSun.value.copy(sunBase).multiplyScalar(sun * (1 - dark * 0.6));
    shared.uHaze.value = 0.00085 * haze * (1 + dark * 3);
  };

  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const e4 = new THREE.Euler();
  const s4 = new THREE.Vector3();
  const p4 = new THREE.Vector3();
  const updateLife = (dt: number) => {
    // The orb breathes above the water; the floating rocks do not stay quite still.
    orb.position.y = orbHome.y + (still ? 0 : Math.sin(clock * 0.6) * 1.2);
    orbGlow.position.copy(orb.position);
    // Cloud drifts on the wind, and thins when the camera is so close it would fill the view.
    const cam = camera.position;
    const bankSeen = 1 - smoothstep(70, 220, Math.abs(cam.y - CLOUD_BANK));
    for (const c of puffs) {
      if (!still) c.sprite.position.x = c.base.x + Math.sin(clock * 0.03 * c.drift + c.base.z) * 24 + ((clock * 0.4 * c.drift + 200) % 400) - 200;
      const near = smoothstep(c.size * 0.4, c.size * 1.4, c.sprite.position.distanceTo(cam));
      const opacity = c.opacity * near * (c.bank ? bankSeen : 1);
      (c.sprite.material as THREE.SpriteMaterial).opacity = opacity;
      c.sprite.visible = opacity > 0.01;
    }

    // Routes glow when focused or travelled.
    for (const r of routes) {
      const want = r.slug === focus || (flight && flight.to === r.slug) ? 1 : 0;
      r.active += (want - r.active) * Math.min(1, dt * 4);
      r.material.uniforms.uActive.value = r.active;
    }

    // The guiding wind: leaves stream along the focused route, or with the camera in flight.
    const leafTarget = flight ? 1 : focus ? 0.55 : 0;
    leafStrength += (leafTarget - leafStrength) * Math.min(1, dt * 2.5);
    if (flight) leafPath = flight.path;
    else if (focus) leafPath = routes.find((r) => r.slug === focus)?.curve ?? leafPath;
    leaves.visible = leafStrength >= 0.01 && !still && leafPath !== null;
    if (!leaves.visible || !leafPath) return;
    const camU = flight ? easeInOut(Math.min(1, Math.max(0, (performance.now() - flight.start) / flight.duration))) : 0;
    leafSeeds.forEach((seed, i) => {
      seed.u = (seed.u + seed.speed * dt * (flight ? 1.6 : 1)) % 1;
      const u = flight ? Math.min(1, camU + 0.02 + seed.u * 0.22) : seed.u;
      leafPath!.getPointAt(u, p4);
      const a = seed.angle + clock * 0.8;
      const r = seed.radius * (flight ? 0.8 : 1);
      p4.x += Math.cos(a) * r;
      p4.y += Math.sin(a * 1.3) * r * 0.5 + (flight ? 0 : 3);
      p4.z += Math.sin(a) * r;
      e4.set(clock * seed.spin * 0.3, clock * seed.spin * 0.2 + i, Math.sin(clock * seed.flip) * 1.2);
      q4.setFromEuler(e4);
      const fade = Math.sin(Math.PI * (flight ? (u - camU) / 0.24 : u));
      s4.setScalar(leafStrength * Math.max(0, fade) * (flight ? 0.8 : 1.5));
      leaves.setMatrixAt(i, m4.compose(p4, q4, s4));
    });
    leaves.instanceMatrix.needsUpdate = true;
  };

  // Compile every program now, while everything is visible, so nothing stalls the
  // first time it comes into view (a flight, the guiding leaves).
  camera.position.copy(v3(VANTAGE.position));
  camera.lookAt(v3(VANTAGE.target));
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    renderer.compile(scene, camera);
  }

  const probe = perfProbe("realm", renderer.getContext());
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
      baseFov = w < h ? 66 : 52;
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
      // Fly along the route over the land: its trail, lifted well clear of the ground.
      const over = (trail: readonly (readonly [number, number])[]) =>
        trail.slice(1, -1).map(([x, z]) => new THREE.Vector3(x, surfaceAt(x, z) + 60, z));
      let points: THREE.Vector3[];
      if (toHome) points = [from, ...(current ? over([...current.trail].reverse()) : []), end];
      else if (!current) points = [from, ...over(dest!.trail), end];
      else {
        const mid = from.clone().lerp(end, 0.5);
        mid.y = Math.max(from.y, end.y, surfaceAt(mid.x, mid.z) + 60) + 50;
        points = [from, mid, end];
      }
      const path = clearPath(points, 34);
      const duration = Math.min(5200, Math.max(2800, path.getLength() * 4.2));
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
      if (probe) probe.time(() => renderer.render(scene, camera));
      else renderer.render(scene, camera);
    },
    anchors() {
      return DESTINATIONS.map((d) => {
        // The Sentinel's marker rides just above its keep, wherever the keep's roof ends.
        if (d.mood === "storm") tmp.set(FORTRESS.x, keepTop + 12, FORTRESS.z);
        else tmp.copy(v3(d.anchor));
        const depth = camera.position.distanceTo(tmp);
        tmp.project(camera);
        const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        return {
          slug: d.slug,
          x: (tmp.x * 0.5 + 0.5) * width,
          y: (-tmp.y * 0.5 + 0.5) * height,
          visible,
          depth,
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

/** Give a geometry a per-vertex `tint` (trunk brown, crown white) for trees coloured per instance. */
function tinted(geometry: THREE.BufferGeometry, rgb: [number, number, number]): THREE.BufferGeometry {
  const g = (geometry.index ? geometry.toNonIndexed() : geometry) as THREE.BufferGeometry;
  if (g.attributes.uv) g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const data = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) data.set(rgb, i * 3);
  g.setAttribute("tint", new THREE.Float32BufferAttribute(data, 3));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
