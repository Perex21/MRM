"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { depthSpring, duration, ease } from "@/lib/motion";

// Geometry in a 200×200 box. The straight path is a chord at x=78; the
// diverging stroke leaves it at (78,150) and meets the rim at (173.1,31.8).
const BRANCH = "M78 150C78 100 112 62 173.1 31.8";
const SHARD = `${BRANCH}A100 100 0 0 0 78 2.45Z`;
const CHORD = "M78 2.45V197.55";

/**
 * The signature interaction: the hero's cinnabar disc as a seal carved with
 * the Divergence. Pressing it breaks the seal — the shard between the straight
 * path and the diverging stroke lifts away — and pressing again restores it.
 *
 * It server-renders as the intact disc, so the hero is complete before any
 * script runs. On mouse devices the disc leans slightly toward the pointer.
 * Under reduced motion the lean is off and the break is an instant change.
 */
export function Seal({ className }: { className?: string }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const maskId = useId();
  const prefersReducedMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), depthSpring);
  const rotateY = useSpring(useMotionValue(0), depthSpring);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      // Lean falls off with distance: full effect within ~3 disc widths.
      const reach = rect.width * 3;
      const x = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / reach));
      const y = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / reach));
      rotateY.set(x * 10);
      rotateX.set(-y * 10);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [prefersReducedMotion, rotateX, rotateY]);

  const transition = prefersReducedMotion ? { duration: 0 } : { duration: duration.reveal, ease: ease.settle };

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-pressed={broken}
      aria-label="Break the seal"
      title={broken ? "Restore the seal" : "Break the seal"}
      onClick={() => setBroken((value) => !value)}
      className={cn("block cursor-pointer rounded-full", className)}
      style={{ rotateX, rotateY, transformPerspective: 700 }}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false" className="block size-full overflow-visible">
        <defs>
          <mask id={maskId}>
            <circle cx="100" cy="100" r="100" fill="#fff" />
            <path d={SHARD} fill="#000" />
          </mask>
        </defs>

        <circle cx="100" cy="100" r="100" fill="var(--color-cinnabar)" mask={`url(#${maskId})`} />
        <motion.path
          d={SHARD}
          fill="var(--color-cinnabar)"
          initial={false}
          animate={broken ? { x: 9, y: -10, rotate: 5 } : { x: 0, y: 0, rotate: 0 }}
          transition={transition}
          style={{ transformOrigin: "78px 150px", transformBox: "view-box" }}
        />
        <g fill="none" stroke="var(--color-cinnabar-deep)" strokeWidth="1.25" strokeLinecap="round">
          <path d={CHORD} />
          <motion.path d={BRANCH} initial={false} animate={{ opacity: broken ? 0 : 1 }} transition={transition} />
        </g>
      </svg>
    </motion.button>
  );
}
