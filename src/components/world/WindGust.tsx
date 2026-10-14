"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { GUST } from "@/lib/motion";

type Ribbon = {
  y: number;
  amp: number;
  wave: number;
  phase: number;
  /** Relative speed: faster ribbons lead the gust front. */
  speed: number;
  /** Head trails the front by this many px. */
  lag: number;
  length: number;
  width: number;
  color: string;
  alpha: number;
};

type Mote = { x: number; y: number; speed: number; phase: number; size: number };

const PARCHMENT = "232, 224, 208";
const SILVER = "169, 170, 163";
const CINNABAR = "207, 95, 92"; // cinnabar-bright

/** Strength of the gust over its life (ms since it began): build, peak, dissipate. */
function intensity(t: number) {
  const smooth = (x: number) => x * x * (3 - 2 * x);
  if (t <= 0) return 0;
  if (t < 450) return smooth(t / 450);
  if (t < 850) return 1;
  if (t < GUST.duration) return 1 - smooth((t - 850) / (GUST.duration - 850));
  return 0;
}

/** Where the leading edge of the gust is, as a fraction of the viewport width. */
function front(t: number) {
  const u = Math.min(1, Math.max(0, t / 1250));
  const eased = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  return -0.3 + eased * 1.75;
}

/**
 * The Arrival: one gust of wind crossing the viewport from the left, once,
 * as the page opens. Ink-like ribbons stream behind its leading edge and fine
 * motes are flung ahead of it; it accelerates, peaks as it passes the name,
 * and dissipates — then the canvas removes itself.
 *
 * Timed on the navigation clock (GUST), so it stays in step with the CSS name
 * reveal even if hydration is late, and skips itself if the moment has passed.
 * It never blocks input (pointer-events: none) and is absent under reduced motion.
 */
export function WindGust() {
  const ref = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || prefersReducedMotion) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";

    const small = width < 768;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    // Most of the wind passes through the band where the name sits.
    const bandY = () => (Math.random() < 0.6 ? rand(0.12, 0.5) : rand(0.5, 0.92)) * height;

    const ribbons: Ribbon[] = Array.from({ length: small ? 8 : 14 }, (_, i) => {
      const mist = i < 3; // broad, faint bands of moving mist
      return {
        y: bandY(),
        amp: rand(12, 48),
        wave: rand(420, 1000),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.8, 1.2),
        lag: width * rand(0, 0.4),
        length: width * rand(0.35, 0.7),
        width: mist ? rand(28, 64) : rand(0.8, 2.2),
        color: i === 3 ? CINNABAR : i % 3 === 0 ? SILVER : PARCHMENT,
        alpha: mist ? rand(0.05, 0.09) : i === 3 ? 0.6 : rand(0.2, 0.5),
      };
    });

    // Motes start upwind, off-screen, and arrive with the gust.
    const motes: Mote[] = Array.from({ length: small ? 40 : 85 }, () => ({
      x: width * rand(-0.9, -0.02),
      y: bandY(),
      speed: rand(0.7, 1.4),
      phase: rand(0, Math.PI * 2),
      size: rand(0.5, 1.6),
    }));

    /** Advance the motes by dt seconds at gust time t (ms). */
    const simulate = (t: number, dt: number) => {
      const wind = width * 1.9 * intensity(t);
      for (const m of motes) {
        m.x += wind * m.speed * dt;
        m.y += Math.sin(m.x / 120 + m.phase) * 30 * dt;
      }
    };

    /** Draw the gust as it stands at time t (ms). */
    const render = (t: number) => {
      const strength = intensity(t);
      const edge = front(t) * width;
      ctx.clearRect(0, 0, width, height);

      for (const r of ribbons) {
        const head = edge * r.speed - r.lag;
        const tail = head - r.length * (0.35 + 0.65 * strength);
        if (head < 0 || tail > width) continue;
        const gradient = ctx.createLinearGradient(tail, 0, head, 0);
        gradient.addColorStop(0, `rgba(${r.color}, 0)`);
        gradient.addColorStop(0.7, `rgba(${r.color}, ${r.alpha * strength})`);
        gradient.addColorStop(1, `rgba(${r.color}, 0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = r.width;
        ctx.beginPath();
        const start = Math.max(tail, -40);
        for (let x = start; x <= Math.min(head, width + 40); x += 14) {
          // Ribbons rise slightly toward their heads, like smoke caught by the wind.
          const lift = ((x - tail) / (head - tail || 1)) * -18 * strength;
          const y = r.y + r.amp * Math.sin((x / r.wave) * Math.PI * 2 + r.phase - t * 0.004 * r.speed) + lift;
          if (x === start) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Motes travel with the front; those it has left behind fade out.
      const wind = width * 1.9 * strength;
      for (const m of motes) {
        const behind = edge - m.x;
        if (m.x < -20 || behind > width * 0.55 || behind < -width * 0.15) continue;
        const fade = 1 - Math.max(0, behind) / (width * 0.55);
        const streak = Math.min(60, wind * m.speed * 0.024);
        const bend = Math.sin(m.x / 90 + m.phase) * streak * 0.18;
        ctx.strokeStyle = `rgba(${PARCHMENT}, ${0.6 * strength * fade * (0.5 + m.size / 3.2)})`;
        ctx.lineWidth = m.size;
        ctx.beginPath();
        ctx.moveTo(m.x - streak, m.y - bend);
        ctx.quadraticCurveTo(m.x - streak / 2, m.y + bend, m.x, m.y);
        ctx.stroke();
      }
    };

    // Development aid: `?gust=<ms>` holds the gust still at that moment for inspection.
    if (process.env.NODE_ENV !== "production") {
      const hold = Number(new URLSearchParams(window.location.search).get("gust"));
      if (Number.isFinite(hold) && hold > 0) {
        for (let t = 0; t < hold; t += 16) simulate(t, 0.016);
        render(hold);
        return;
      }
    }

    let last = performance.now();
    let frame = requestAnimationFrame(function begin(now) {
      // Too late to be the arrival: skip rather than play out of step.
      if (now - GUST.start > GUST.duration - 250) {
        document.documentElement.dataset.gust = "skipped";
        setDone(true);
        return;
      }
      document.documentElement.dataset.gust = "playing";
      last = now;
      frame = requestAnimationFrame(tick);
    });

    function tick(now: number) {
      const t = now - GUST.start;
      simulate(t, Math.min(0.05, (now - last) / 1000));
      last = now;
      render(t);
      if (t < GUST.duration) frame = requestAnimationFrame(tick);
      else {
        ctx!.clearRect(0, 0, width, height);
        document.documentElement.dataset.gust = "played";
        setDone(true);
      }
    }

    return () => cancelAnimationFrame(frame);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || done) return null;

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 size-full"
    />
  );
}
