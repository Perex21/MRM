"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { depthSpring } from "@/lib/motion";

/** Where the path leaves the straight road, in the path layer's 500×1000 viewBox. */
const DIVERGE = { x: 40, y: 760 };

/**
 * Hero landscape: receding ridgelines, plus the Divergence drawn at landscape
 * scale — a dashed straight road and a path that walks it, marks the point
 * where it diverges with a cinnabar node and one spreading ring, then leaves
 * toward the seal. The nearest ridge is parchment, so the paper of the next
 * section rises into the hero.
 *
 * The road and path live in their own layer, anchored in the band between the
 * text column and the right edge (from `lg`), so they never cross the copy
 * whatever the crop of the ridges. Below `lg` there is no room beside the
 * text, so the landscape is shown without them.
 *
 * Depth, two inputs, both small:
 * - scroll: far and middle layers lag the paper ridge, so the paper rises over them;
 * - pointer (mouse only): layers drift sideways by distance, far least.
 * Under reduced motion, or without JavaScript, every layer stays where it is drawn.
 *
 * Decorative. Ridges overhang the viewBox sides so sideways drift never shows an edge.
 */
export function HeroLandscape({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const still = Boolean(prefersReducedMotion);

  const { scrollY } = useScroll();
  const farScroll = useTransform(scrollY, [0, 900], [0, still ? 0 : 64]);
  const midScroll = useTransform(scrollY, [0, 900], [0, still ? 0 : 30]);

  // Pointer position across the viewport, -1 (left) to 1 (right), smoothed.
  const pointer = useSpring(useMotionValue(0), depthSpring);
  const farDrift = useTransform(pointer, (p) => p * -10);
  const midDrift = useTransform(pointer, (p) => p * -22);

  useEffect(() => {
    if (still || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.set((event.clientX / window.innerWidth) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still, pointer]);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none", className)}>
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMaxYMax slice"
        focusable="false"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id="hero-ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-ink-mist)" />
            <stop offset="0.6" stopColor="var(--color-ink)" />
          </linearGradient>
          <linearGradient id="hero-ridge-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-ink-raised)" />
            <stop offset="0.7" stopColor="var(--color-ink)" />
          </linearGradient>
        </defs>
        <motion.path
          style={{ x: farDrift, y: farScroll }}
          fill="url(#hero-ridge-far)"
          d="M-40 900V600h40c120-40 200-10 300-60s180-70 260-20 140 80 240 40 160-120 260-60 180 100 260 60 80-20 120 0h40v340z"
        />
        <motion.path
          style={{ x: midDrift, y: midScroll }}
          fill="url(#hero-ridge-mid)"
          d="M-40 900V700h40c100-20 180-60 260-40s160 80 260 40 160-90 260-50 160 90 260 50 180-80 260-40 100 40 140 20h40v220z"
        />
      </svg>

      <motion.div className="absolute inset-y-0 right-0 hidden w-[34%] lg:block" style={{ x: midDrift, y: midScroll }}>
        {/*
          Uniform scaling (slice, not stretch) keeps the stroke and the round node true.
          The viewBox is sized near 1:1 with the layer, and the drawn path does not use
          non-scaling-stroke: Chrome applies pathLength-normalised dashes in screen space
          for non-scaling strokes, which breaks the draw-on once the scale moves from 1.
        */}
        <svg
          viewBox="0 0 500 1000"
          preserveAspectRatio="xMinYMax slice"
          focusable="false"
          className="absolute inset-0 size-full"
        >
          {/* The orthodox road: straight, dashed, uninterrupted. */}
          <path
            d={`M${DIVERGE.x} 1000V0`}
            fill="none"
            stroke="var(--color-silver-dim)"
            strokeWidth="1"
            strokeDasharray="2 10"
            vectorEffect="non-scaling-stroke"
          />
          {/* The path: walks the road, then leaves it for the seal. */}
          <path
            d={`M${DIVERGE.x} 1000V${DIVERGE.y}C${DIVERGE.x} 700 70 672 112 650S206 612 240 540 270 440 280 400`}
            pathLength={1}
            fill="none"
            stroke="var(--color-parchment)"
            strokeOpacity="0.75"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="anim-draw"
            style={{ "--delay": "700ms" } as React.CSSProperties}
          />
          {/* The point of divergence, marked as the drawing passes it. */}
          <circle
            cx={DIVERGE.x}
            cy={DIVERGE.y}
            r="11"
            fill="none"
            stroke="var(--color-cinnabar-bright)"
            strokeWidth="1"
            className="anim-ripple"
            style={{ "--delay": "1800ms" } as React.CSSProperties}
          />
          <circle
            cx={DIVERGE.x}
            cy={DIVERGE.y}
            r="5"
            fill="var(--color-cinnabar-bright)"
            className="anim-pop"
            style={{ "--delay": "1750ms" } as React.CSSProperties}
          />
        </svg>
      </motion.div>

      {/* The paper ridge sits in front of everything, fixed: the seam into the archive. */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMaxYMax slice"
        focusable="false"
        className="absolute inset-0 size-full"
      >
        <path fill="var(--color-parchment)" d="M0 901V800c160-30 300 30 460 0s300-60 460-20 280 60 520-10v131z" />
      </svg>
    </div>
  );
}
