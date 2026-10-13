import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  /** `seal` is the primary action; `line` is a quieter text action. */
  variant?: "seal" | "line";
  className?: string;
};

const base =
  "group inline-flex min-h-12 items-center gap-3 label transition-[background-color,border-color,color,transform] duration-(--duration-hover) ease-entrance active:duration-(--duration-press) motion-safe:active:translate-y-px";

const variants = {
  seal: "bg-cinnabar px-6 text-parchment hover:bg-cinnabar-hover",
  line: "border-b border-line text-fg hover:border-current hover:text-accent",
} as const;

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

/** Marks a link that leaves the site, for sighted and screen-reader users alike. */
export function ExternalMark() {
  return (
    <>
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}

/**
 * Call-to-action link with the shared hover, focus and press responses.
 * External destinations open in a new tab and say so.
 */
export function ActionLink({ href, children, variant = "seal", className }: ActionLinkProps) {
  const classes = cn(base, variants[variant], className);

  if (isExternal(href)) {
    const newTab = href.startsWith("http");
    return (
      <a href={href} className={classes} {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}>
        {children}
        {newTab && <ExternalMark />}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-(--duration-hover) ease-entrance motion-safe:group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}
