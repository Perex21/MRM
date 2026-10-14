"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

type ArtFieldProps = {
  children: ReactNode;
  /** Ancestor whose pointer movement drives the field, so the whole row responds. */
  zone: string;
};

/**
 * Publishes the pointer's position over the row as `--px` and `--py`
 * (-1…1 from the artwork's centre) for the illustration's own CSS to use.
 * Each composition reads them differently — the phishing scope tracks the
 * pointer, the GST audit line follows it down the ledgers, the ECHOSS echo
 * drifts against the globe — instead of one shared tilt.
 *
 * Mouse only; touch, coarse pointers and reduced motion leave the artwork at
 * rest. Decorative: nothing is revealed by it.
 */
export function ArtField({ children, zone }: ArtFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const target = element.closest<HTMLElement>(zone) ?? element;
    let frame = 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      frame = 0;
      element.style.setProperty("--px", px.toFixed(3));
      element.style.setProperty("--py", py.toFixed(3));
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      px = 0;
      py = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerleave", onLeave);
    };
  }, [zone, prefersReducedMotion]);

  return <div ref={ref}>{children}</div>;
}
