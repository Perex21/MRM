/**
 * The realm: the world the Archive's projects live in (see RealmExplorer).
 *
 * Pure data and deterministic functions, with no rendering: the terrain's
 * height, the stone pillars, the three destinations and the camera's path.
 * The renderer (realm/scene.ts) builds the world from these, so every
 * destination keeps the same place on every visit and every device.
 *
 * Units are metres-ish. The camera looks north, towards -z. The river runs
 * north–south through the valley; water lies at y = 0.
 *
 * Each destination is framed by one of the three distances of Chinese
 * landscape painting (Guo Xi): high distance, looking up at a summit; deep
 * distance, looking through the mountains into what lies behind; level
 * distance, looking across to far ranges.
 */

import type { ProjectSlug } from "@/content/projects";

export type Vec3 = readonly [number, number, number];

/* ------------------------------------------------------------------ */
/* Noise                                                               */
/* ------------------------------------------------------------------ */

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * f + i * 17.3, y * f - i * 9.1);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/** Ridged noise: sharp crests, the backbone of the far ranges. */
export function ridged(x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.55;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * f + i * 31.7, y * f + i * 7.9) * 2 - 1);
    sum += amp * n * n;
    f *= 2.1;
    amp *= 0.5;
  }
  return sum;
}

/** Seeded xorshift: the same sequence for the same seed. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* The land                                                            */
/* ------------------------------------------------------------------ */

/** Half the width of the land; beyond it, only far ranges and haze. */
export const EXTENT = 900;
/** Height of the sea of clouds. */
export const CLOUD_SEA = 150;

/** Where the river runs at a given z. */
export const riverX = (z: number) => 70 * Math.sin(z * 0.0042 + 0.4) + 28 * Math.sin(z * 0.011 + 1.3);

export const LAKE = { x: 250, z: -175, radius: 115 } as const;
/** The terrace the visitor arrives on, overlooking the valley. */
export const GATE = { x: 0, z: 292, height: 38 } as const;

/** Ground height at (x, z), before the pillars. */
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z) / EXTENT;
  // Rolling foothills, lower near the river.
  const river = Math.abs(x - riverX(z));
  let h = 34 * fbm(x * 0.0055, z * 0.0055) * smoothstep(12, 150, river);
  // The ranges that ring the realm.
  h += smoothstep(0.5, 1.05, r) * (150 + 230 * ridged(x * 0.0032 + 4, z * 0.0032 - 2));
  // The river and the lake are carved below the water line.
  h = h * smoothstep(8, 60, river) - 5 * (1 - smoothstep(8, 40, river));
  const lake = Math.hypot(x - LAKE.x, z - LAKE.z);
  h = h * smoothstep(LAKE.radius * 0.85, LAKE.radius * 1.35, lake) - 9 * (1 - smoothstep(LAKE.radius * 0.75, LAKE.radius * 1.05, lake));
  // The arrival terrace: a flat shoulder of rock with a steep front.
  const gate = Math.hypot((x - GATE.x) * 0.8, z - GATE.z);
  h = Math.max(h, GATE.height * smoothstep(52, 34, gate) + (fbm(x * 0.05, z * 0.05) - 0.5) * 2 * smoothstep(52, 30, gate));
  return h;
}

/* ------------------------------------------------------------------ */
/* Pillars                                                             */
/* ------------------------------------------------------------------ */

export type Pillar = { x: number; z: number; radius: number; height: number; seed: number };

