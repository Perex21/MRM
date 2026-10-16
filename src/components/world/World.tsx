"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef } from "react";
import { interpolate, ridgePath } from "@/lib/landscape";
import { GUST } from "@/lib/motion";
import { Drift } from "./Drift";

/*
 * The world behind the home page: one continuous landscape that the visitor
 * travels through while scrolling. It is fixed to the viewport and shows
 * through every ink scene; paper scenes cover it like a scroll painting
 * unrolled in front of the view, and when the ink returns the landscape has
 * moved on.
 *
 * Scenes, in page order (see content/sections.ts):
 *   Arrival      (covered by the landing shader, Atmosphere)
 *   The Archive  (paper)
 *   The Path     mist parts, the land opens, the path winds further
 *   Disciplines  mist gathers again among higher ranges
 *   The Record   (paper)
 *   Destination  mist settles, the ranges rise, the sun stands on the horizon
 *                where the path ends
 *
 * Travel: the three ranges slide sideways at different rates across the
 * whole page (far least), and rise or sink per scene. Values are keyed to the
 * scroll position of each scene's top, measured from the live layout.
 *
 * Reduced motion: the landscape is drawn once, at the Arrival, and stays.
 * Without JavaScript: the same static Arrival composition.
 */

const W = 4320;
const H = 900;

// Broad sharp peaks carry each range; softer waves shape shoulders; a faint
// short wave keeps the edge from looking machined.
const far = ridgePath(W, H, 580, [
  { amp: 170, len: 1180, phase: 0.3, sharp: true },
  { amp: 46, len: 430, phase: 1.1 },
  { amp: 4, len: 110, phase: 2 },
]);
const mid = ridgePath(W, H, 690, [
  { amp: 120, len: 860, phase: 1.7, sharp: true },
  { amp: 30, len: 330, phase: 0.4 },
  { amp: 3, len: 90, phase: 1 },
]);
const near = ridgePath(W, H, 800, [
  { amp: 90, len: 1400, phase: 2.6, sharp: true },
  { amp: 26, len: 520, phase: 0.9 },
  { amp: 3, len: 80, phase: 0.3 },
]);

/** Section ids whose tops mark scene changes, in page order. */
const SCENES = ["work", "approach", "capabilities", "profile", "contact"] as const;

// One value per stop: [arrival, archive, path, disciplines, record, destination, end].
const FRAMES = {
  farY: [0, 20, 40, 70, 80, 20, 10],
  midY: [0, 40, 80, 130, 140, 50, 30],
  nearY: [0, 70, 140, 220, 230, 100, 70],
  mist: [1, 0.7, 0.45, 0.85, 0.6, 0.3, 0.3],
  /** How far the two mist banks part, in vw. */
  part: [0, 11, 22, 6, 12, 26, 26],
  sunY: [42, 42, 42, 28, 18, 0, 0],
  sun: [0, 0, 0, 0.25, 0.55, 1, 1],
  draw: [0.34, 0.42, 0.5, 0.72, 0.84, 1, 1],
  path: [0.85, 0.4, 0.4, 0.45, 0.4, 0.85, 0.85],
} as const;

type Frame = keyof typeof FRAMES;

