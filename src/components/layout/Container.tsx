import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Page-width boundary with the responsive gutter. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-page px-gutter", className)}>{children}</div>;
}
