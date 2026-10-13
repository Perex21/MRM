"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { reveal, type RevealVariant } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** `rise` for text blocks, `unveil` (clip from the top) for artwork. */
  variant?: RevealVariant;
  /** Seconds to wait after entering the viewport. */
  delay?: number;
};

type Phase = "static" | "hidden" | "shown";

/**
 * Reveals content once as it scrolls into view.
 *
 * Content is server-rendered visible and stays visible if JavaScript never
 * runs. Only elements found below the viewport after hydration are hidden,
 * then revealed on intersect. Skipped entirely under reduced motion.
 */
export function Reveal({ children, className, variant = "rise", delay = 0 }: RevealProps) {
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

  const { hidden, shown, transition } = reveal[variant];
  const isHidden = phase === "hidden" && !prefersReducedMotion;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={isHidden ? hidden : shown}
      transition={phase === "shown" ? { ...transition, delay } : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}
