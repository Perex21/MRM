/**
 * The realm: the world the Archive's projects live in (see RealmExplorer).
 *
 * Pure data and deterministic functions, with no rendering: the land's height,
 * its rivers, lake, waterfalls, landmarks, the three destinations, the golden
 * routes between them and the camera's path. The renderer (realm/scene.ts)
 * builds the world from these, so every place stays where it is on every visit
 * and every device.
 *
 * Geography (the camera looks north, towards -z; the river runs north–south;
 * the valley floor's water lies at y = 0):
 *
 *   West   — the Sentinel massif: a jagged, snow-capped mountain. A fortress
 *            stands on a shoulder below its summit.
 *   North  — the Ledger gorge: the river cuts between two tablelands. A
 *            stone bridge of three arches spans it; waterfalls fall from its
 *            cliffs; a temple town lines the river below.
 *   East   — the Echo plateau: a raised basin holding a jade lake, fed by
 *            falls from the ridge behind it and spilling over its western cliff
 *            to the river. A gate stands in the water; rocks float above it.
 *   South  — the Overlook: a ledge on the southern ridge where the visitor
 *            arrives, with all three places in view.
 *   Around — far ranges on every side, fading into the haze.
 *
 * Each destination is framed by one of the three distances of Chinese
 * landscape painting (Guo Xi): high distance, looking up at a summit; deep
 * distance, looking through the mountains; level distance, across water.
 */

import type { ProjectSlug } from "@/content/projects";

export type Vec3 = readonly [number, number, number];
type XZ = readonly [number, number];

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

/** Ridged noise: sharp crests, the backbone of every range. */
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

export const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const dist = (x: number, z: number, p: XZ) => Math.hypot(x - p[0], z - p[1]);

/* ------------------------------------------------------------------ */
/* The land                                                            */
/* ------------------------------------------------------------------ */

/** Half the width of the detailed land; the far ranges reach well beyond it. */
export const EXTENT = 700;
/** Half the width of everything, horizon included. */
export const HORIZON = 2600;
/** Height of the valley clouds. */
export const CLOUD_SEA = 92;
/** Height of the cloud bank the descent passes through. */
export const CLOUD_BANK = 300;

/** Where the river runs at a given z. */
export const riverX = (z: number) => 34 + 26 * Math.sin(z * 0.0045 + 0.6) + 12 * Math.sin(z * 0.012 + 1.3);

/** The Sentinel's summit and the shoulder its fortress stands on. */
export const SUMMIT: XZ = [-345, -360];
export const FORTRESS = { x: -300, z: -300, height: 236 } as const;

/** The two tablelands either side of the gorge, and the bridge between them. */
const MESA_W: XZ = [-55, -440];
const MESA_E: XZ = [135, -440];
export const MESA_HEIGHT = 128;
export const BRIDGE = { z: -430, deck: 124 } as const;

/** The raised basin and its lake. */
export const PLATEAU = { x: 320, z: -230, radius: 175, height: 74 } as const;
export const LAKE = { x: 330, z: -238, radius: 112, level: 64 } as const;

/** The Overlook: the ledge the visitor arrives on. */
export const OVERLOOK = { x: -70, z: 250, height: 118 } as const;

