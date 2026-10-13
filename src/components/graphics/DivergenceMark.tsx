import { cn } from "@/lib/cn";

type DivergenceMarkProps = {
  className?: string;
  /** `seal` is the cinnabar brand stamp; `glyph` is the bare line motif in currentColor. */
  variant?: "seal" | "glyph";
};

/**
 * The Divergence: a straight line and one stroke that leaves it.
 * The recurring motif of the site, here at its smallest size. Decorative.
 */
export function DivergenceMark({ className, variant = "seal" }: DivergenceMarkProps) {
  const stroke = variant === "seal" ? "var(--color-parchment)" : "currentColor";

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {variant === "seal" && <rect width="32" height="32" rx="2" fill="var(--color-cinnabar)" />}
      <g fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round">
        <path d="M12 6v20" />
        <path d="M12 21c0-7 4-11 10-14" />
      </g>
    </svg>
  );
}
