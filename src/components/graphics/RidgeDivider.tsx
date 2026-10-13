import { cn } from "@/lib/cn";

const fills = {
  ink: "var(--color-ink)",
  paper: "var(--color-parchment)",
} as const;

// Two silhouettes so consecutive hand-offs do not repeat the same line.
const shapes = [
  "M0 81V52c180-30 330 22 520-6s300-52 520-18 250 40 400 2v51z",
  "M0 81V30c140 34 300 40 470 12s330-44 520-14 300 44 450 20v33z",
] as const;

type RidgeDividerProps = {
  /** Surface of the section that follows. */
  to: keyof typeof fills;
  shape?: 0 | 1;
  className?: string;
};

/**
 * Section hand-off: the next surface rises as a ridgeline at the foot of the
 * current one. Place it as the last child of a section. Decorative.
 */
export function RidgeDivider({ to, shape = 0, className }: RidgeDividerProps) {
  return (
    <svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn("-mb-px block h-[clamp(2.5rem,6vw,5rem)] w-full", className)}
      // A solid strip along the bottom edge, so sub-pixel rounding of the
      // scaled path can never let the surface behind show as a hairline.
      style={{ backgroundImage: `linear-gradient(to top, ${fills[to]} 2px, transparent 2px)` }}
    >
      <path d={shapes[shape]} fill={fills[to]} />
    </svg>
  );
}
