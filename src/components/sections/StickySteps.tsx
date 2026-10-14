"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { MaskedWords } from "@/components/motion/MaskedWords";
import { Reveal } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";

export type Step = {
  title: string;
  body: string;
  /** Case study where the practice can be checked. */
  href: string;
  projectTitle: string;
  note: string;
};

type StickyStepsProps = {
  headingId: string;
  chapter: string;
  scene: string;
  title: string;
  intro: string;
  steps: Step[];
};

const stepId = (index: number) => `principle-${index + 1}`;

/**
 * Sticky storytelling for the engineering approach.
 *
 * Desktop: the heading and an index of the steps stay anchored on the left
 * while the steps scroll past on the right. The index marks the step crossing
 * the middle of the viewport, and the rail beside the steps fills as the
 * reader advances — the straight path, with the current step branching off it.
 * Small screens get a plain sequence: no sticky column, no index, same rail.
 *
 * The index is a list of real links, so it also works as keyboard navigation.
 * Under reduced motion the rail is drawn full and stops moving; the active
 * marker still updates, without animation.
 */
export function StickySteps({ headingId, chapter, scene, title, intro, steps }: StickyStepsProps) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 55%", "end 55%"] });
  const fill = useTransform(scrollYProgress, (p) => (prefersReducedMotion ? 1 : p));
  // The dashed base crawls only while the reader scrolls — never on its own.
  const crawl = useTransform(scrollYProgress, (p) => (prefersReducedMotion ? "0px" : `${p * 240}px`));

  useEffect(() => {
    const items = Array.from(listRef.current?.children ?? []);
    if (items.length === 0) return;

    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = items.indexOf(entry.target);
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (visible.size > 0) setActive(Math.max(...visible));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-x-12 gap-y-14 lg:grid-cols-12">
      <div className="lg:sticky lg:top-[calc(var(--spacing-header)+3rem)] lg:col-span-5 lg:self-start">
        <p className="label flex items-center gap-3 text-fg-faint">
          <DivergenceMark variant="glyph" className="size-5 text-accent" />
          <span>
            {chapter} — {scene}
          </span>
        </p>
        <h2 id={headingId} className="mt-6 font-display text-title font-medium text-balance">
          <MaskedWords text={title} />
        </h2>
        <p className="mt-6 max-w-prose text-lead text-fg-muted">{intro}</p>

        <nav aria-label="Principles" className="mt-12 hidden lg:block">
          <ol className="border-t border-line">
            {steps.map((step, index) => {
              const isActive = index === active;
              return (
                <li key={step.title} className="border-b border-line">
                  <a
                    href={`#${stepId(index)}`}
                    aria-current={isActive ? "step" : undefined}
                    className="group flex min-h-12 items-center gap-4 py-2 text-fg-muted transition-colors duration-(--duration-hover) hover:text-fg aria-[current]:text-fg"
                  >
                    <span className="label w-6 shrink-0 text-fg-faint">{String(index + 1).padStart(2, "0")}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-px shrink-0 bg-accent transition-[width] duration-500 ease-entrance",
                        isActive ? "w-8" : "w-0 group-hover:w-3",
                      )}
                    />
                    <span>{step.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="relative lg:col-span-7">
        {/* The rail: a dashed straight path, filling in solid as the reader advances. */}
        <motion.span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-[0.6875rem] w-px bg-[repeating-linear-gradient(to_bottom,var(--line)_0_3px,transparent_3px_12px)]"
          style={{ backgroundPositionY: crawl }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-[0.6875rem] w-px origin-top bg-accent"
          style={{ scaleY: fill }}
        />

        <ol ref={listRef}>
          {steps.map((step, index) => {
            const isActive = index === active;
            return (
              <li
                key={step.title}
                id={stepId(index)}
                className="relative scroll-mt-[calc(var(--spacing-header)+2rem)] pl-12 sm:pl-16"
              >
                {/* Node on the rail; the active step branches off it. */}
                <span aria-hidden="true" className="absolute top-12 left-0 flex size-6 items-center justify-center md:top-16">
                  <span
                    className={cn(
                      "size-2.5 rounded-full border transition-[background-color,border-color,transform] duration-500 ease-entrance",
                      isActive ? "scale-125 border-accent bg-accent" : "border-line bg-ink",
                    )}
                  />
                  <svg
                    viewBox="0 0 24 24"
                    className={cn(
                      "absolute -top-4 left-3 size-6 overflow-visible text-accent transition-opacity duration-500",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <path d="M0 16C6 16 10 10 20 2" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                </span>

                <Reveal className="relative py-10 md:py-14">
                  {/* Depth: the step in focus sits on a raised panel. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-4 -right-4 -left-6 -z-10 bg-ink-raised transition-opacity duration-500 sm:-left-8",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <p
                    aria-hidden="true"
                    className={cn(
                      "font-display text-title transition-colors duration-500",
                      isActive ? "text-accent" : "text-fg-faint",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 font-display text-heading font-medium text-balance">{step.title}</h3>
                  <p className="mt-3 max-w-prose text-fg-muted">{step.body}</p>
                  <p className="mt-6 border-l border-line pl-5">
                    <span className="label block text-fg-faint">Seen in</span>
                    <Link
                      href={step.href}
                      className="link-draw mt-1 inline-flex min-h-11 items-center font-display text-lead hover:text-accent"
                    >
                      {step.projectTitle}
                    </Link>
                    <span className="block text-fg-muted">{step.note}</span>
                  </p>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
