"use client";

import { useEffect, useRef } from "react";
import { GUST } from "@/lib/motion";

type Mote = { x: number; y: number; depth: number; phase: number };

/**
 * Fine motes hanging in the air of the world layer.
 *
 * They move only when something moves them: first the tail of the opening
 * gust, which carries them downwind and dies away, then the visitor's own
 * travel — scrolling stirs them, faster and nearer motes more. When both are
 * still, the loop stops and the last frame stays on the canvas. No idle loop.
 *
 * Rendered only when motion is allowed (see World).
 */
export function Drift() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = width < 768 ? 16 : 34;
    const motes: Mote[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: height * (0.25 + Math.random() * 0.75),
      depth: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    }));

    // Wind left over from the gust, in px/s; decays to nothing.
    let gustWind = performance.now() < GUST.start + GUST.duration + 400 ? 700 : 0;
    let scrollVelocity = 0;
    let lastScroll = window.scrollY;
    let last = performance.now();
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        const alpha = 0.08 + m.depth * 0.17;
        const streak = Math.min(16, Math.abs(gustWind * m.depth) * 0.025 + Math.abs(scrollVelocity * m.depth) * 0.015);
        if (streak < 1.5) {
          // At rest a mote is a speck, not a dash.
          ctx.fillStyle = `rgba(232, 224, 208, ${alpha})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 0.5 + m.depth * 0.7, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.strokeStyle = `rgba(232, 224, 208, ${alpha})`;
        ctx.lineWidth = 0.6 + m.depth;
        ctx.beginPath();
        ctx.moveTo(m.x - streak, m.y + (scrollVelocity > 0 ? streak * 0.3 : -streak * 0.3));
        ctx.lineTo(m.x + 0.01, m.y);
        ctx.stroke();
      }
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      gustWind *= Math.pow(0.18, dt); // loses ~80% per second
      scrollVelocity *= Math.pow(0.04, dt); // settles quickly once scrolling stops

      for (const m of motes) {
        m.x += (gustWind + Math.abs(scrollVelocity) * 0.12) * m.depth * dt;
        m.y -= scrollVelocity * 0.35 * m.depth * dt;
        m.y += Math.sin(now / 900 + m.phase) * 4 * dt * (gustWind > 20 ? 1 : 0);
        if (m.x > width + 20) m.x = -20;
        if (m.y < -20) m.y = height + 20;
        if (m.y > height + 20) m.y = -20;
      }
      draw();

      if (gustWind > 2 || Math.abs(scrollVelocity) > 4) {
        frame = requestAnimationFrame(step);
      } else {
        frame = 0;
      }
    };

    const wake = () => {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };

    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const dt = Math.max(16, now - last) / 1000;
      scrollVelocity = Math.max(-3000, Math.min(3000, (y - lastScroll) / dt));
      lastScroll = y;
      wake();
    };
    const onResize = () => {
      resize();
      draw();
    };

    draw();
    if (gustWind > 0) wake();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 size-full" />;
}