export function World() {
  const prefersReducedMotion = useReducedMotion();
  const still = Boolean(prefersReducedMotion);
  const { scrollYProgress } = useScroll();

  // Scroll progress at the top of each scene, re-measured whenever the page reflows.
  // Held in a motion value, so transforms read the latest layout without re-rendering.
  const stops = useMotionValue<number[]>([0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]);
  useEffect(() => {
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const tops = SCENES.map((id) => {
        const el = document.getElementById(id);
        return el ? Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5) / max)) : 0;
      });
      stops.set([0, ...tops, 1].map((v, i, all) => Math.max(v, i > 0 ? all[i - 1] : 0)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [stops]);

  const frame = (key: Frame) => (p: number) => (still ? FRAMES[key][0] : interpolate(p, stops.get(), FRAMES[key]));

  const farY = useTransform(scrollYProgress, frame("farY"));
  const midY = useTransform(scrollYProgress, frame("midY"));
  const nearY = useTransform(scrollYProgress, frame("nearY"));
  const mist = useTransform(scrollYProgress, frame("mist"));
  const part = useTransform(scrollYProgress, frame("part"));
  const sunY = useTransform(scrollYProgress, (p) => `${frame("sunY")(p)}vh`);
  const sun = useTransform(scrollYProgress, frame("sun"));
  const draw = useTransform(scrollYProgress, (p) => 1 - frame("draw")(p));
  const pathOpacity = useTransform(scrollYProgress, frame("path"));

  // Sideways travel across the whole page, far ranges slowest.
  const farX = useTransform(scrollYProgress, (p) => `${still ? 0 : p * -14}%`);
  const midX = useTransform(scrollYProgress, (p) => `${still ? 0 : p * -30}%`);
  const nearX = useTransform(scrollYProgress, (p) => `${still ? 0 : p * -48}%`);

  // The opening gust shoves the mist banks hard downwind as its front passes; they drift partway back.
  const gust = useMotionValue(0);
  useEffect(() => {
    if (still) return;
    const elapsed = performance.now() - GUST.start;
    if (elapsed > GUST.duration) return;
    const controls = animate(gust, [0, 0, 18, 6], {
      duration: GUST.duration / 1000,
      times: [0, 0.2, 0.5, 1],
      ease: [0.33, 0, 0.2, 1],
      delay: Math.max(0, -elapsed) / 1000,
    });
    if (elapsed > 0) controls.time = elapsed / 1000;
    return () => controls.stop();
  }, [still, gust]);

  const leftMist = useTransform([part, gust], ([p, g]: number[]) => `${g - p}vw`);
  const rightMist = useTransform([part, gust], ([p, g]: number[]) => `${g * 1.4 + p}vw`);

  // Keep the CSS draw-on of the Arrival and the scroll-driven extension from fighting:
  // once the visitor scrolls, the path is controlled by scroll alone.
  const pathRef = useRef<SVGPathElement>(null);
  useMotionValueEvent(scrollYProgress, "change", () => pathRef.current?.classList.remove("anim-draw-to"));

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Low light along the horizon. */}
      <div className="absolute inset-x-0 top-[30%] h-[45%] bg-[radial-gradient(ellipse_70%_60%_at_68%_70%,var(--color-ink-mist),transparent)] opacity-70" />

      {/* The sun of the Destination, behind the far range. Shares the path layer's coordinates. */}
      <motion.svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMaxYMax slice"
        className="absolute inset-0 size-full"
        style={{ y: sunY, opacity: sun }}
      >
        <circle cx="1130" cy="470" r="86" fill="var(--color-cinnabar)" />
      </motion.svg>

      <Range d={far} x={farX} y={farY} tone="far" />
      <Mist x={leftMist} opacity={mist} className="top-[52%] -left-[25vw]" />
      <Range d={mid} x={midX} y={midY} tone="mid" />
      <Mist x={rightMist} opacity={mist} className="top-[66%] -right-[35vw]" />
      <Range d={near} x={nearX} y={nearY} tone="near" />

      {/* The path: walks the road, diverges, and winds into the mountains as the visitor travels. */}
      <motion.svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMaxYMax slice"
        className="absolute inset-0 hidden size-full lg:block"
        style={{ opacity: pathOpacity }}
      >
        <path d="M1010 900V560" fill="none" stroke="var(--color-silver-dim)" strokeDasharray="2 10" />
        <motion.path
          ref={pathRef}
          d="M1010 900V780C1010 742 968 730 940 708S912 664 966 646 1078 622 1052 592 986 560 1040 540 1150 520 1130 470"
          pathLength={1}
          fill="none"
          stroke="var(--color-parchment)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="1"
          className="anim-draw-to"
          style={{ strokeDashoffset: draw, "--delay": "700ms", "--draw-to": FRAMES.draw[0] } as never}
        />
        <circle cx="1010" cy="780" r="10" fill="none" stroke="var(--color-cinnabar-bright)" className="anim-ripple" style={{ "--delay": "1300ms" } as React.CSSProperties} />
        <circle cx="1010" cy="780" r="4.5" fill="var(--color-cinnabar-bright)" className="anim-pop" style={{ "--delay": "1250ms" } as React.CSSProperties} />
      </motion.svg>

      {!still && <Drift />}
    </div>
  );
}

// Ink-wash tones: each range is lightest at its ridge and dissolves into the dark
// at its foot, so the layers read as distance and mist rather than flat cut-outs.
const tones = {
  far: ["var(--color-ink-mist)", 0.95, 0.55],
  mid: ["var(--color-ink-raised)", 1, 0.75],
  near: ["var(--color-ink-deep)", 1, 1],
} as const;

type RangeProps = { d: string; x: MotionValue<string>; y: MotionValue<number>; tone: keyof typeof tones };

/** One mountain range, three viewports wide (or wider on tall screens, to keep its proportions). */
function Range({ d, x, y, tone }: RangeProps) {
  const [color, top, foot] = tones[tone];
  const id = `world-${tone}`;
  return (
    <motion.div className="absolute bottom-0 left-0 h-full w-[max(300vw,480svh)] will-change-transform" style={{ x, y }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor={color} stopOpacity={top} />
            <stop offset="1" stopColor="var(--color-ink)" stopOpacity={foot} />
          </linearGradient>
        </defs>
        <path d={d} fill={`url(#${id})`} />
      </svg>
    </motion.div>
  );
}

type MistProps = { x: MotionValue<string>; opacity: MotionValue<number>; className: string };

/** A bank of mist: a broad, soft band of parchment at very low strength. */
function Mist({ x, opacity, className }: MistProps) {
  return (
    <motion.div
      className={`absolute h-[30vh] w-[150vw] will-change-transform bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,color-mix(in_srgb,var(--color-parchment)_9%,transparent),transparent)] ${className}`}
      style={{ x, opacity }}
    />
  );
}
