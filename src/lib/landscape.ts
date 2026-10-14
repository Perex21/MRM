/**
 * Deterministic ridgeline geometry for the world layer. Computed at module
 * load, identically on server and client, so hydration never disagrees.
 */

type Wave = {
  amp: number;
  /** Wavelength in viewBox units. */
  len: number;
  phase: number;
  /** Sharp waves form peaks (1 - |sin|); soft waves undulate. */
  sharp?: boolean;
};

/**
 * Closed SVG path for a mountain range across `width`, filled down to `height`.
 * `base` is the resting skyline; waves lift it into peaks.
 */
export function ridgePath(width: number, height: number, base: number, waves: Wave[], step = 24): string {
  let d = `M0 ${height}`;
  for (let x = 0; x <= width; x += step) {
    let y = base;
    for (const { amp, len, phase, sharp } of waves) {
      const s = Math.sin((x / len) * Math.PI * 2 + phase);
      y -= sharp ? amp * (1 - Math.abs(s)) : amp * s;
    }
    d += `L${x} ${y.toFixed(1)}`;
  }
  return `${d}L${width} ${height}Z`;
}

/** Piecewise-linear interpolation of `values` over ascending `stops`, clamped. */
export function interpolate(p: number, stops: readonly number[], values: readonly number[]): number {
  if (p <= stops[0]) return values[0];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]) {
      const span = stops[i] - stops[i - 1] || 1;
      const t = (p - stops[i - 1]) / span;
      return values[i - 1] + (values[i] - values[i - 1]) * t;
    }
  }
  return values[values.length - 1];
}
