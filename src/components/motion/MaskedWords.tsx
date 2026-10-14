"use client";

import { motion } from "motion/react";
import { duration, ease, stagger } from "@/lib/motion";
import { useRevealPhase } from "./Reveal";

/**
 * Display headline whose words rise out of individual masks, left to right,
 * when it first scrolls into view. Words stay real text with real spaces, so
 * the heading reads normally to assistive technology and copies cleanly.
 * Visible without JavaScript and static under reduced motion.
 */
export function MaskedWords({ text }: { text: string }) {
  const [ref, phase] = useRevealPhase<HTMLSpanElement>();
  const words = text.split(" ");

  return (
    <span ref={ref}>
      {words.map((word, index) => (
        <span key={index}>
          {/* Padding gives descenders room inside the mask; the negative margin keeps line height. */}
          <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
            <motion.span
              className="inline-block"
              initial={false}
              animate={phase === "hidden" ? { y: "110%" } : { y: "0%" }}
              transition={
                phase === "shown"
                  ? { duration: duration.headline, ease: ease.settle, delay: index * stagger.words }
                  : { duration: 0 }
              }
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}
