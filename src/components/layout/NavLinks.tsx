"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RollText } from "@/components/motion/RollText";

export type NavLink = { id: string; href: string; label: string; chapter: string };

/**
 * Desktop navigation with a scroll-spy: the link for the section currently
 * in the middle of the viewport is marked `aria-current`. On pages without
 * those sections (case studies, 404) nothing is marked.
 */
export function NavLinks({ links }: { links: NavLink[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = links
      .map((link) => document.getElementById(link.id))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // With several sections in the band, the last one in page order wins.
        const current = links.findLast((link) => visible.has(link.id));
        setActive(current?.id ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [links]);

  return (
    <ul className="flex items-center gap-2">
      {links.map((link) => (
        <li key={link.id}>
          <Link
            href={link.href}
            aria-current={active === link.id ? "location" : undefined}
            className="group label inline-flex min-h-12 items-center px-3 text-fg-muted decoration-accent underline-offset-8 transition-colors duration-(--duration-hover) hover:text-fg aria-[current]:text-fg aria-[current]:underline"
          >
            <RollText>{link.label}</RollText>
          </Link>
        </li>
      ))}
    </ul>
  );
}
