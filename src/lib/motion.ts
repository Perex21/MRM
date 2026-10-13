/**
 * Shared motion constants for Motion-driven components.
 * Mirrors the CSS values in src/styles/tokens.css — change both together.
 */

export const duration = {
  press: 0.12,
  hover: 0.2,
  reveal: 0.7,
  headline: 0.9,
} as const;

export const ease = {
  /** Decelerating settle — reveals and entrances. */
  settle: [0.16, 1, 0.3, 1],
  /** Symmetric ink stroke — drawn lines and panel transitions. */
  ink: [0.65, 0, 0.35, 1],
} as const;

/** Fade and upward settle, the default scroll reveal. */
export const reveal = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0 },
  transition: { duration: duration.reveal, ease: ease.settle },
} as const;

/** Mobile menu panel: short fade and settle from just above. */
export const menuPanel = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: duration.hover, ease: ease.settle },
} as const;
