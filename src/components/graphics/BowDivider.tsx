"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * Section hand-off from paper (above) into ink (this section): the paper
 * bows down into the ink like a page bending, deepening as the seam rises
 * through the viewport. A dashed line follows the curve just beneath it and
 * travels along it as the reader scrolls — the road, bent.
 *
 * Renders at full depth without JavaScript. Under reduced motion it stays at
 * full depth and the line stays still. Decorative.
 */
export function BowDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 25%"] });
  const depth = useTransform(scrollYProgress, [0, 1], [prefersReducedMotion ? 1 : 0.3, 1]);
  const travel = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -180]);

  return (
    <div ref={ref} aria-hidden="true" className="relative -mt-px h-[clamp(4rem,10vw,9rem)]">
      <motion.svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        style={{ scaleY: depth, originY: 0 }}
      >
        <path d="M0 0H1440V1Q720 160 0 1Z" fill="var(--color-parchment)" />
        <motion.path
          d="M0 14Q720 174 1440 14"
          fill="none"
          stroke="var(--color-cinnabar-bright)"
          strokeOpacity="0.7"
          strokeWidth="1"
          strokeDasharray="2 10"
          vectorEffect="non-scaling-stroke"
          style={{ strokeDashoffset: travel }}
        />
      </motion.svg>
    </div>
  );
}