/** The stone pillars that rise out of the valley, some through the clouds. */
export function makePillars(count: number): Pillar[] {
  const fixed: Pillar[] = [
    // The Sentinel Spire's pillar, the tallest in the realm.
    { x: -215, z: -210, radius: 24, height: 250, seed: 1 },
    // The two pillars the Ledger Bridge joins.
    { x: 30, z: -340, radius: 21, height: 112, seed: 2 },
    { x: 126, z: -346, radius: 20, height: 106, seed: 3 },
  ];
  const rand = seeded(2026);
  const pillars = [...fixed];
  const corridors = DESTINATIONS.map((d) => d.view.position);
  let tries = 0;
  while (pillars.length < fixed.length + count && tries++ < count * 60) {
    const x = (rand() * 2 - 1) * EXTENT * 0.72;
    const z = (rand() * 2 - 1) * EXTENT * 0.72 - 120;
    const radius = 7 + rand() * 15;
    if (Math.hypot(x, z) > EXTENT * 0.72) continue;
    if (Math.abs(x - riverX(z)) < 34 + radius) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.radius + radius) continue;
    if (Math.hypot(x - GATE.x, z - GATE.z) < 90 + radius) continue;
    // Keep the lines of sight from the terrace to each destination open.
    if (corridors.some((to) => distanceToSegment(x, z, GATE.x, GATE.z - 30, to[0], to[2]) < radius + 26)) continue;
    if (pillars.some((p) => Math.hypot(p.x - x, p.z - z) < (p.radius + radius) * 1.3)) continue;
    const far = Math.min(1, Math.hypot(x, z) / (EXTENT * 0.7));
    pillars.push({ x, z, radius, height: 85 + rand() * 125 + far * 90, seed: Math.floor(rand() * 1e6) });
  }
  return pillars;
}

function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

export type Destination = {
  slug: ProjectSlug;
  /** The place's name in the realm. */
  place: string;
  /** Which of the three distances frames it, and how the arrival is composed. */
  distance: string;
  /** Where its marker stands. */
  anchor: Vec3;
  /** Where the camera comes to rest on arrival, and what it looks at. */
  view: { position: Vec3; target: Vec3 };
  /** Waypoints the golden route (and the camera) passes between the terrace and the arrival view. */
  via: Vec3[];
  /** Light of the place: a key colour for its lanterns and its sky. */
  mood: "moon" | "jade" | "dusk";
};

export const DESTINATIONS: Destination[] = [
  {
    slug: "hybrid-phishing-detection",
    place: "The Sentinel Spire",
    distance: "High distance — looking up at the summit",
    anchor: [-215, 300, -210],
    view: { position: [-128, 150, -114], target: [-212, 258, -208] },
    via: [
      [-60, 92, 150],
      [-110, 118, 10],
    ],
    mood: "moon",
  },
  {
    slug: "gst-audit-compliance",
    place: "The Ledger Bridge",
    distance: "Deep distance — looking through the gorge",
    anchor: [78, 128, -343],
    view: { position: [76, 100, -222], target: [80, 86, -490] },
    via: [
      [16, 84, 140],
      [56, 96, -60],
    ],
    mood: "jade",
  },
  {
    slug: "echoss-studio",
    place: "The Echo Lake",
    distance: "Level distance — looking across the water",
    anchor: [255, 48, -180],
    view: { position: [182, 16, -40], target: [282, 26, -262] },
    via: [
      [70, 78, 170],
      [150, 44, 40],
    ],
    mood: "dusk",
  },
];

export const destination = (slug: string) => DESTINATIONS.find((d) => d.slug === slug);

/* ------------------------------------------------------------------ */
/* The descent                                                         */
/* ------------------------------------------------------------------ */

/** Where the visitor stands once inside: on the terrace, looking north up the valley. */
export const VANTAGE = { position: [0, 50, 268] as Vec3, target: [20, 96, -160] as Vec3 };

/**
 * The camera's path as the visitor scrolls into the realm: out of the dark
 * cloud the Arrival left behind, up above the sea of clouds to see the whole
 * realm, then down through the clouds onto the terrace.
 */
export const DESCENT: { at: number; position: Vec3; target: Vec3 }[] = [
  { at: 0, position: [-80, 300, 980], target: [0, 230, 400] },
  { at: 0.16, position: [-200, 540, 820], target: [-90, 90, -160] },
  { at: 0.42, position: [60, 480, 680], target: [-60, 60, -190] },
  { at: 0.58, position: [70, 250, 470], target: [10, 60, -140] },
  { at: 0.72, position: [20, 150, 360], target: [10, 50, -150] },
  { at: 0.86, position: [4, 74, 300], target: [16, 80, -160] },
  { at: 1, position: VANTAGE.position, target: VANTAGE.target },
];

/** How far the visitor may look around from the terrace, in radians. */
export const LOOK = { yaw: 1.2, pitch: 0.22 } as const;
