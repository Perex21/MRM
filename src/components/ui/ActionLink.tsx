import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  /** `seal` is the single primary action; `line` is a quieter text action. */
  variant?: "seal" | "line";
  className?: string;
};

const base =
  "group inline-flex min-h-12 items-center gap-3 label transition-[background-color,color,transform] duration-(--duration-hover) ease-settle active:translate-y-px active:duration-(--duration-press)";

const variants = {
  seal: "bg-cinnabar px-6 text-parchment hover:bg-cinnabar-hover",
  line: "border-b border-line text-fg hover:border-current hover:text-accent",
} as const;

/** Call-to-action link with the shared hover, focus and press responses. */
export function ActionLink({ href, children, variant = "seal", className }: ActionLinkProps) {
  return (
    <a href={href} className={cn(base, variants[variant], className)}>
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-(--duration-hover) ease-settle group-hover:translate-x-1"
      >
        →
      </span>
    </a>
  );
}
