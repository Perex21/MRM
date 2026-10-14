"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

// Back to front. Each later ridge is lower and more opaque, like mist thinning.
const layers = [
  { d: "M0 120V58c160-26 300 14 480-8s320-50 520-16 300 38 440 10v76z", opacity: 0.3, spread: -36 },
  { d: "M0 120V74c200-30 340 18 520-4s300-36 480-8 280 30 440 4v54z", opacity: 0.6, spread: -18 },
  { d: "M0 121V92c180-20 320 16 500 0s320-28 500-6 300 24 440 2v33z", opacity: 1, spread: 0 },
] as const;

/**
 * Section hand-off from paper (this section) into ink (the next): three ink
 * ridges rise like layers of distant range. While the seam is low in the
 * viewport the layers stand apart; as it scrolls up they close into one
 * ridgeline. Place as the last child of the paper section.
 *
 * Renders closed without JavaScript; stays closed under reduced motion.
 */
export function RippleDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end 55%"] });
  const open = useTransform(scrollYProgress, [0, 1], [prefersReducedMotion ? 0 : 1, 0]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative -mb-px h-[clamp(4rem,9vw,8rem)]"
      // Solid strip at the foot, so rounding can never show a paper hairline at the seam.
      style={{ backgroundImage: "linear-gradient(to top, var(--color-ink) 2px, transparent 2px)" }}
    >
      {layers.map((layer) => (
        <Layer key={layer.d} {...layer} open={open} />
      ))}
    </div>
  );
}

type LayerProps = (typeof layers)[number] & { open: MotionValue<number> };

function Layer({ d, opacity, spread, open }: LayerProps) {
  const y = useTransform(open, (o) => o * spread);
  return (
    <motion.svg
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      style={{ y }}
    >
      <path d={d} fill="var(--color-ink)" fillOpacity={opacity} />
    </motion.svg>
  );
}
