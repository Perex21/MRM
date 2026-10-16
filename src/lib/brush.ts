/**
 * Geometry for the brush that writes names in ink (see realm/InkName).
 *
 * Pure functions of the layout: where each line and letter stands, and the
 * path the brush tip takes to write them, so the same name is always written
 * the same way.
 */

export type Point = { x: number; y: number };

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const span = (v: number, [a, b]: readonly [number, number]) => clamp01((v - a) / (b - a));

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

/* ------------------------------------------------------------------ */
/* The names                                                           */
/* ------------------------------------------------------------------ */

export type Glyph = { x0: number; x1: number; space: boolean };
export type Line = { text: string; x: number; baseline: number; width: number; glyphs: Glyph[] };
export type Layout = { lines: Line[]; size: number; top: number; bottom: number; left: number; right: number };

/**
 * Lays the names out as one left-aligned block, centred on the screen, each
 * name wrapped to `maxWidth` and separated from the next by a wider gap.
 */
export function layoutNames(
  names: string[],
  measure: (text: string) => number,
  size: number,
  maxWidth: number,
  width: number,
  height: number,
): Layout {
  const leading = size * 1.08;
  const gap = size * 0.42;
  const rows: { text: string; name: number }[] = [];
  names.forEach((name, n) => {
    let row = "";
    for (const word of name.split(" ")) {
      const next = row ? `${row} ${word}` : word;
      if (row && measure(next) > maxWidth) {
        rows.push({ text: row, name: n });
        row = word;
      } else {
        row = next;
      }
    }
    rows.push({ text: row, name: n });
  });

  const gaps = rows.filter((row, i) => i > 0 && row.name !== rows[i - 1].name).length;
  const blockHeight = rows.length * leading + gaps * gap;
  const blockWidth = Math.max(...rows.map((row) => measure(row.text)));
  const left = (width - blockWidth) / 2;
  let baseline = (height - blockHeight) / 2 + size * 0.82;

  const lines: Line[] = rows.map((row, i) => {
    if (i > 0) baseline += leading + (row.name !== rows[i - 1].name ? gap : 0);
    const glyphs: Glyph[] = [...row.text].map((char, g) => ({
      x0: left + measure(row.text.slice(0, g)),
      x1: left + measure(row.text.slice(0, g + 1)),
      space: char === " ",
    }));
    return { text: row.text, x: left, baseline, width: measure(row.text), glyphs };
  });

  return {
    lines,
    size,
    top: lines[0].baseline - size,
    bottom: lines[lines.length - 1].baseline + size * 0.35,
    left,
    right: left + blockWidth,
  };
}

/* ------------------------------------------------------------------ */
/* The brush tip's path while writing                                  */
/* ------------------------------------------------------------------ */

export type TipPoint = Point & { ink: boolean; line: number; t: number };
export type TipPath = { points: TipPoint[]; total: number };

/** Italic slant of the display face, as x per unit of height. */
const SLANT = 0.2;

/**
 * Handwriting is an oscillation carried forward: the tip swings down and up
 * once per letter while it travels along the line. Between lines the brush
 * lifts and glides (no ink). Each point carries a cumulative weight `t`, so
 * progress maps to distance written rather than to point count.
 */
export function tipPath(layout: Layout): TipPath {
  const { size } = layout;
  const points: TipPoint[] = [];
  const steps = 9;
  let t = 0;

  const push = (x: number, y: number, ink: boolean, line: number, weight: number) => {
    const prev = points[points.length - 1];
    if (prev) t += Math.hypot(x - prev.x, y - prev.y) * weight;
    points.push({ x, y, ink, line, t });
  };

  layout.lines.forEach((line, l) => {
    const mid = line.baseline - size * 0.3;
    const amp = size * 0.24;

    if (l > 0) {
      // Lift, glide back to the start of the next line, and touch down.
      const from = points[points.length - 1];
      const to = { x: line.glyphs[0].x0 + SLANT * amp, y: mid - amp };
      const over = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - size * 0.45 };
      for (let k = 1; k <= 8; k++) {
        const u = k / 9;
        const x = lerp(lerp(from.x, over.x, u), lerp(over.x, to.x, u), u);
        const y = lerp(lerp(from.y, over.y, u), lerp(over.y, to.y, u), u);
        push(x, y, false, l, 0.45);
      }
    }

    line.glyphs.forEach((glyph) => {
      for (let k = 0; k < steps; k++) {
        const u = k / steps;
        const y = glyph.space ? line.baseline - size * 0.12 : mid - amp * Math.cos(Math.PI * 2 * u);
        const x = lerp(glyph.x0, glyph.x1, u) + SLANT * (line.baseline - y);
        push(x, y, true, l, glyph.space ? 0.6 : 1);
      }
    });
    const last = line.glyphs[line.glyphs.length - 1];
    push(last.x1 + SLANT * amp, mid - amp, true, l, 1);
  });

  return { points, total: t };
}

/** The tip at a fraction of the writing, with the index of the segment it is on. */
export function tipAt(path: TipPath, q: number): { point: TipPoint; index: number; frac: number } {
  const target = clamp01(q) * path.total;
  const { points } = path;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t <= target) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const frac = b.t > a.t ? (target - a.t) / (b.t - a.t) : 0;
  return {
    point: { x: lerp(a.x, b.x, frac), y: lerp(a.y, b.y, frac), ink: b.ink, line: b.line, t: target },
    index: lo,
    frac,
  };
}
