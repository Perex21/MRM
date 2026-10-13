import type { ReactNode } from "react";
import { DivergenceMark } from "@/components/graphics/DivergenceMark";

type SectionHeadingProps = {
  /** Id for the heading, for aria-labelledby on the section. */
  id: string;
  /** Chapter number or other short index. */
  chapter: string;
  eyebrow: string;
  title: string;
  /** Heading level; sections on the home page are h2. */
  as?: "h2" | "h3";
  children?: ReactNode;
};

/** Chapter label, display title, and optional introduction for a page section. */
export function SectionHeading({ id, chapter, eyebrow, title, as: Heading = "h2", children }: SectionHeadingProps) {
  return (
    <header className="grid gap-x-12 gap-y-6 lg:grid-cols-12">
      <p className="label flex items-center gap-3 text-fg-faint lg:col-span-3 lg:pt-3">
        <DivergenceMark variant="glyph" className="size-5 text-accent" />
        <span>
          {chapter} — {eyebrow}
        </span>
      </p>
      <div className="lg:col-span-9">
        <Heading id={id} className="font-display text-title font-medium text-balance">
          {title}
        </Heading>
        {children && <div className="mt-6 max-w-prose text-lead text-fg-muted">{children}</div>}
      </div>
    </header>
  );
}
