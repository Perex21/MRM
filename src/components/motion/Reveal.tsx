"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { reveal, type RevealVariant } from "@/lib/motion";

export type RevealPhase = "static" | "hidden" | "shown";

/**
 * Shared reveal logic. Content starts `static` (visible, as server-rendered).
 * After hydration, an element found below the viewport becomes `hidden`, then
 * `shown` once it scrolls in — once only. Elements already on screen, and
 * every element under reduced motion, simply stay static.
 */
export function useRevealPhase<T extends Element>(): [RefObject<T | null>, RevealPhase] {
  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<RevealPhase>("static");

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

  return [ref, prefersReducedMotion ? "static" : phase];
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** `rise` for text blocks, `unveil` (clip from the top) for artwork. */
  variant?: RevealVariant;
  /** Seconds to wait after entering the viewport. */
  delay?: number;
};

/** Reveals content once as it scrolls into view. Visible without JavaScript. */
export function Reveal({ children, className, variant = "rise", delay = 0 }: RevealProps) {
  const [ref, phase] = useRevealPhase<HTMLDivElement>();
  const { hidden, shown, transition } = reveal[variant];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={phase === "hidden" ? hidden : shown}
      transition={phase === "shown" ? { ...transition, delay } : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}
