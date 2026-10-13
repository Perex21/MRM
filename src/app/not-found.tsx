import type { Metadata } from "next";
import { DivergenceMark } from "@/components/graphics/DivergenceMark";
import { Container } from "@/components/layout/Container";
import { ActionLink } from "@/components/ui/ActionLink";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <Container className="grid min-h-[70svh] content-center py-section">
      <p className="label flex items-center gap-3 text-accent">
        <DivergenceMark variant="glyph" className="size-5" />
        404 — Off the map
      </p>
      <h1 className="mt-6 max-w-[12ch] font-display text-display font-medium">This path leads nowhere.</h1>
      <p className="mt-8 max-w-prose text-lead text-fg-muted">
        The page you asked for does not exist, or has moved. The work and the way back are below.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
        <ActionLink href="/">Return to the start</ActionLink>
        <ActionLink href="/#work" variant="line">
          Selected work
        </ActionLink>
      </div>
    </Container>
  );
}
