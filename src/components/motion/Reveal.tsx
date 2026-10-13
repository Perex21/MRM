"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { reveal } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds to wait after entering the viewport. */
  delay?: number;
};

type Phase = "static" | "hidden" | "shown";

/**
 * Fade and upward-settle on scroll.
 *
 * Content is server-rendered visible and stays visible if JavaScript never
 * runs. Only elements found below the viewport after hydration are hidden,
 * then revealed as they scroll in. Skipped entirely under reduced motion.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("static");

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase((current) => (current === "hidden" ? "shown" : current));
          observer.disconnect();
        } else if (entry.boundingClientRect.top > 0) {
          setPhase("hidden");
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const hidden = phase === "hidden" && !prefersReducedMotion;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={hidden ? reveal.hidden : reveal.shown}
      transition={phase === "shown" ? { ...reveal.transition, delay } : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}
