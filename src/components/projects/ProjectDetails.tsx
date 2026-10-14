"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { duration, ease } from "@/lib/motion";

type ProjectDetailsProps = {
  title: string;
  /** The opened plate, rendered on the server. */
  children: ReactNode;
};

/**
 * "How it works" disclosure under an archive row. Opening it unrolls an ink
 * plate with the project's real processing flow — the step from discovering a
 * project to reading its technical detail — without leaving the page.
 *
 * A real button (keyboard, touch, screen reader), not a hover state. The plate
 * opens with a clip from the top; under reduced motion it simply appears.
 */
export function ProjectDetails({ title, children }: ProjectDetailsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="group label inline-flex min-h-12 items-center gap-3 text-fg-muted transition-colors duration-(--duration-hover) hover:text-accent"
      >
        <span
          aria-hidden="true"
          className="relative inline-block size-3 transition-transform duration-300 ease-entrance motion-safe:group-aria-expanded:rotate-45"
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
        </span>
        {open ? "Close the flow" : "How it works"}
        <span className="sr-only">: {title}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-label={`How ${title} works`}
            initial={prefersReducedMotion ? false : { height: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ height: "auto", clipPath: "inset(0% 0% 0% 0%)" }}
            exit={prefersReducedMotion ? undefined : { height: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: duration.headline, ease: ease.settle }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
