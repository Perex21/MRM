"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { menuPanel } from "@/lib/motion";

type NavLink = { href: string; label: string; chapter: string };

/**
 * Disclosure menu for viewports below `lg`. Closes on Escape and on navigation.
 * Under reduced motion the panel is a plain element: it mounts and unmounts
 * immediately, with no fade, translation or exit animation.
 */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const panelProps = {
    id: panelId,
    "aria-label": "Sections",
    className: "surface-ink absolute inset-x-0 top-full border-b border-line",
  };

  const list = (
    <ul className="mx-auto max-w-page px-gutter py-4">
      {links.map((link) => (
        <li key={link.href} className="border-t border-line first:border-t-0">
          <a
            href={link.href}
            onClick={() => setOpen(false)}
            className="flex min-h-14 items-baseline gap-4 py-4 font-display text-heading"
          >
            <span className="label text-fg-faint">{link.chapter}</span>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="label -mr-3 inline-flex min-h-12 items-center gap-3 pr-3 pl-1"
      >
        {open ? "Close" : "Menu"}
        <span aria-hidden="true" className="relative block h-2.5 w-5">
          <span
            className={`absolute inset-x-0 top-0 h-px bg-current transition-transform duration-(--duration-hover) ease-settle ${open ? "translate-y-[5px] rotate-45" : ""}`}
          />
          <span
            className={`absolute inset-x-0 bottom-0 h-px bg-current transition-transform duration-(--duration-hover) ease-settle ${open ? "-translate-y-[4px] -rotate-45" : ""}`}
          />
        </span>
      </button>

      {prefersReducedMotion ? (
        open && <nav {...panelProps}>{list}</nav>
      ) : (
        <AnimatePresence>
          {open && (
            <motion.nav {...panelProps} {...menuPanel}>
              {list}
            </motion.nav>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
