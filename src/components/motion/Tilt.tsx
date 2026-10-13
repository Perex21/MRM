"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { depthSpring } from "@/lib/motion";

type TiltProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  max?: number;
  /**
   * CSS selector for an ancestor whose pointer movement drives the tilt.
   * Lets a whole row respond even when a link overlay covers the artwork.
   */
  zone?: string;
};

/**
 * Pointer-driven depth for artwork: a small tilt toward the cursor.
 * Mouse only — touch and pen input, coarse pointers and reduced motion leave
 * the content flat. Purely decorative; nothing is revealed by it.
 */
export function Tilt({ children, className, max = 5, zone }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), depthSpring);
  const rotateY = useSpring(useMotionValue(0), depthSpring);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const target = (zone && element.closest<HTMLElement>(zone)) || element;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      // Pointer offset from the artwork's centre, clamped to -1…1 on each axis.
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      rotateY.set(x * max);
      rotateX.set(-y * max);
    };
    const onLeave = () => {
      rotateX.set(0);
      rotateY.set(0);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerleave", onLeave);
    return () => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
    };
  }, [max, zone, prefersReducedMotion, rotateX, rotateY]);

  return (
    <motion.div ref={ref} className={className} style={{ rotateX, rotateY, transformPerspective: 900 }}>
      {children}
    </motion.div>
  );
}
