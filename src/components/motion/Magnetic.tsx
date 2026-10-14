"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { magnetSpring } from "@/lib/motion";

type MagneticProps = {
  children: ReactNode;
  /** Largest offset in pixels. */
  strength?: number;
  className?: string;
};

/**
 * A small magnetic pull toward the pointer while it is over the element or
 * just around it, settling back on a spring when it leaves. Mouse only:
 * touch, pen, coarse pointers and reduced motion get a static control.
 * The hit area never moves, so clicks always land where the pointer is.
 */
export function Magnetic({ children, strength = 8, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const x = useSpring(useMotionValue(0), magnetSpring);
  const y = useSpring(useMotionValue(0), magnetSpring);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      // Field reaches a little beyond the element's own box.
      const reachX = rect.width / 2 + 32;
      const reachY = rect.height / 2 + 32;
      if (Math.abs(dx) > reachX || Math.abs(dy) > reachY) {
        x.set(0);
        y.set(0);
        return;
      }
      x.set((dx / reachX) * strength);
      y.set((dy / reachY) * strength);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [prefersReducedMotion, strength, x, y]);

  return (
    <span ref={ref} className={className ?? "inline-block"}>
      <motion.span className="inline-block" style={{ x, y }}>
        {children}
      </motion.span>
    </span>
  );
}
