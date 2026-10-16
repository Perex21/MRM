/**
 * Shared motion constants for Motion-driven components.
 * Mirrors the CSS values in src/styles/tokens.css — change both together.
 */

export const duration = {
  press: 0.12,
  hover: 0.2,
  reveal: 0.65,
  headline: 0.9,
} as const;

export const ease = {
  /** Standard entrances and UI feedback. */
  entrance: [0.22, 1, 0.36, 1],
  /** Large reveals: headlines and artwork. */
  settle: [0.16, 1, 0.3, 1],
  /** Symmetric ink stroke: drawn lines. */
  ink: [0.65, 0, 0.35, 1],
} as const;

/** Scroll reveals. `rise` suits text blocks; `unveil` suits artwork. */
export const reveal = {
  rise: {
    hidden: { opacity: 0, y: 16 },
    shown: { opacity: 1, y: 0 },
    transition: { duration: duration.reveal, ease: ease.entrance },
  },
  unveil: {
    hidden: { clipPath: "inset(0% 0% 100% 0%)" },
    shown: { clipPath: "inset(0% 0% 0% 0%)" },
    transition: { duration: duration.headline, ease: ease.settle },
  },
} as const;

export type RevealVariant = keyof typeof reveal;

/** Spring for pointer-driven depth: quick to follow, no overshoot. */
export const depthSpring = { stiffness: 180, damping: 22, mass: 0.6 } as const;

/** Spring for magnetic controls: a firm pull that settles without wobble. */
export const magnetSpring = { stiffness: 220, damping: 18, mass: 0.5 } as const;

/** Seconds between siblings in staggered reveals. */
export const stagger = {
  /** Words in a masked headline. */
  words: 0.07,
} as const;