/** Ground height at (x, z). */
export function heightAt(x: number, z: number): number {
  const river = Math.abs(x - riverX(z));

  // Rolling valley floor, flattening towards the river.
  let h = 22 * fbm(x * 0.006 + 3, z * 0.006) * smoothstep(20, 160, river);
  // Foothills between the river and the mountains: the middle ground.
  const hill = fbm(x * 0.0042 + 9, z * 0.0042 - 4);
  h += 95 * hill * hill * smoothstep(70, 260, river);

  // Ranges ring the realm, rising and roughening with distance.
  const r = Math.hypot(x * 0.9, z) / EXTENT;
  const ring = smoothstep(0.72, 1.35, r);
  if (ring > 0) h += ring * (230 + 420 * ridged(x * 0.0021 + 4, z * 0.0021 - 2)) * (0.75 + 0.25 * fbm(x * 0.001, z * 0.001));

  // The Sentinel massif: a broad mountain, a jagged crown, a sharp summit.
  const ds = dist(x, z, SUMMIT);
  if (ds < 420) {
    const massif = smoothstep(420, 90, ds);
    h += massif * (150 + 150 * ridged(x * 0.009 + 11, z * 0.009 + 5)) + 170 * Math.exp(-(ds * ds) / (2 * 62 * 62));
  }
  // Its fortress shoulder: a level platform cut into the slope.
  const df = dist(x, z, [FORTRESS.x, FORTRESS.z]);
  if (df < 70) h = h + (FORTRESS.height - h) * smoothstep(64, 40, df);

  // The two tablelands, with steep, broken edges.
  for (const m of [MESA_W, MESA_E]) {
    const dm = Math.hypot((x - m[0]) * 1.1, (z - m[1]) * 0.6);
    if (dm < 140) {
      const top = MESA_HEIGHT + 10 * (fbm(x * 0.03, z * 0.03) - 0.5);
      const edge = smoothstep(108 + 14 * noise(x * 0.04, z * 0.04), 82, dm);
      h = Math.max(h, top * edge);
    }
  }

  // The Echo plateau: raised land with cliff edges, its basin holding the lake.
  const dp = dist(x, z, [PLATEAU.x, PLATEAU.z]);
  if (dp < 260) {
    const shelf = smoothstep(PLATEAU.radius + 22 + 18 * noise(x * 0.03, z * 0.03), PLATEAU.radius - 6, dp);
    h = Math.max(h, PLATEAU.height * shelf + 8 * fbm(x * 0.02, z * 0.02) * shelf);
    // The ridge behind the lake, whose falls feed it.
    const back = smoothstep(260, 120, dist(x, z, [PLATEAU.x + 90, PLATEAU.z - 150]));
    h += back * (120 + 60 * ridged(x * 0.012, z * 0.012));
  }
  const dl = dist(x, z, [LAKE.x, LAKE.z]);
  if (dl < LAKE.radius * 1.3) h = Math.min(h, LAKE.level - 8 + 14 * smoothstep(LAKE.radius * 0.8, LAKE.radius * 1.25, dl) + (h - LAKE.level) * smoothstep(LAKE.radius * 1.05, LAKE.radius * 1.3, dl));
  // The lake's outflow: a channel cut to the western cliff.
  if (Math.abs(z - LAKE.z - 6) < 14 && x < LAKE.x - LAKE.radius * 0.8 && x > PLATEAU.x - PLATEAU.radius - 30) {
    h = Math.min(h, LAKE.level - 2 + Math.abs(z - LAKE.z - 6) * 0.4);
  }

  // The southern ridge and the Overlook on it.
  const ridge = smoothstep(150, 330, z) * (90 + 70 * ridged(x * 0.006 + 7, z * 0.006 + 3));
  h = Math.max(h, ridge * smoothstep(0, 60, z - 140));
  const dov = Math.hypot((x - OVERLOOK.x) * 0.9, z - OVERLOOK.z);
  if (dov < 90) h = h + (OVERLOOK.height - h) * smoothstep(60, 34, dov);
  // Rock shoulders either side of the view frame the valley from the Overlook.
  for (const s of [-1, 1]) {
    const d = Math.hypot(x - (OVERLOOK.x + s * 150), (z - (OVERLOOK.z - 30)) * 1.4);
    h = Math.max(h, 175 * smoothstep(110, 30, d) + 30 * ridged(x * 0.02, z * 0.02) * smoothstep(110, 40, d));
  }

  // The river and the gorge: carved below the water line, steep-sided in the gorge.
  const gorge = smoothstep(-560, -470, z) * (1 - smoothstep(-390, -330, z));
  const width = 26 - gorge * 10;
  h = h * smoothstep(width * 0.4, width * (gorge > 0.5 ? 1.2 : 2.6), river) - 5 * (1 - smoothstep(width * 0.3, width * 0.9, river));
  return h;
}

/** Whether (x, z) lies under the Echo lake's water. */
export const inLake = (x: number, z: number) => dist(x, z, [LAKE.x, LAKE.z]) < LAKE.radius * 1.05;

/* ------------------------------------------------------------------ */
/* Pillars and floating rocks                                          */
/* ------------------------------------------------------------------ */

export type Pillar = { x: number; z: number; radius: number; height: number; seed: number };

/**
 * Stone pillars: not a forest of them, but a few clusters where the land
 * suggests them — along the river's bends and below the plateau's cliffs.
 */
export function makePillars(): Pillar[] {
  const clusters: { c: XZ; n: number; spread: number }[] = [
    { c: [-60, -650], n: 5, spread: 80 },
    { c: [-280, 80], n: 4, spread: 70 },
  ];
  const rand = seeded(2026);
  const pillars: Pillar[] = [];
  for (const { c, n, spread } of clusters) {
    let tries = 0;
    let made = 0;
    while (made < n && tries++ < 200) {
      const x = c[0] + (rand() * 2 - 1) * spread;
      const z = c[1] + (rand() * 2 - 1) * spread;
      const radius = 7 + rand() * 9;
      if (Math.abs(x - riverX(z)) < 30 + radius) continue;
      if (pillars.some((p) => Math.hypot(p.x - x, p.z - z) < (p.radius + radius) * 1.4)) continue;
      const ground = heightAt(x, z);
      pillars.push({ x, z, radius, height: ground + 45 + rand() * 75, seed: Math.floor(rand() * 1e6) });
      made++;
    }
  }
  return pillars;
}

