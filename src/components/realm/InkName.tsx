"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { layoutNames, lerp, seeded, tipAt, tipPath, type Layout } from "@/lib/brush";

/*
 * A project's name, written by a brush in ink that follows its tip.
 *
 * Shown when the visitor arrives at a destination in the realm: the brush
 * comes down, writes the name stroke by stroke (each letter one down-and-up
 * swing of the tip, carried along the line), lifts and leaves. The ink is
 * textured once — a feather of bleed into the paper, a loaded stroke, a faint
 * mottling — and revealed under the path the tip has travelled.
 *
 * Decorative: the name is also the panel's heading for assistive technology.
 * Under reduced motion the name is simply there, without the brush.
 */

type InkNameProps = {
  text: string;
  /** Called once the brush has left the paper. */
  onWritten?: () => void;
  className?: string;
  /** Dark ink on paper, or pale ink laid over the world itself. */
  tone?: "dark" | "light";
};

type Colors = Record<"ink" | "stroke" | "inkRaised" | "paper" | "bamboo" | "bambooDeep" | "cord", string>;

/** Angle of the brush as a right hand holds it: the handle up and to the right. */
const HOLD = -1.02;
const LENGTH = 7.3;

export function InkName({ text, onWritten, className, tone = "dark" }: InkNameProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const written = useRef(onWritten);
  useEffect(() => {
    written.current = onWritten;
  });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let cancelled = false;

    const style = getComputedStyle(canvas);
    const read = (name: string) => style.getPropertyValue(name).trim();
    const colors: Colors = {
      ink: read("--pv-ink"),
      stroke: read(tone === "light" ? "--pv-parchment" : "--pv-ink"),
      inkRaised: read("--pv-ink-raised"),
      paper: read("--pv-parchment"),
      bamboo: read("--pv-bamboo"),
      bambooDeep: read("--pv-bamboo-deep"),
      cord: read("--pv-cinnabar"),
    };
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant-italic").trim() || "Georgia, serif";

    const start = async () => {
      const width = canvas.clientWidth;
      const size = Math.max(30, Math.min(width * 0.1, 50));
      const font = `italic 500 ${size}px ${family}`;
      try {
        await document.fonts.load(font, text);
      } catch {
        // Whatever face is available will do.
      }
      if (cancelled) return;

      const measure = document.createElement("canvas").getContext("2d")!;
      measure.font = font;
      // Room above for the brush's handle; the canvas reaches up over what precedes it.
      const pad = { x: size * 0.15, top: size * 3, bottom: size * 0.4 };
      let layout = layoutNames([text], (t) => measure.measureText(t).width, size, width - pad.x * 2 - size * 0.4, width, 10000);
      layout = shift(layout, pad.x - layout.left, pad.top + size - layout.lines[0].baseline);
      const height = Math.ceil(layout.bottom + pad.bottom);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = `${height}px`;
      canvas.style.marginTop = `${-size * 2.45}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const inked = inkText(layout, font, width, height, dpr, colors);
      const path = tipPath(layout);
      const mask = document.createElement("canvas");
      mask.width = canvas.width;
      mask.height = canvas.height;
      const unit = size * 0.62;

      const draw = (q: number, pose: Pose | null) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        if (q >= 1) {
          ctx.drawImage(inked, 0, 0, width, height);
        } else if (q > 0) {
          const { point, index } = tipAt(path, q);
          const m = mask.getContext("2d")!;
          m.setTransform(dpr, 0, 0, dpr, 0, 0);
          m.globalCompositeOperation = "source-over";
          m.clearRect(0, 0, width, height);
          // Lines already written, then the current one up to the tip.
          const current = point.line;
          if (current > 0) m.fillRect(0, 0, width, layout.lines[current].baseline - size * 0.98);
          m.lineCap = "round";
          m.lineJoin = "round";
          m.lineWidth = size * 0.66;
          m.beginPath();
          let started = false;
          for (let i = 0; i <= index; i++) {
            const pt = path.points[i];
            if (pt.line !== current || !pt.ink) continue;
            if (started) m.lineTo(pt.x, pt.y);
            else m.moveTo(pt.x, pt.y);
            started = true;
          }
          if (started && point.ink) m.lineTo(point.x, point.y);
          if (started) m.stroke();
          m.globalCompositeOperation = "source-in";
          m.drawImage(inked, 0, 0, width, height);
          // Fresh ink near the tip is wetter, and darker for it.
          m.globalCompositeOperation = "source-atop";
          const wet = m.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 1.6);
          wet.addColorStop(0, withAlpha(colors.stroke, 0.5));
          wet.addColorStop(1, withAlpha(colors.stroke, 0));
          m.fillStyle = wet;
          m.fillRect(0, 0, width, height);
          ctx.drawImage(mask, 0, 0, width, height);
        }
        if (pose) drawBrush(ctx, pose, unit, colors);
      };

      if (prefersReducedMotion) {
        draw(1, null);
        written.current?.();
        return;
      }

      const enter = 320;
      const write = Math.min(1900, 420 + text.length * 42);
      const leave = 420;
      const first = path.points[0];
      const last = path.points[path.points.length - 1];
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = now - t0;
        let q = 0;
        let pose: Pose | null = null;
        if (t < enter) {
          const e = ease(t / enter);
          pose = {
            tip: { x: lerp(width * 0.95, first.x, e), y: lerp(-size, first.y, e) },
            angle: HOLD - 0.3 * (1 - e),
            pressure: 0,
            bend: 0,
          };
        } else if (t < enter + write) {
          q = (t - enter) / write;
          const { point, index } = tipAt(path, q);
          const prev = path.points[Math.max(0, index - 1)];
          const next = path.points[Math.min(path.points.length - 1, index + 2)];
          const vx = next.x - prev.x;
          const vy = next.y - prev.y;
          const speed = Math.hypot(vx, vy) || 1;
          pose = {
            tip: point,
            angle: HOLD + 0.07 * (vy / speed) - 0.04 * (vx / speed),
            pressure: point.ink ? 0.55 + 0.45 * Math.max(0, vy / speed) : 0,
            bend: point.ink ? -unit * 0.16 * (vx / speed) : 0,
          };
        } else if (t < enter + write + leave) {
          q = 1;
          const e = ease((t - enter - write) / leave);
          pose = {
            tip: { x: lerp(last.x, width + size * 4, e * e), y: lerp(last.y, -size * 3, e) },
            angle: HOLD + 0.5 * e,
            pressure: 0,
            bend: 0,
          };
        } else {
          draw(1, null);
          written.current?.();
          return;
        }
        draw(q, pose);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [text, tone, prefersReducedMotion]);

  return <canvas ref={ref} aria-hidden="true" className={`palette-vars pointer-events-none relative block h-24 w-full ${className ?? ""}`} />;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Move a whole layout by (dx, dy). */
function shift(layout: Layout, dx: number, dy: number): Layout {
  return {
    ...layout,
    left: layout.left + dx,
    right: layout.right + dx,
    top: layout.top + dy,
    bottom: layout.bottom + dy,
    lines: layout.lines.map((line) => ({
      ...line,
      x: line.x + dx,
      baseline: line.baseline + dy,
      glyphs: line.glyphs.map((g) => ({ ...g, x0: g.x0 + dx, x1: g.x1 + dx })),
    })),
  };
}

/** The name in ink, textured once: a bleed into the fibres, a loaded stroke, a faint mottling. */
function inkText(layout: Layout, font: string, width: number, height: number, dpr: number, colors: Colors) {
  const c = document.createElement("canvas");
  c.width = Math.round(width * dpr);
  c.height = Math.round(height * dpr);
  const t = c.getContext("2d")!;
  t.scale(dpr, dpr);
  t.font = font;
  t.fillStyle = colors.stroke;
  t.strokeStyle = colors.stroke;
  t.lineJoin = "round";
  t.shadowColor = withAlpha(colors.stroke, 0.28);
  t.shadowBlur = layout.size * 0.09;
  for (const line of layout.lines) t.fillText(line.text, line.x, line.baseline);
  t.shadowBlur = 0;
  t.shadowColor = "transparent";
  t.lineWidth = layout.size * 0.022;
  for (const line of layout.lines) {
    t.fillText(line.text, line.x, line.baseline);
    t.strokeText(line.text, line.x, line.baseline);
  }
  t.globalCompositeOperation = "destination-out";
  const blotch = t.createPattern(noiseTile(colors.stroke, 0.07, 0.05, 5), "repeat");
  if (blotch) {
    t.fillStyle = blotch;
    t.fillRect(0, 0, width, height);
  }
  return c;
}

function noiseTile(color: string, alpha: number, threshold: number, scale: number): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  const n = 64;
  tile.width = n * scale;
  tile.height = n * scale;
  const t = tile.getContext("2d")!;
  const rand = seeded(17);
  t.fillStyle = color;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = rand();
      if (v < threshold) continue;
      t.globalAlpha = (alpha * (v - threshold)) / (1 - threshold);
      t.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return tile;
}

/** `color` (hex) at an alpha. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((ch) => ch + ch).join("") : hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type Pose = { tip: { x: number; y: number }; angle: number; pressure: number; bend: number };

/**
 * A calligraphy brush, drawn along its own axis from the tip: an ink-soaked
 * tuft that bends against the stroke and spreads under pressure, a dark
 * ferrule, a bamboo handle with two nodes, and a cinnabar cord at the end.
 */
function drawBrush(ctx: CanvasRenderingContext2D, pose: Pose, L: number, colors: Colors) {
  ctx.save();
  ctx.translate(pose.tip.x, pose.tip.y);
  ctx.rotate(pose.angle);

  const tuft = 1.25 * L;
  const half = (s: number) => {
    const belly = s < 0.62 ? 0.19 * Math.pow(Math.sin((Math.PI / 2) * (s / 0.62)), 1.1) : lerp(0.19, 0.155, (s - 0.62) / 0.38);
    return belly * L * (1 + pose.pressure * 0.22 * (1 - s));
  };
  const centre = (s: number) => pose.bend * (1 - s) * (1 - s);
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) ctx.lineTo((i / 20) * tuft, centre(i / 20) - half(i / 20));
  for (let i = 20; i >= 0; i--) ctx.lineTo((i / 20) * tuft, centre(i / 20) + half(i / 20));
  ctx.closePath();
  const sheen = ctx.createLinearGradient(0, -0.2 * L, 0, 0.2 * L);
  sheen.addColorStop(0, colors.ink);
  sheen.addColorStop(0.32, colors.inkRaised);
  sheen.addColorStop(0.5, colors.ink);
  sheen.addColorStop(1, colors.ink);
  ctx.fillStyle = sheen;
  ctx.fill();

  const f0 = tuft - 0.05 * L;
  const f1 = f0 + 0.38 * L;
  ctx.fillStyle = colors.inkRaised;
  ctx.beginPath();
  ctx.moveTo(f0, -0.165 * L);
  ctx.lineTo(f1, -0.14 * L);
  ctx.lineTo(f1, 0.14 * L);
  ctx.lineTo(f0, 0.165 * L);
  ctx.closePath();
  ctx.fill();

  const h1 = (LENGTH - 0.25) * L;
  const r = 0.115 * L;
  const bamboo = ctx.createLinearGradient(0, -r, 0, r);
  bamboo.addColorStop(0, colors.bambooDeep);
  bamboo.addColorStop(0.3, colors.bamboo);
  bamboo.addColorStop(0.45, withAlpha(colors.paper, 0.9));
  bamboo.addColorStop(0.6, colors.bamboo);
  bamboo.addColorStop(1, colors.bambooDeep);
  ctx.fillStyle = bamboo;
  ctx.fillRect(f1, -r, h1 - f1, r * 2);
  for (const at of [0.42, 0.74]) {
    ctx.fillStyle = colors.bambooDeep;
    ctx.fillRect(lerp(f1, h1, at) - 0.03 * L, -r * 1.08, 0.06 * L, r * 2.16);
  }
  ctx.fillStyle = colors.inkRaised;
  ctx.fillRect(h1, -r * 1.05, 0.25 * L, r * 2.1);
  ctx.strokeStyle = colors.cord;
  ctx.lineWidth = Math.max(1, 0.035 * L);
  ctx.beginPath();
  ctx.ellipse(h1 + 0.57 * L, 0, 0.34 * L, 0.16 * L, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
