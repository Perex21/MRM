import Link from "next/link";
import { RollText } from "@/components/motion/RollText";
import { cn } from "@/lib/cn";

type ActionLinkProps = {
  href: string;
  /** Plain text, so the label can roll character by character. */
  children: string;
  /** `seal` is the primary action; `line` is a quieter text action. */
  variant?: "seal" | "line";
  className?: string;
};

const base =
  "group relative inline-flex min-h-12 items-center gap-3 label transition-[background-color,border-color,color,transform] duration-(--duration-hover) ease-entrance active:duration-(--duration-press) motion-safe:active:scale-[0.97]";

const variants = {
  // The fill deepens on hover; the inset ring on focus keeps the cinnabar edge readable.
  seal: "bg-cinnabar px-6 text-parchment hover:bg-cinnabar-hover active:bg-cinnabar-deep focus-visible:outline-offset-4",
  line: "border-b border-line text-fg hover:border-current hover:text-accent",
} as const;

export const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

/** Marks a link that leaves the site, for sighted and screen-reader users alike. */
export function ExternalMark() {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-(--duration-hover) ease-entrance motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
      >
        ↗
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}

/**
 * Call-to-action link with the shared hover, focus and press responses:
 * the label rolls, the arrow travels, the control dips slightly when pressed.
 * External destinations open in a new tab and say so.
 */
export function ActionLink({ href, children, variant = "seal", className }: ActionLinkProps) {
  const classes = cn(base, variants[variant], className);
  const label = <RollText>{children}</RollText>;

  if (isExternal(href)) {
    const newTab = href.startsWith("http");
    return (
      <a href={href} className={classes} {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}>
        {label}
        {newTab && <ExternalMark />}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {label}
      <span
        aria-hidden="true"
        className="transition-transform duration-(--duration-hover) ease-entrance motion-safe:group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}