/** Rocks floating above the Echo lake, each crowned with a few pines. */
export const FLOATING = [
  { x: 385, z: -300, y: 170, radius: 26 },
  { x: 270, z: -320, y: 205, radius: 17 },
  { x: 420, z: -200, y: 140, radius: 13 },
] as const;

/* ------------------------------------------------------------------ */
/* Waterfalls                                                          */
/* ------------------------------------------------------------------ */

/**
 * Each fall leaves a lip at `from` and drops in direction `out` until it meets
 * the water or the ground below; the renderer drapes it down the real cliff.
 */
export const FALLS: { from: Vec3; out: XZ; width: number }[] = [
  // From the Echo lake over its western cliff, down to the river.
  { from: [PLATEAU.x - PLATEAU.radius + 6, LAKE.level - 1, LAKE.z + 6], out: [-1, 0], width: 16 },
  // Into the gorge from both tablelands, either side of the bridge.
  { from: [MESA_E[0] - 78, MESA_HEIGHT - 2, BRIDGE.z - 24], out: [-1, 0.15], width: 9 },
  { from: [MESA_W[0] + 76, MESA_HEIGHT - 2, BRIDGE.z + 22], out: [1, -0.1], width: 11 },
  // From the ridge behind the lake, into it.
  { from: [LAKE.x + 40, 190, LAKE.z - 112], out: [0, 1], width: 10 },
  { from: [LAKE.x - 50, 160, LAKE.z - 105], out: [0.2, 1], width: 7 },
];

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
  /** The way there from the Overlook, as points on the ground (x, z); the route follows the land between them. */
  trail: XZ[];
  /** Light of the place. */
  mood: "storm" | "gold" | "jade";
};

export const DESTINATIONS: Destination[] = [
  {
    slug: "hybrid-phishing-detection",
    place: "The Sentinel Spire",
    distance: "High distance — looking up at the summit",
    anchor: [FORTRESS.x, FORTRESS.height + 92, FORTRESS.z],
    view: { position: [-188, 196, -196], target: [-300, 282, -305] },
    trail: [
      [OVERLOOK.x, OVERLOOK.z - 40],
      [20, 120],
      [-40, -20],
      [-130, -110],
      [-210, -190],
      [-262, -262],
      [FORTRESS.x, FORTRESS.z],
    ],
    mood: "storm",
  },
  {
    slug: "gst-audit-compliance",
    place: "The Ledger Bridge",
    distance: "Deep distance — looking through the gorge",
    anchor: [riverX(BRIDGE.z), BRIDGE.deck + 30, BRIDGE.z],
    view: { position: [14, 96, -228], target: [28, 116, -470] },
    trail: [
      [OVERLOOK.x, OVERLOOK.z - 40],
      [60, 120],
      [70, -60],
      [88, -250],
      [96, -380],
      [80, BRIDGE.z],
      [riverX(BRIDGE.z), BRIDGE.z],
    ],
    mood: "gold",
  },
  {
    slug: "echoss-studio",
    place: "The Echo Lake",
    distance: "Level distance — looking across the water",
    anchor: [LAKE.x, LAKE.level + 46, LAKE.z + 40],
    view: { position: [282, 112, -85], target: [338, 84, -330] },
    trail: [
      [OVERLOOK.x, OVERLOOK.z - 40],
      [90, 110],
      [140, -30],
      [150, -150],
      [200, -224],
      [LAKE.x - 40, LAKE.z + 20],
    ],
    mood: "jade",
  },
];

export const destination = (slug: string) => DESTINATIONS.find((d) => d.slug === slug);

/* ------------------------------------------------------------------ */
/* The descent                                                         */
/* ------------------------------------------------------------------ */

/** Where the visitor stands once inside: on the Overlook, looking north over the valley. */
export const VANTAGE = {
  position: [OVERLOOK.x - 4, OVERLOOK.height + 8, OVERLOOK.z - 10] as Vec3,
  target: [10, 92, -300] as Vec3,
};

/**
 * The camera's path as the visitor scrolls into the realm: out of the dark
 * mist the Arrival left behind and up into the open, the whole world spread
 * below; then down through the cloud bank above the southern ridge, onto the
 * Overlook.
 */
export const DESCENT: { at: number; position: Vec3; target: Vec3 }[] = [
  { at: 0, position: [-60, 560, 1250], target: [0, 360, 300] },
  { at: 0.16, position: [-160, 760, 1020], target: [-20, 40, -260] },
  { at: 0.42, position: [140, 690, 860], target: [10, 40, -280] },
  { at: 0.58, position: [90, 420, 640], target: [20, 80, -260] },
  { at: 0.72, position: [50, 300, 470], target: [25, 90, -280] },
  { at: 0.86, position: [32, 170, 330], target: [28, 92, -290] },
  { at: 1, position: VANTAGE.position, target: VANTAGE.target },
];

/** How far the visitor may look around from where they stand, in radians. */
export const LOOK = { yaw: 1.2, pitch: 0.22 } as const;
