/**
 * Pacing and watching the site's render loops (the landing's Atmosphere and
 * the Archive's realm).
 *
 * Pacing: a high-refresh screen asks for a frame every few milliseconds, but
 * motion this soft gains nothing beyond about 60 frames a second. The governor
 * renders on an even cadence of whole display refreshes that stays at or above
 * 60: every frame at 60–119 Hz, every second frame at 120–179 Hz (72 fps on a
 * 144 Hz laptop), and so on — half the work at 144 Hz with no visible change.
 *
 * Watching: it measures the interval between rendered frames. Quality is never
 * lowered by device category; only when frames measurably miss their slot does
 * the resolution scale step down, a little at a time, and it steps back up once
 * frames have kept time for a while. If even the lowest scale cannot keep up,
 * the loop is marked as struggling, and its owner falls back to a calmer mode.
 */

export type Governor = {
  /** Call on every animation frame. True when this frame should be rendered. `slack` > 1 allows a slower cadence (ambient-only frames). */
  due(now: number, slack?: number): boolean;
  /** Call after rendering a frame due with the same `slack`. */
  rendered(now: number, slack?: number): void;
  /** Resolution scale, `min`…1. */
  readonly scale: number;
  /** The lowest scale is not enough: frames still miss their slot. */
  readonly struggling: boolean;
  /** Forget timing history, after rendering paused (scrolled away, tab hidden). */
  reset(): void;
};

type GovernorOptions = {
  /** Lowest resolution scale it may step down to. */
  min: number;
  /** Called when the scale changes. */
  onScale?: (scale: number) => void;
};

/** Frames are measured in windows of this many rendered frames. */
const WINDOW = 45;

export function createGovernor({ min, onScale }: GovernorOptions): Governor {
  let scale = 1;
  let struggling = false;
  // Display refresh, estimated from the shortest recent animation-frame intervals.
  const ticks: number[] = [];
  let refresh = 1000 / 60;
  let lastTick = 0;
  let lastRender = 0;
  let slow = 0;
  let count = 0;
  let calm = 0;
  let starved = 0;

  const interval = () => {
    const perRefresh = Math.max(1, Math.floor(1000 / refresh / 60 + 0.05));
    return refresh * perRefresh;
  };

  const setScale = (next: number) => {
    const clamped = Math.min(1, Math.max(min, next));
    if (Math.abs(clamped - scale) < 0.001) return;
    scale = clamped;
    onScale?.(scale);
  };

  return {
    get scale() {
      return scale;
    },
    get struggling() {
      return struggling;
    },
    due(now, slack = 1) {
      if (lastTick) {
        const d = now - lastTick;
        if (d > 2 && d < 100) {
          ticks.push(d);
          if (ticks.length > 90) ticks.shift();
          if (ticks.length >= 12) {
            const sorted = [...ticks].sort((a, b) => a - b);
            refresh = sorted[Math.floor(sorted.length * 0.1)];
          }
        }
      }
      lastTick = now;
      const target = interval() * slack * (struggling ? 2 : 1);
      return !lastRender || now - lastRender >= target - refresh * 0.5;
    },
    rendered(now, slack = 1) {
      if (lastRender) {
        const gap = now - lastRender;
        if (gap < 250) {
          // A frame misses its slot when it lands a fifth or more past it (60 fps at the least).
          const target = Math.max(interval(), 1000 / 60) * slack * (struggling ? 2 : 1);
          if (gap > target * 1.2) slow++;
          count++;
        }
      }
      lastRender = now;
      if (count < WINDOW) return;
      const missed = slow / count;
      slow = 0;
      count = 0;
      if (missed > 0.25) {
        calm = 0;
        if (scale > min + 0.001) setScale(scale * 0.9);
        else if (++starved >= 2) struggling = true;
      } else {
        starved = 0;
        if (missed < 0.04 && ++calm >= 3) {
          calm = 0;
          setScale(scale * 1.05);
        }
      }
    },
    reset() {
      lastRender = 0;
      lastTick = 0;
      slow = 0;
      count = 0;
    },
  };
}

type PerfStats = { frames: number; recent: number[]; avgMs: number; p95Ms: number; scale: number; struggling: boolean };

type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
type TimerExt1 = TimerExt & {
  QUERY_RESULT_EXT: number;
  QUERY_RESULT_AVAILABLE_EXT: number;
  createQueryEXT(): WebGLQuery;
  deleteQueryEXT(q: WebGLQuery): void;
  beginQueryEXT(target: number, q: WebGLQuery): void;
  endQueryEXT(target: number): void;
  getQueryObjectEXT(q: WebGLQuery, pname: number): number | boolean;
};

/**
 * Development aid: with `?perf` in the URL, the GPU time of each render is
 * measured with a timer query and kept in `window.__perf[name]` (average and
 * 95th percentile over the last 120 frames). Never active in production.
 */
export function perfProbe(name: string, gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (process.env.NODE_ENV === "production" || !/[?&]perf/.test(window.location.search)) return null;
  const store = ((window as unknown as { __perf?: Record<string, PerfStats> }).__perf ??= {});
  const stats: PerfStats = (store[name] = { frames: 0, recent: [], avgMs: 0, p95Ms: 0, scale: 1, struggling: false });
  const gl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext ? gl : null;
  const ext2 = gl2 ? (gl2.getExtension("EXT_disjoint_timer_query_webgl2") as TimerExt | null) : null;
  const ext1 = gl2 ? null : (gl.getExtension("EXT_disjoint_timer_query") as TimerExt1 | null);
  const pending: WebGLQuery[] = [];

  const record = (ms: number) => {
    stats.frames++;
    stats.recent.push(ms);
    if (stats.recent.length > 120) stats.recent.shift();
    const sorted = [...stats.recent].sort((a, b) => a - b);
    stats.avgMs = +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2);
    stats.p95Ms = +sorted[Math.floor(sorted.length * 0.95)].toFixed(2);
  };

  const collect = () => {
    while (pending.length) {
      const q = pending[0];
      if (gl2 && ext2) {
        if (!gl2.getQueryParameter(q, gl2.QUERY_RESULT_AVAILABLE)) break;
        if (!gl2.getParameter(ext2.GPU_DISJOINT_EXT)) record((gl2.getQueryParameter(q, gl2.QUERY_RESULT) as number) / 1e6);
        gl2.deleteQuery(q);
      } else if (ext1) {
        if (!ext1.getQueryObjectEXT(q, ext1.QUERY_RESULT_AVAILABLE_EXT)) break;
        if (!gl.getParameter(ext1.GPU_DISJOINT_EXT)) record((ext1.getQueryObjectEXT(q, ext1.QUERY_RESULT_EXT) as number) / 1e6);
        ext1.deleteQueryEXT(q);
      }
      pending.shift();
    }
  };

  return {
    time(render: () => void, governor?: Governor) {
      if (gl2 && ext2) {
        const q = gl2.createQuery()!;
        gl2.beginQuery(ext2.TIME_ELAPSED_EXT, q);
        render();
        gl2.endQuery(ext2.TIME_ELAPSED_EXT);
        pending.push(q);
      } else if (ext1) {
        const q = ext1.createQueryEXT();
        ext1.beginQueryEXT(ext1.TIME_ELAPSED_EXT, q);
        render();
        ext1.endQueryEXT(ext1.TIME_ELAPSED_EXT);
        pending.push(q);
      } else {
        const t0 = performance.now();
        render();
        gl.finish();
        record(performance.now() - t0);
      }
      collect();
      if (governor) {
        stats.scale = +governor.scale.toFixed(3);
        stats.struggling = governor.struggling;
      }
    },
  };
}
